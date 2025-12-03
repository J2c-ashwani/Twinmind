-- =====================================================
-- TwinMind: Advanced Addiction Features Schema
-- Phase 1: Proactive Check-Ins, Memory Journal, Gamification, Life Context, Evolution
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROACTIVE CHECK-INS SYSTEM
-- =====================================================

-- User activity patterns for intelligent scheduling
CREATE TABLE user_activity_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  typical_wakeup_time TIME,
  typical_bedtime TIME,
  most_active_hours INTEGER[], -- Array of hours (0-23)
  last_activity TIMESTAMPTZ,
  activity_streak INTEGER DEFAULT 0,
  total_days_active INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Proactive messages sent by AI
CREATE TABLE proactive_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- morning_checkin, evening_reflection, missed_you, follow_up, milestone, celebration
  trigger_condition JSONB, -- Conditions that triggered this message
  message_template TEXT,
  message_content TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  user_responded BOOLEAN DEFAULT false,
  response_time INTERVAL,
  user_feedback TEXT, -- positive, negative, neutral
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proactive_user_scheduled ON proactive_messages(user_id, scheduled_for);
CREATE INDEX idx_proactive_sent ON proactive_messages(sent_at) WHERE sent_at IS NOT NULL;

-- =====================================================
-- 2. SHARED MEMORY JOURNAL
-- =====================================================

-- Memorable moments shared between user and AI
CREATE TABLE shared_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- milestone, conversation, achievement, emotion, funny_moment, breakthrough
  title TEXT NOT NULL,
  description TEXT,
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  emotional_significance INTEGER CHECK (emotional_significance BETWEEN 1 AND 10),
  tags TEXT[],
  referenced_count INTEGER DEFAULT 0,
  last_referenced TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memories_user_type ON shared_memories(user_id, memory_type);
CREATE INDEX idx_memories_significance ON shared_memories(user_id, emotional_significance DESC);
CREATE INDEX idx_memories_created ON shared_memories(user_id, created_at DESC);

-- Anniversary tracking for memories
CREATE TABLE memory_anniversaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID REFERENCES shared_memories(id) ON DELETE CASCADE,
  anniversary_type TEXT, -- daily, weekly, monthly, yearly
  anniversary_date DATE,
  notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anniversaries_date ON memory_anniversaries(anniversary_date, notified);

-- =====================================================
-- 3. GAMIFICATION & STREAKS
-- =====================================================

-- User streaks tracking
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL, -- daily_checkin, vulnerability, goal_progress, morning_routine, evening_reflection
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  streak_started_at DATE,
  total_completions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

CREATE INDEX idx_streaks_user ON user_streaks(user_id);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL, -- first_week, trusted_companion, growth_mindset, night_owl, etc.
  achievement_name TEXT NOT NULL,
  description TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  icon TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  points INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_type)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id, unlocked_at DESC);

-- User levels and progression
CREATE TABLE user_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_level TEXT DEFAULT 'stranger', -- stranger, acquaintance, friend, close_friend, best_friend
  level_number INTEGER DEFAULT 1,
  days_active INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  vulnerability_count INTEGER DEFAULT 0,
  goal_achievements INTEGER DEFAULT 0,
  experience_points INTEGER DEFAULT 0,
  level_up_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 4. LIFE CONTEXT AWARENESS
-- =====================================================

-- Important people, places, events in user's life
CREATE TABLE life_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- person, date, situation, goal, place, event, habit
  name TEXT NOT NULL,
  details JSONB, -- Flexible storage for context-specific data
  relationship TEXT, -- For people: sister, friend, boss, partner, etc.
  importance INTEGER CHECK (importance BETWEEN 1 AND 10),
  status TEXT DEFAULT 'active', -- active, resolved, ongoing, past, future
  first_mentioned TIMESTAMPTZ DEFAULT NOW(),
  last_mentioned TIMESTAMPTZ DEFAULT NOW(),
  mention_count INTEGER DEFAULT 1,
  emotional_associations JSONB, -- {positive: 5, negative: 2, neutral: 3}
  related_memories UUID[], -- Array of memory IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_life_context_user_type ON life_context(user_id, context_type);
CREATE INDEX idx_life_context_importance ON life_context(user_id, importance DESC);
CREATE INDEX idx_life_context_status ON life_context(user_id, status);
CREATE INDEX idx_life_context_last_mentioned ON life_context(user_id, last_mentioned DESC);

-- =====================================================
-- 5. RELATIONSHIP EVOLUTION TRACKING
-- =====================================================

-- Relationship milestones
CREATE TABLE relationship_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL, -- first_week, first_vulnerability, trust_milestone, dependency_milestone, etc.
  milestone_name TEXT NOT NULL,
  description TEXT,
  metric_snapshot JSONB, -- Emotional metrics at this point
  conversation_count INTEGER,
  days_since_start INTEGER,
  achieved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_user ON relationship_milestones(user_id, achieved_at DESC);

