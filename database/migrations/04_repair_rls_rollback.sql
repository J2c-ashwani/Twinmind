-- ==============================================================================
-- ROLLBACK SCRIPT: 04_repair_rls_rollback.sql
-- Emergency recovery script if 04_repair_rls_policies.sql causes registration friction.
-- Disables RLS on affected secondary tables and restores permissive development state.
-- ==============================================================================

BEGIN;

-- 1. Restore permissive access to core user tables if auth registration is blocked
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.personality_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.personality_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.personality_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.memory_vectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usage_tracking DISABLE ROW LEVEL SECURITY;

-- 2. Restore secondary feature tables
ALTER TABLE IF EXISTS public.motivation_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.motivation_card_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.twin_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.growth_circles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.circle_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.life_coach_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.program_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_program_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_reflections DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.challenge_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_growth_milestones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_device_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_history DISABLE ROW LEVEL SECURITY;

COMMIT;
