-- =============================================================================
-- TwinGenie Enterprise Remediation Migration (2026-11-26)
-- Idempotent migration reconciling live Supabase schema with backend services:
--   1. Deduplicate twin_matches pairs, add is_shared column & unique pair index
--   2. usage_tracking daily quota unique index including 'chat_message'
--   3. emotional_history table + RLS + update_emotional_metrics RPC (full recovery parity)
--   4. message_embeddings nullable vector provenance + filtered search_conversations RPC
--   5. memory_vectors legacy_embedding preservation column
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Twin Matches Schema Alignment & Pair Deduplication
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.twin_matches
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

WITH ranked_matches AS (
    SELECT
        id,
        user1_id,
        user2_id,
        FIRST_VALUE(id) OVER (
            PARTITION BY user1_id, user2_id
            ORDER BY created_at DESC NULLS LAST, id DESC
        ) AS keeper_id,
        ROW_NUMBER() OVER (
            PARTITION BY user1_id, user2_id
            ORDER BY created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.twin_matches
),
repointed_shares AS (
    UPDATE public.twin_match_shares s
    SET match_id = rm.keeper_id
    FROM ranked_matches rm
    WHERE s.match_id = rm.id
      AND rm.rn > 1
)
DELETE FROM public.twin_matches
WHERE id IN (SELECT id FROM ranked_matches WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_twin_matches_pair_unique
    ON public.twin_matches (user1_id, user2_id);

-- -----------------------------------------------------------------------------
-- 2. Daily Quota Unique Index Alignment (include active 'chat_message' action)
-- -----------------------------------------------------------------------------
WITH quota_aggregates AS (
    SELECT
        user_id,
        action_type,
        period_start,
        SUM(COALESCE(count, 1))::INT AS total_count,
        MAX(period_end) AS max_period_end
    FROM public.usage_tracking
    WHERE action_type IN ('chat_message', 'message_sent', 'voice_message')
    GROUP BY user_id, action_type, period_start
    HAVING COUNT(*) > 1
),
ranked_quota AS (
    SELECT
        ut.id,
        ut.user_id,
        ut.action_type,
        ut.period_start,
        ROW_NUMBER() OVER (
            PARTITION BY ut.user_id, ut.action_type, ut.period_start
            ORDER BY ut.created_at ASC, ut.id ASC
        ) AS rn
    FROM public.usage_tracking ut
    WHERE ut.action_type IN ('chat_message', 'message_sent', 'voice_message')
),
updated_keeper AS (
    UPDATE public.usage_tracking ut
    SET count = qa.total_count,
        period_end = COALESCE(qa.max_period_end, ut.period_end)
    FROM quota_aggregates qa
    JOIN ranked_quota rq
      ON rq.user_id = qa.user_id
     AND rq.action_type = qa.action_type
     AND rq.period_start = qa.period_start
     AND rq.rn = 1
    WHERE ut.id = rq.id
)
DELETE FROM public.usage_tracking
WHERE id IN (SELECT id FROM ranked_quota WHERE rn > 1);

DROP INDEX IF EXISTS idx_usage_tracking_daily_quota_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_daily_quota_unique
    ON public.usage_tracking (user_id, action_type, period_start)
    WHERE action_type IN ('chat_message', 'message_sent', 'voice_message');

-- -----------------------------------------------------------------------------
-- 3. Emotional History Table & update_emotional_metrics RPC (Full Parity)
-- Matches emotionalStateEngine.js determineEmotionalState() forward + recovery rules.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emotional_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trust_level INTEGER DEFAULT 0,
    openness_level INTEGER DEFAULT 0,
    dependency_score INTEGER DEFAULT 0,
    vulnerability_level INTEGER DEFAULT 0,
    engagement_frequency INTEGER DEFAULT 0,
    goal_progress INTEGER DEFAULT 0,
    emotional_valence INTEGER DEFAULT 50,
    relationship_depth INTEGER DEFAULT 0,
    emotional_state TEXT DEFAULT 'new_user',
    weighted_score NUMERIC(6,2) DEFAULT 0.00,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_emotional_history_user_date
    ON public.emotional_history (user_id, snapshot_date DESC);

ALTER TABLE public.emotional_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emotional_history_own_rows" ON public.emotional_history;
CREATE POLICY "emotional_history_own_rows"
ON public.emotional_history FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_emotional_metrics(
    p_user_id UUID,
    p_metric_changes JSONB DEFAULT '{}'::jsonb
)
RETURNS public.emotional_metrics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.emotional_metrics%ROWTYPE;
    v_weighted NUMERIC(6,2);
    v_prev_state TEXT;
    v_state TEXT;
BEGIN
    INSERT INTO public.emotional_metrics (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.emotional_metrics
    SET
        trust_level = GREATEST(0, LEAST(100, COALESCE(trust_level, 0) + COALESCE((p_metric_changes->>'trust_level')::INT, 0))),
        openness_level = GREATEST(0, LEAST(100, COALESCE(openness_level, 0) + COALESCE((p_metric_changes->>'openness_level')::INT, 0))),
        dependency_score = GREATEST(0, LEAST(100, COALESCE(dependency_score, 0) + COALESCE((p_metric_changes->>'dependency_score')::INT, 0))),
        vulnerability_level = GREATEST(0, LEAST(100, COALESCE(vulnerability_level, 0) + COALESCE((p_metric_changes->>'vulnerability_level')::INT, 0))),
        engagement_frequency = GREATEST(0, LEAST(100, COALESCE(engagement_frequency, 0) + COALESCE((p_metric_changes->>'engagement_frequency')::INT, 0))),
        goal_progress = GREATEST(0, LEAST(100, COALESCE(goal_progress, 0) + COALESCE((p_metric_changes->>'goal_progress')::INT, 0))),
        emotional_valence = GREATEST(0, LEAST(100, COALESCE(emotional_valence, 50) + COALESCE((p_metric_changes->>'emotional_valence')::INT, 0))),
        relationship_depth = GREATEST(0, LEAST(100, COALESCE(relationship_depth, 0) + COALESCE((p_metric_changes->>'relationship_depth')::INT, 0))),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;

    v_weighted := ROUND((
        COALESCE(v_row.trust_level, 0) * 0.20 +
        COALESCE(v_row.openness_level, 0) * 0.15 +
        COALESCE(v_row.dependency_score, 0) * 0.25 +
        COALESCE(v_row.vulnerability_level, 0) * 0.15 +
        COALESCE(v_row.engagement_frequency, 0) * 0.10 +
        COALESCE(v_row.goal_progress, 0) * 0.10 +
        COALESCE(v_row.emotional_valence, 50) * 0.05
    )::numeric, 2);

    v_prev_state := COALESCE(v_row.emotional_state, 'new_user');

    -- Exact parity with determineEmotionalState() forward + recovery transitions
    IF COALESCE(v_row.engagement_frequency, 0) < 10 THEN
        v_state := 'detaching';
    ELSIF v_prev_state = 'detaching' THEN
        IF COALESCE(v_row.trust_level, 0) >= 15 AND COALESCE(v_row.engagement_frequency, 0) >= 20 THEN
            v_state := 'bonding';
        ELSE
            v_state := 'detaching';
        END IF;
    ELSIF v_prev_state = 'attached' AND COALESCE(v_row.vulnerability_level, 0) >= 50 THEN
        v_state := 'emotionally_dependent';
    ELSIF v_prev_state = 'emotionally_dependent' THEN
        IF COALESCE(v_row.vulnerability_level, 0) < 25 THEN
            v_state := 'attached';
        ELSE
            v_state := 'emotionally_dependent';
        END IF;
    ELSIF v_prev_state = 'bonding' AND COALESCE(v_row.dependency_score, 0) >= 40 THEN
        v_state := 'attached';
    ELSIF v_prev_state = 'attached' THEN
        IF COALESCE(v_row.dependency_score, 0) < 20 THEN
            v_state := 'bonding';
        ELSE
            v_state := 'attached';
        END IF;
    ELSIF v_prev_state = 'new_user' AND COALESCE(v_row.trust_level, 0) >= 20 THEN
        v_state := 'bonding';
    ELSIF v_prev_state = 'bonding' THEN
        IF COALESCE(v_row.trust_level, 0) < 5 THEN
            v_state := 'new_user';
        ELSE
            v_state := 'bonding';
        END IF;
    ELSE
        v_state := 'new_user';
    END IF;

    UPDATE public.emotional_metrics
    SET weighted_score = v_weighted,
        emotional_state = v_state,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_emotional_metrics(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_emotional_metrics(UUID, JSONB) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Model-Aware Chat Embeddings & Pre-Ranking Search Filtering
-- Columns remain NULL when unknown so non-Gemini embeddings are never mislabeled.
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.message_embeddings
    ADD COLUMN IF NOT EXISTS embedding_provider TEXT,
    ADD COLUMN IF NOT EXISTS embedding_model TEXT,
    ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER;

CREATE INDEX IF NOT EXISTS idx_message_embeddings_user_provider_model
    ON public.message_embeddings (user_id, embedding_provider, embedding_model);

DROP FUNCTION IF EXISTS public.search_conversations(vector(1536), double precision, integer, uuid);
DROP FUNCTION IF EXISTS public.search_conversations(vector, float, int, uuid);

CREATE OR REPLACE FUNCTION public.search_conversations(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.70,
    match_count int DEFAULT 5,
    p_user_id uuid DEFAULT NULL,
    p_embedding_provider text DEFAULT NULL,
    p_embedding_model text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    message_id uuid,
    conversation_id uuid,
    content text,
    embedding_provider text,
    embedding_model text,
    similarity float,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        me.id,
        me.message_id,
        me.conversation_id,
        me.content,
        me.embedding_provider,
        me.embedding_model,
        (1 - (me.embedding <=> query_embedding))::float AS similarity,
        me.created_at
    FROM public.message_embeddings me
    WHERE (
        (p_user_id IS NOT NULL AND me.user_id = p_user_id)
        OR (p_user_id IS NULL AND me.user_id = auth.uid())
    )
      AND me.embedding IS NOT NULL
      AND (p_embedding_provider IS NULL OR me.embedding_provider = p_embedding_provider)
      AND (p_embedding_model IS NULL OR me.embedding_model = p_embedding_model)
      AND (1 - (me.embedding <=> query_embedding)) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- -----------------------------------------------------------------------------
-- 5. Preserve Legacy Vectors During Backfill Transition on memory_vectors
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.memory_vectors
    ADD COLUMN IF NOT EXISTS legacy_embedding vector(1536);