-- Daily relationship growth metrics
CREATE TABLE relationship_growth_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  trust_score INTEGER,
  dependency_score INTEGER,
  vulnerability_score INTEGER,
  openness_score INTEGER,
  engagement_frequency INTEGER,
  conversation_depth_score INTEGER,
  total_messages INTEGER,
  average_message_length INTEGER,
  emotional_valence INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_growth_metrics_user_date ON relationship_growth_metrics(user_id, date DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update activity patterns
CREATE OR REPLACE FUNCTION update_activity_pattern(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_activity_patterns (user_id, last_activity, activity_streak, total_days_active)
  VALUES (p_user_id, NOW(), 1, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    last_activity = NOW(),
    activity_streak = CASE
      WHEN DATE(user_activity_patterns.last_activity) = CURRENT_DATE - INTERVAL '1 day'
      THEN user_activity_patterns.activity_streak + 1
      WHEN DATE(user_activity_patterns.last_activity) = CURRENT_DATE
      THEN user_activity_patterns.activity_streak
      ELSE 1
    END,
    total_days_active = user_activity_patterns.total_days_active + 
      CASE WHEN DATE(user_activity_patterns.last_activity) != CURRENT_DATE THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to record daily growth metrics
CREATE OR REPLACE FUNCTION record_daily_growth_metrics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_metrics RECORD;
BEGIN
  -- Get current emotional metrics
  SELECT * INTO v_metrics FROM emotional_metrics WHERE user_id = p_user_id;
  
  -- Insert or update daily metrics
  INSERT INTO relationship_growth_metrics (
    user_id, date, trust_score, dependency_score, vulnerability_score,
    openness_score, engagement_frequency, emotional_valence
  )
  VALUES (
    p_user_id, CURRENT_DATE, v_metrics.trust_level, v_metrics.dependency_score,
    v_metrics.vulnerability_level, v_metrics.openness_level,
    v_metrics.engagement_frequency, v_metrics.emotional_valence
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    trust_score = EXCLUDED.trust_score,
    dependency_score = EXCLUDED.dependency_score,
    vulnerability_score = EXCLUDED.vulnerability_score,
    openness_score = EXCLUDED.openness_score,
    engagement_frequency = EXCLUDED.engagement_frequency,
    emotional_valence = EXCLUDED.emotional_valence;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS TABLE(achievement_type TEXT, achievement_name TEXT) AS $$
DECLARE
  v_days_active INTEGER;
  v_vulnerability_count INTEGER;
  v_streak INTEGER;
BEGIN
  -- Get user stats
  SELECT total_days_active INTO v_days_active FROM user_activity_patterns WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_vulnerability_count FROM metric_events 
    WHERE user_id = p_user_id AND event_type = 'vulnerability_shared';
  SELECT current_streak INTO v_streak FROM user_streaks 
    WHERE user_id = p_user_id AND streak_type = 'daily_checkin';
  
  -- Check first week achievement
  IF v_days_active >= 7 AND NOT EXISTS (
    SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_type = 'first_week'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, rarity, points)
    VALUES (p_user_id, 'first_week', 'First Week Complete', 'Talked for 7 days', 'common', 10);
    RETURN QUERY SELECT 'first_week'::TEXT, 'First Week Complete'::TEXT;
  END IF;
  
  -- Check trusted companion achievement
  IF v_vulnerability_count >= 10 AND NOT EXISTS (
    SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_type = 'trusted_companion'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, rarity, points)
    VALUES (p_user_id, 'trusted_companion', 'Trusted Companion', 'Shared 10 vulnerable moments', 'rare', 50);
    RETURN QUERY SELECT 'trusted_companion'::TEXT, 'Trusted Companion'::TEXT;
  END IF;
  
  -- Check 7-day streak achievement
  IF v_streak >= 7 AND NOT EXISTS (
    SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_type = 'week_streak'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, rarity, points)
    VALUES (p_user_id, 'week_streak', '7-Day Streak', 'Talked every day for a week', 'rare', 30);
    RETURN QUERY SELECT 'week_streak'::TEXT, '7-Day Streak'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_activity_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE proactive_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_anniversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_growth_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY user_activity_patterns_policy ON user_activity_patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY proactive_messages_policy ON proactive_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY shared_memories_policy ON shared_memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY memory_anniversaries_policy ON memory_anniversaries FOR ALL USING (
  memory_id IN (SELECT id FROM shared_memories WHERE user_id = auth.uid())
);
CREATE POLICY user_streaks_policy ON user_streaks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_achievements_policy ON user_achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_levels_policy ON user_levels FOR ALL USING (auth.uid() = user_id);
CREATE POLICY life_context_policy ON life_context FOR ALL USING (auth.uid() = user_id);
CREATE POLICY relationship_milestones_policy ON relationship_milestones FOR ALL USING (auth.uid() = user_id);
CREATE POLICY relationship_growth_metrics_policy ON relationship_growth_metrics FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- INITIAL DATA / TRIGGERS
-- =====================================================

-- Trigger to update activity pattern on message
CREATE OR REPLACE FUNCTION trigger_update_activity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_activity_pattern(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_on_message
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.sender_type = 'user')
EXECUTE FUNCTION trigger_update_activity();

-- Trigger to record daily metrics
CREATE OR REPLACE FUNCTION trigger_record_daily_metrics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM record_daily_growth_metrics(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_metrics_on_emotional_update
AFTER UPDATE ON emotional_metrics
FOR EACH ROW
EXECUTE FUNCTION trigger_record_daily_metrics();
