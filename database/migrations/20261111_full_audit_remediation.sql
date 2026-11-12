-- =============================================================================
-- TwinGenie Full Audit Remediation Migration (2026-11-11)
-- Idempotent migration covering privacy, billing, quota atomicity, consent,
-- durable growth slots, click attribution, and safe conversation vector search.
-- =============================================================================

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- 1. Voice Storage Privacy (F02)
-- Make voice-responses private and restrict direct object access to own folder
-- (${auth.uid()}/...). Backend uses supabaseAdmin + 1-hour createSignedUrl.
-- -----------------------------------------------------------------------------
UPDATE storage.buckets
SET public = false
WHERE id = 'voice-responses';

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "voice_responses_public_read" ON storage.objects;
DROP POLICY IF EXISTS "voice_responses_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "voice_responses_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "voice_responses_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "voice_responses_owner_delete" ON storage.objects;

CREATE POLICY "voice_responses_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'voice-responses'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "voice_responses_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'voice-responses'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "voice_responses_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'voice-responses'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'voice-responses'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "voice_responses_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'voice-responses'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- 2. Google Play Subscription Constraints & Purchase Token Uniqueness (F06-F08)
-- -----------------------------------------------------------------------------
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS google_play_product_id TEXT,
    ADD COLUMN IF NOT EXISTS google_play_purchase_token TEXT,
    ADD COLUMN IF NOT EXISTS google_play_order_id TEXT,
    ADD COLUMN IF NOT EXISTS google_play_linked_purchase_token TEXT,
    ADD COLUMN IF NOT EXISTS google_play_raw_response JSONB;

