-- Enterprise RLS policy repair.
-- Run this after enabling RLS globally. It is safe to run more than once.
-- Goal: no RLS-enabled app table should be left without an explicit policy.

CREATE OR REPLACE FUNCTION pg_temp.recreate_policy(
    table_name text,
    policy_name text,
    create_sql text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
        EXECUTE create_sql;
    END IF;
END;
$$;

-- Core user profile and onboarding tables.
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personality_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personality_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memory_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usage_tracking ENABLE ROW LEVEL SECURITY;

SELECT pg_temp.recreate_policy(
    'users',
    'users_select_own',
    'CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (auth.uid() = id)'
);

SELECT pg_temp.recreate_policy(
    'users',
    'users_insert_own',
    'CREATE POLICY users_insert_own ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)'
);

SELECT pg_temp.recreate_policy(
    'users',
    'users_update_own',
    'CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)'
);

SELECT pg_temp.recreate_policy(
    'personality_questions',
    'personality_questions_read',
    'CREATE POLICY personality_questions_read ON public.personality_questions FOR SELECT TO anon, authenticated USING (true)'
);

SELECT pg_temp.recreate_policy(
    'personality_answers',
    'personality_answers_own_rows',
    'CREATE POLICY personality_answers_own_rows ON public.personality_answers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'personality_profiles',
    'personality_profiles_own_rows',
    'CREATE POLICY personality_profiles_own_rows ON public.personality_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'chat_history',
    'chat_history_own_rows',
    'CREATE POLICY chat_history_own_rows ON public.chat_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'memory_vectors',
    'memory_vectors_own_rows',
    'CREATE POLICY memory_vectors_own_rows ON public.memory_vectors FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'subscriptions',
    'subscriptions_select_own',
    'CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'usage_tracking',
    'usage_tracking_own_rows',
    'CREATE POLICY usage_tracking_own_rows ON public.usage_tracking FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

-- Public/read-only feature catalog tables.
ALTER TABLE IF EXISTS life_coach_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS program_days ENABLE ROW LEVEL SECURITY;

SELECT pg_temp.recreate_policy(
    'life_coach_programs',
    'life_coach_programs_read',
    'CREATE POLICY life_coach_programs_read ON public.life_coach_programs FOR SELECT TO authenticated USING (true)'
);

SELECT pg_temp.recreate_policy(
    'program_days',
    'program_days_read',
    'CREATE POLICY program_days_read ON public.program_days FOR SELECT TO authenticated USING (true)'
);

-- User-owned feature tables.
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_program_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS motivation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS streak_freeze_purchases ENABLE ROW LEVEL SECURITY;

SELECT pg_temp.recreate_policy(
    'conversations',
    'conversations_own_rows',
    'CREATE POLICY conversations_own_rows ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'notifications',
    'notifications_own_rows',
    'CREATE POLICY notifications_own_rows ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'daily_insights',
    'daily_insights_own_rows',
    'CREATE POLICY daily_insights_own_rows ON public.daily_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'push_device_tokens',
    'push_device_tokens_own_rows',
    'CREATE POLICY push_device_tokens_own_rows ON public.push_device_tokens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'user_program_progress',
    'user_program_progress_own_rows',
    'CREATE POLICY user_program_progress_own_rows ON public.user_program_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'motivation_cards',
    'motivation_cards_own_rows',
    'CREATE POLICY motivation_cards_own_rows ON public.motivation_cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'referral_codes',
    'referral_codes_own_rows',
    'CREATE POLICY referral_codes_own_rows ON public.referral_codes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

SELECT pg_temp.recreate_policy(
    'streak_freeze_purchases',
    'streak_freeze_purchases_own_rows',
    'CREATE POLICY streak_freeze_purchases_own_rows ON public.streak_freeze_purchases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'
);

-- Derived ownership tables.
ALTER TABLE IF EXISTS user_daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS motivation_card_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS twin_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS twin_match_shares ENABLE ROW LEVEL SECURITY;

SELECT pg_temp.recreate_policy(
    'user_daily_completions',
    'user_daily_completions_own_rows',
    'CREATE POLICY user_daily_completions_own_rows ON public.user_daily_completions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_program_progress upp WHERE upp.id = user_daily_completions.progress_id AND upp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.user_program_progress upp WHERE upp.id = user_daily_completions.progress_id AND upp.user_id = auth.uid()))'
);

SELECT pg_temp.recreate_policy(
    'motivation_card_shares',
    'motivation_card_shares_own_rows',
    'CREATE POLICY motivation_card_shares_own_rows ON public.motivation_card_shares FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.motivation_cards mc WHERE mc.id = motivation_card_shares.card_id AND mc.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.motivation_cards mc WHERE mc.id = motivation_card_shares.card_id AND mc.user_id = auth.uid()))'
);

SELECT pg_temp.recreate_policy(
    'referral_events',
    'referral_events_own_rows',
    'CREATE POLICY referral_events_own_rows ON public.referral_events FOR SELECT TO authenticated USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id)'
);

SELECT pg_temp.recreate_policy(
    'twin_matches',
    'twin_matches_participant_rows',
    'CREATE POLICY twin_matches_participant_rows ON public.twin_matches FOR ALL TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id) WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id)'
);

SELECT pg_temp.recreate_policy(
    'twin_match_shares',
    'twin_match_shares_participant_rows',
    'CREATE POLICY twin_match_shares_participant_rows ON public.twin_match_shares FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.twin_matches tm WHERE tm.id = twin_match_shares.match_id AND (tm.user1_id = auth.uid() OR tm.user2_id = auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.twin_matches tm WHERE tm.id = twin_match_shares.match_id AND (tm.user1_id = auth.uid() OR tm.user2_id = auth.uid())))'
);

-- Growth circles.
ALTER TABLE IF EXISTS growth_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS circle_activity ENABLE ROW LEVEL SECURITY;

SELECT pg_temp.recreate_policy(
    'growth_circles',
    'growth_circles_member_select',
    'CREATE POLICY growth_circles_member_select ON public.growth_circles FOR SELECT TO authenticated USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.circle_members cm WHERE cm.circle_id = growth_circles.id AND cm.user_id = auth.uid() AND cm.is_active = true))'
);

SELECT pg_temp.recreate_policy(
    'growth_circles',
    'growth_circles_creator_insert',
    'CREATE POLICY growth_circles_creator_insert ON public.growth_circles FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())'
);

SELECT pg_temp.recreate_policy(
    'growth_circles',
    'growth_circles_creator_update',
    'CREATE POLICY growth_circles_creator_update ON public.growth_circles FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid())'
);

SELECT pg_temp.recreate_policy(
    'circle_members',
    'circle_members_member_select',
    'CREATE POLICY circle_members_member_select ON public.circle_members FOR SELECT TO authenticated USING (user_id = auth.uid())'
);

SELECT pg_temp.recreate_policy(
    'circle_members',
    'circle_members_own_insert',
    'CREATE POLICY circle_members_own_insert ON public.circle_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())'
);

SELECT pg_temp.recreate_policy(
    'circle_members',
    'circle_members_own_update',
    'CREATE POLICY circle_members_own_update ON public.circle_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())'
);

SELECT pg_temp.recreate_policy(
    'circle_invitations',
    'circle_invitations_member_select',
    'CREATE POLICY circle_invitations_member_select ON public.circle_invitations FOR SELECT TO authenticated USING (invited_by = auth.uid() OR EXISTS (SELECT 1 FROM public.circle_members cm WHERE cm.circle_id = circle_invitations.circle_id AND cm.user_id = auth.uid() AND cm.is_active = true))'
);

SELECT pg_temp.recreate_policy(
    'circle_invitations',
    'circle_invitations_creator_insert',
    'CREATE POLICY circle_invitations_creator_insert ON public.circle_invitations FOR INSERT TO authenticated WITH CHECK (invited_by = auth.uid())'
);

SELECT pg_temp.recreate_policy(
    'circle_milestones',
    'circle_milestones_member_select',
    'CREATE POLICY circle_milestones_member_select ON public.circle_milestones FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.circle_members cm WHERE cm.circle_id = circle_milestones.circle_id AND cm.user_id = auth.uid() AND cm.is_active = true))'
);

SELECT pg_temp.recreate_policy(
    'circle_activity',
    'circle_activity_member_select',
    'CREATE POLICY circle_activity_member_select ON public.circle_activity FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.circle_members cm WHERE cm.circle_id = circle_activity.circle_id AND cm.user_id = auth.uid() AND cm.is_active = true))'
);

SELECT pg_temp.recreate_policy(
    'circle_activity',
    'circle_activity_own_insert',
    'CREATE POLICY circle_activity_own_insert ON public.circle_activity FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.circle_members cm WHERE cm.circle_id = circle_activity.circle_id AND cm.user_id = auth.uid() AND cm.is_active = true))'
);

-- Emotional, memory, proactive, and gamification tables.
ALTER TABLE IF EXISTS emotional_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emotional_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS metric_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS behavioral_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_activity_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proactive_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shared_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memory_anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS life_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS relationship_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS relationship_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS topic_cache ENABLE ROW LEVEL SECURITY;

SELECT pg_temp.recreate_policy('emotional_metrics', 'emotional_metrics_own_rows', 'CREATE POLICY emotional_metrics_own_rows ON public.emotional_metrics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('emotional_history', 'emotional_history_own_rows', 'CREATE POLICY emotional_history_own_rows ON public.emotional_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('metric_events', 'metric_events_own_rows', 'CREATE POLICY metric_events_own_rows ON public.metric_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('user_engagement', 'user_engagement_own_rows', 'CREATE POLICY user_engagement_own_rows ON public.user_engagement FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('daily_activity', 'daily_activity_own_rows', 'CREATE POLICY daily_activity_own_rows ON public.daily_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('behavioral_triggers', 'behavioral_triggers_own_rows', 'CREATE POLICY behavioral_triggers_own_rows ON public.behavioral_triggers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('user_profiles', 'user_profiles_own_rows', 'CREATE POLICY user_profiles_own_rows ON public.user_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('user_activity_patterns', 'user_activity_patterns_own_rows', 'CREATE POLICY user_activity_patterns_own_rows ON public.user_activity_patterns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('proactive_messages', 'proactive_messages_own_rows', 'CREATE POLICY proactive_messages_own_rows ON public.proactive_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('shared_memories', 'shared_memories_own_rows', 'CREATE POLICY shared_memories_own_rows ON public.shared_memories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('memory_anniversaries', 'memory_anniversaries_own_rows', 'CREATE POLICY memory_anniversaries_own_rows ON public.memory_anniversaries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.shared_memories sm WHERE sm.id = memory_anniversaries.memory_id AND sm.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.shared_memories sm WHERE sm.id = memory_anniversaries.memory_id AND sm.user_id = auth.uid()))');
SELECT pg_temp.recreate_policy('user_streaks', 'user_streaks_own_rows', 'CREATE POLICY user_streaks_own_rows ON public.user_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('user_achievements', 'user_achievements_own_rows', 'CREATE POLICY user_achievements_own_rows ON public.user_achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('user_levels', 'user_levels_own_rows', 'CREATE POLICY user_levels_own_rows ON public.user_levels FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('life_context', 'life_context_own_rows', 'CREATE POLICY life_context_own_rows ON public.life_context FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('relationship_milestones', 'relationship_milestones_own_rows', 'CREATE POLICY relationship_milestones_own_rows ON public.relationship_milestones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('relationship_growth_metrics', 'relationship_growth_metrics_own_rows', 'CREATE POLICY relationship_growth_metrics_own_rows ON public.relationship_growth_metrics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('message_embeddings', 'message_embeddings_own_rows', 'CREATE POLICY message_embeddings_own_rows ON public.message_embeddings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('conversation_summaries', 'conversation_summaries_own_rows', 'CREATE POLICY conversation_summaries_own_rows ON public.conversation_summaries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
SELECT pg_temp.recreate_policy('topic_cache', 'topic_cache_own_rows', 'CREATE POLICY topic_cache_own_rows ON public.topic_cache FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)');
