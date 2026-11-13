-- =============================================================================
-- Migration: Hardening Twin Match RLS policies against unauthorized consent bypass (Q04)
-- NOTE: Strictly touches ONLY twin_match_invitations, twin_matches, and twin_match_shares.
-- Does NOT touch public.users, auth.users, personality_answers, personality_profiles,
-- chat_history, or subscriptions.
-- =============================================================================

-- 1. Drop ALL legacy and permissive policies across all 3 tables
DROP POLICY IF EXISTS "twin_match_invitations_participants" ON public.twin_match_invitations;
DROP POLICY IF EXISTS "twin_match_invitations_select" ON public.twin_match_invitations;
DROP POLICY IF EXISTS "twin_match_invitations_insert" ON public.twin_match_invitations;
DROP POLICY IF EXISTS "twin_match_invitations_update" ON public.twin_match_invitations;

DROP POLICY IF EXISTS "twin_matches_participants" ON public.twin_matches;
DROP POLICY IF EXISTS "twin_matches_participant_rows" ON public.twin_matches;
DROP POLICY IF EXISTS "twin_matches_select" ON public.twin_matches;

DROP POLICY IF EXISTS "twin_match_shares_participants" ON public.twin_match_shares;
DROP POLICY IF EXISTS "twin_match_shares_participant_rows" ON public.twin_match_shares;
DROP POLICY IF EXISTS "twin_match_shares_select" ON public.twin_match_shares;

-- 2. Ensure RLS is enabled on all 3 tables
ALTER TABLE IF EXISTS public.twin_match_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.twin_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.twin_match_shares ENABLE ROW LEVEL SECURITY;

-- 3. Read-only policies: Authenticated participants can view their own rows
CREATE POLICY "twin_match_invitations_select"
ON public.twin_match_invitations FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "twin_matches_select"
ON public.twin_matches FOR SELECT TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "twin_match_shares_select"
ON public.twin_match_shares FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.twin_matches tm
    WHERE tm.id = twin_match_shares.match_id
      AND (tm.user1_id = auth.uid() OR tm.user2_id = auth.uid())
));

-- 4. Revoke direct client writes (INSERT, UPDATE, DELETE).
-- All invitations, responses, match creation, and sharing MUST go through the backend
-- Express server via service_role (supabaseAdmin). This makes recipient acceptance and
-- participant identities immutable and completely protected against client-side tampering.
REVOKE INSERT, UPDATE, DELETE ON public.twin_match_invitations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.twin_matches FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.twin_match_shares FROM anon, authenticated;