-- Remove duplicate user subscription rows (if any) before enforcing unique user_id
WITH ranked_subs AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id
               ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM public.subscriptions
)
DELETE FROM public.subscriptions
WHERE id IN (SELECT id FROM ranked_subs WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_unique
    ON public.subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_google_play_order_id
    ON public.subscriptions (google_play_order_id);

-- Prevent one Play purchase token from being claimed by multiple user accounts
DROP INDEX IF EXISTS idx_subscriptions_google_play_token;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_google_play_token
    ON public.subscriptions (google_play_purchase_token)
    WHERE google_play_purchase_token IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Twin Match Consent Invitations & RLS (F04)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.twin_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL,
    user2_id UUID NOT NULL,
    compatibility_score INTEGER NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    traits_comparison JSONB,
    insights TEXT[],
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS public.twin_match_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.twin_matches(id) ON DELETE CASCADE,
    platform TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.twin_match_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(requester_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_twin_matches_user1 ON public.twin_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_twin_matches_user2 ON public.twin_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_twin_match_shares_match_id ON public.twin_match_shares(match_id);
CREATE INDEX IF NOT EXISTS idx_twin_match_invites_recipient ON public.twin_match_invitations(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_twin_match_invites_requester ON public.twin_match_invitations(requester_id, status);

ALTER TABLE public.twin_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_match_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_match_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "twin_matches_participants" ON public.twin_matches;
CREATE POLICY "twin_matches_participants"
ON public.twin_matches FOR ALL TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id)
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "twin_match_invitations_participants" ON public.twin_match_invitations;
CREATE POLICY "twin_match_invitations_participants"
ON public.twin_match_invitations FOR ALL TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- -----------------------------------------------------------------------------
-- 4. Durable Atomic Daily Quotas on usage_tracking (F13)
-- Merge duplicates for daily quota actions first, add a partial unique index
-- (leaving growth ledger action_type rows untouched), and install atomic RPC.
-- -----------------------------------------------------------------------------
WITH quota_aggregates AS (
    SELECT
        user_id,
        action_type,
        period_start,
        SUM(COALESCE(count, 1))::INT AS total_count,
        MAX(period_end) AS max_period_end,
        MIN(created_at) AS first_created_at
    FROM public.usage_tracking
    WHERE action_type IN ('message_sent', 'voice_message')
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
    WHERE ut.action_type IN ('message_sent', 'voice_message')
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_daily_quota_unique
    ON public.usage_tracking (user_id, action_type, period_start)
    WHERE action_type IN ('message_sent', 'voice_message');

CREATE OR REPLACE FUNCTION public.reserve_daily_quota(
    p_user_id UUID,
    p_action_type TEXT,
    p_daily_limit INT,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.usage_tracking%ROWTYPE;
    v_next INT;
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtext(p_user_id::text || ':' || p_action_type || ':' || p_period_start::text)
    );

    SELECT *
    INTO v_row
    FROM public.usage_tracking
    WHERE user_id = p_user_id
      AND action_type = p_action_type
      AND period_start = p_period_start
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        IF COALESCE(v_row.count, 0) >= p_daily_limit THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'current', COALESCE(v_row.count, 0),
                'limit', p_daily_limit
            );
        END IF;

        v_next := COALESCE(v_row.count, 0) + 1;
        UPDATE public.usage_tracking
        SET count = v_next,
            period_end = p_period_end
        WHERE id = v_row.id;
    ELSE
        IF p_daily_limit <= 0 THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'current', 0,
                'limit', p_daily_limit
            );
        END IF;

        v_next := 1;
        INSERT INTO public.usage_tracking (
            user_id,
            action_type,
            count,
            period_start,
            period_end
        )
        VALUES (
            p_user_id,
            p_action_type,
            v_next,
            p_period_start,
            p_period_end
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'current', v_next,
        'limit', p_daily_limit
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_daily_quota(UUID, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_daily_quota(UUID, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- -----------------------------------------------------------------------------
-- 5. Growth Publication Slots Table (F21)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.growth_publication_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slot_key TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,
    slot_date DATE NOT NULL,
    slot_index INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    locked_until TIMESTAMPTZ,
    worker_id TEXT,
    post_id TEXT,
    post_url TEXT,
    error_message TEXT,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_platform_slot UNIQUE (platform, slot_date, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_growth_slots_platform_date ON public.growth_publication_slots(platform, slot_date);
CREATE INDEX IF NOT EXISTS idx_growth_slots_status ON public.growth_publication_slots(status);
CREATE INDEX IF NOT EXISTS idx_growth_slots_lease ON public.growth_publication_slots(locked_until);

ALTER TABLE public.growth_publication_slots ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6. Persistent Acquisition Click Events (F23)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.acquisition_click_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    click_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    medium TEXT DEFAULT 'direct',
    campaign TEXT DEFAULT 'organic',
    content TEXT,
    device TEXT NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acq_clicks_created_at ON public.acquisition_click_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acq_clicks_platform ON public.acquisition_click_events(platform);
CREATE INDEX IF NOT EXISTS idx_acq_clicks_campaign ON public.acquisition_click_events(campaign);

ALTER TABLE public.acquisition_click_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 7. Safe Message Embeddings & Conversation Search RPC
-- Fixes legacy conversation_memory_schema.sql FK to nonexistent messages table.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    conversation_id UUID,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_embeddings_user_id ON public.message_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_conversation_id ON public.message_embeddings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_created_at ON public.message_embeddings(created_at DESC);

ALTER TABLE public.message_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_embeddings_own_rows" ON public.message_embeddings;
CREATE POLICY "message_embeddings_own_rows"
ON public.message_embeddings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.search_conversations(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.70,
    match_count int DEFAULT 5,
    p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    message_id uuid,
    conversation_id uuid,
    content text,
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
        (1 - (me.embedding <=> query_embedding))::float AS similarity,
        me.created_at
    FROM public.message_embeddings me
    WHERE (
        (p_user_id IS NOT NULL AND me.user_id = p_user_id)
        OR (p_user_id IS NULL AND me.user_id = auth.uid())
    )
      AND me.embedding IS NOT NULL
      AND (1 - (me.embedding <=> query_embedding)) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
$$;
