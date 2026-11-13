-- =============================================================================
-- Migration: Hardening Twin Match RLS policies against unauthorized consent bypass (Q04)
-- NOTE: Strictly touches ONLY twin_match_invitations and twin_matches.
-- Does NOT touch public.users, auth.users, personality_answers, personality_profiles,
-- chat_history, or subscriptions.
-- =============================================================================

-- 1. twin_match_invitations
ALTER TABLE IF EXISTS public.twin_match_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "twin_match_invitations_participants" ON public.twin_match_invitations;
DROP POLICY IF EXISTS "twin_match_invitations_select" ON public.twin_match_invitations;
DROP POLICY IF EXISTS "twin_match_invitations_insert" ON public.twin_match_invitations;
DROP POLICY IF EXISTS "twin_match_invitations_update" ON public.twin_match_invitations;

-- Authenticated users can view invitations they sent or received
CREATE POLICY "twin_match_invitations_select"
ON public.twin_match_invitations FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Authenticated users can create invitations only as requester with status 'pending'
CREATE POLICY "twin_match_invitations_insert"
ON public.twin_match_invitations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- Only the recipient can accept or decline; requester can revoke
CREATE POLICY "twin_match_invitations_update"
ON public.twin_match_invitations FOR UPDATE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = recipient_id)
WITH CHECK (
    (auth.uid() = recipient_id AND status IN ('accepted', 'declined'))
    OR
    (auth.uid() = requester_id AND status = 'revoked')
);

-- 2. twin_matches
-- Direct client writes are prevented. Matches can only be created by backend service_role.
ALTER TABLE IF EXISTS public.twin_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "twin_matches_participants" ON public.twin_matches;
DROP POLICY IF EXISTS "twin_matches_select" ON public.twin_matches;

CREATE POLICY "twin_matches_select"
ON public.twin_matches FOR SELECT TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);
