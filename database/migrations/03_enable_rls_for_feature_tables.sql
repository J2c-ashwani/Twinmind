-- Enterprise RLS hardening for feature tables.
-- Safe to run more than once. Service-role backend access is unaffected.

-- Public/read-only catalog tables
ALTER TABLE IF EXISTS personality_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS life_coach_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS program_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personality_questions_read ON personality_questions;
CREATE POLICY personality_questions_read ON personality_questions
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS life_coach_programs_read ON life_coach_programs;
CREATE POLICY life_coach_programs_read ON life_coach_programs
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS program_days_read ON program_days;
CREATE POLICY program_days_read ON program_days
    FOR SELECT TO authenticated
    USING (true);

-- User-owned one-column ownership tables
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS motivation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS streak_freeze_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_program_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_own_rows ON notifications;
CREATE POLICY notifications_own_rows ON notifications
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_insights_own_rows ON daily_insights;
CREATE POLICY daily_insights_own_rows ON daily_insights
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS conversations_own_rows ON conversations;
CREATE POLICY conversations_own_rows ON conversations
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS motivation_cards_own_rows ON motivation_cards;
CREATE POLICY motivation_cards_own_rows ON motivation_cards
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS referral_codes_own_rows ON referral_codes;
CREATE POLICY referral_codes_own_rows ON referral_codes
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS streak_freeze_purchases_own_rows ON streak_freeze_purchases;
CREATE POLICY streak_freeze_purchases_own_rows ON streak_freeze_purchases
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_device_tokens_own_rows ON push_device_tokens;
CREATE POLICY push_device_tokens_own_rows ON push_device_tokens
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_program_progress_own_rows ON user_program_progress;
CREATE POLICY user_program_progress_own_rows ON user_program_progress
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tables whose ownership is derived through another table
ALTER TABLE IF EXISTS user_daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS motivation_card_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS twin_match_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_daily_completions_own_rows ON user_daily_completions;
CREATE POLICY user_daily_completions_own_rows ON user_daily_completions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_program_progress upp
            WHERE upp.id = user_daily_completions.progress_id
              AND upp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_program_progress upp
            WHERE upp.id = user_daily_completions.progress_id
              AND upp.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS motivation_card_shares_own_rows ON motivation_card_shares;
CREATE POLICY motivation_card_shares_own_rows ON motivation_card_shares
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM motivation_cards mc
            WHERE mc.id = motivation_card_shares.card_id
              AND mc.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM motivation_cards mc
            WHERE mc.id = motivation_card_shares.card_id
              AND mc.user_id = auth.uid()
        )
    );

-- Referral attribution: each side can see their own referral event.
ALTER TABLE IF EXISTS referral_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_events_own_rows ON referral_events;
CREATE POLICY referral_events_own_rows ON referral_events
    FOR SELECT TO authenticated
    USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- Twin match: both matched users can access the match and related share events.
ALTER TABLE IF EXISTS twin_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS twin_matches_participant_rows ON twin_matches;
CREATE POLICY twin_matches_participant_rows ON twin_matches
    FOR ALL TO authenticated
    USING (auth.uid() = user1_id OR auth.uid() = user2_id)
    WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS twin_match_shares_participant_rows ON twin_match_shares;
CREATE POLICY twin_match_shares_participant_rows ON twin_match_shares
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM twin_matches tm
            WHERE tm.id = twin_match_shares.match_id
              AND (tm.user1_id = auth.uid() OR tm.user2_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM twin_matches tm
            WHERE tm.id = twin_match_shares.match_id
              AND (tm.user1_id = auth.uid() OR tm.user2_id = auth.uid())
        )
    );

-- Growth circles: visible to creators and active members.
ALTER TABLE IF EXISTS growth_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS growth_circles_member_rows ON growth_circles;
CREATE POLICY growth_circles_member_rows ON growth_circles
    FOR SELECT TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM circle_members cm
            WHERE cm.circle_id = growth_circles.id
              AND cm.user_id = auth.uid()
              AND cm.is_active = true
        )
    );

DROP POLICY IF EXISTS growth_circles_creator_insert ON growth_circles;
CREATE POLICY growth_circles_creator_insert ON growth_circles
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS growth_circles_creator_update ON growth_circles;
CREATE POLICY growth_circles_creator_update ON growth_circles
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS circle_members_member_rows ON circle_members;
CREATE POLICY circle_members_member_rows ON circle_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS circle_members_own_insert ON circle_members;
CREATE POLICY circle_members_own_insert ON circle_members
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS circle_members_own_update ON circle_members;
CREATE POLICY circle_members_own_update ON circle_members
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS circle_invitations_member_rows ON circle_invitations;
CREATE POLICY circle_invitations_member_rows ON circle_invitations
    FOR SELECT TO authenticated
    USING (
        invited_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM circle_members cm
            WHERE cm.circle_id = circle_invitations.circle_id
              AND cm.user_id = auth.uid()
              AND cm.is_active = true
        )
    );

DROP POLICY IF EXISTS circle_invitations_creator_insert ON circle_invitations;
CREATE POLICY circle_invitations_creator_insert ON circle_invitations
    FOR INSERT TO authenticated
    WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS circle_milestones_member_rows ON circle_milestones;
CREATE POLICY circle_milestones_member_rows ON circle_milestones
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM circle_members cm
            WHERE cm.circle_id = circle_milestones.circle_id
              AND cm.user_id = auth.uid()
              AND cm.is_active = true
        )
    );

DROP POLICY IF EXISTS circle_activity_member_rows ON circle_activity;
CREATE POLICY circle_activity_member_rows ON circle_activity
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM circle_members cm
            WHERE cm.circle_id = circle_activity.circle_id
              AND cm.user_id = auth.uid()
              AND cm.is_active = true
        )
    );

DROP POLICY IF EXISTS circle_activity_own_insert ON circle_activity;
CREATE POLICY circle_activity_own_insert ON circle_activity
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM circle_members cm
            WHERE cm.circle_id = circle_activity.circle_id
              AND cm.user_id = auth.uid()
              AND cm.is_active = true
        )
    );
