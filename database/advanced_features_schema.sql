-- =====================================================
-- TWINMIND ADVANCED FEATURES - DATABASE SCHEMA
-- Emotional Intelligence, Behavioral Tracking, Engagement
-- =====================================================

-- 1. EMOTIONAL METRICS TABLE
-- Tracks 8 emotional dimensions that evolve over time
CREATE TABLE IF NOT EXISTS emotional_metrics (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core Metrics (0-100 scale)
    trust_level INTEGER DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 100),
    openness_level INTEGER DEFAULT 0 CHECK (openness_level >= 0 AND openness_level <= 100),
    dependency_score INTEGER DEFAULT 0 CHECK (dependency_score >= 0 AND dependency_score <= 100),
    vulnerability_level INTEGER DEFAULT 0 CHECK (vulnerability_level >= 0 AND vulnerability_level <= 100),
    engagement_frequency INTEGER DEFAULT 0 CHECK (engagement_frequency >= 0 AND engagement_frequency <= 100),
    goal_progress INTEGER DEFAULT 0 CHECK (goal_progress >= 0 AND goal_progress <= 100),
    emotional_valence INTEGER DEFAULT 50 CHECK (emotional_valence >= 0 AND emotional_valence <= 100),
    relationship_depth INTEGER DEFAULT 0 CHECK (relationship_depth >= 0 AND relationship_depth <= 100),
    
    -- Calculated weighted score
    weighted_score NUMERIC(5,2) DEFAULT 0.00,
    
    -- Current emotional state
    emotional_state TEXT DEFAULT 'new_user',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USER ENGAGEMENT TABLE
-- Tracks behavioral engagement states and progression
CREATE TABLE IF NOT EXISTS user_engagement (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Engagement State (new_user -> bonding -> habit -> dependency -> long_term)
    current_state TEXT DEFAULT 'new_user',
    state_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Activity Metrics
    total_messages INTEGER DEFAULT 0,
    emotional_shares INTEGER DEFAULT 0,
    goal_mentions INTEGER DEFAULT 0,
    organic_returns INTEGER DEFAULT 0,
    
    -- Engagement Dates
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_active_date DATE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. DAILY ACTIVITY TABLE
-- Tracks daily engagement patterns
CREATE TABLE IF NOT EXISTS daily_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    
    -- Activity Metrics
    message_count INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    emotional_content BOOLEAN DEFAULT FALSE,
    goal_related BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, activity_date)
);

-- 4. BEHAVIORAL TRIGGERS TABLE
-- Logs behavioral events for analytics
CREATE TABLE IF NOT EXISTS behavioral_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Trigger Info
    trigger_type TEXT NOT NULL,
    old_state TEXT,
    new_state TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. USER PROFILES TABLE (Extended)
-- Additional user info beyond auth
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Info
    full_name TEXT,
    preferred_name TEXT,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_triggers_user ON behavioral_triggers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_engagement_state ON user_engagement(current_state);

-- =====================================================
-- HELPER FUNCTION: GET ENGAGEMENT STATE
-- =====================================================

CREATE OR REPLACE FUNCTION get_engagement_state(p_user_id UUID)
RETURNS TABLE (
    current_state TEXT,
    days_in_state INTEGER,
    consecutive_days INTEGER,
    total_messages INTEGER,
    should_transition BOOLEAN,
    next_state TEXT
) AS $$
DECLARE
    v_engagement RECORD;
    v_consecutive_days INTEGER;
    v_days_in_state INTEGER;
BEGIN
    -- Get engagement record
    SELECT * INTO v_engagement
    FROM user_engagement
    WHERE user_id = p_user_id;
    
    -- If no record, return defaults
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            'new_user'::TEXT,
            0,
            0,
            0,
            FALSE,
            'bonding'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate days in current state
    v_days_in_state := EXTRACT(DAY FROM NOW() - v_engagement.state_since)::INTEGER;
    
    -- Calculate consecutive days (count recent daily_activity)
    SELECT COUNT(DISTINCT activity_date) INTO v_consecutive_days
    FROM daily_activity
    WHERE user_id = p_user_id
    AND activity_date >= CURRENT_DATE - INTERVAL '30 days';
    
    -- Determine if should transition and next state
    DECLARE
        v_should_transition BOOLEAN := FALSE;
        v_next_state TEXT := v_engagement.current_state;
    BEGIN
        CASE v_engagement.current_state
            WHEN 'new_user' THEN
                IF v_engagement.total_messages >= 5 OR v_consecutive_days >= 2 THEN
                    v_should_transition := TRUE;
                    v_next_state := 'bonding';
                END IF;
            WHEN 'bonding' THEN
                IF v_engagement.total_messages >= 20 OR v_consecutive_days >= 7 THEN
                    v_should_transition := TRUE;
                    v_next_state := 'habit';
                END IF;
            WHEN 'habit' THEN
                IF v_engagement.emotional_shares >= 5 OR v_consecutive_days >= 14 THEN
                    v_should_transition := TRUE;
                    v_next_state := 'dependency';
                END IF;
            WHEN 'dependency' THEN
                IF v_consecutive_days >= 30 THEN
                    v_should_transition := TRUE;
                    v_next_state := 'long_term';
                END IF;
        END CASE;
        
        RETURN QUERY SELECT 
            v_engagement.current_state,
            v_days_in_state,
            v_consecutive_days,
            v_engagement.total_messages,
            v_should_transition,
            v_next_state;
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE emotional_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own emotional_metrics" ON emotional_metrics
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own emotional_metrics" ON emotional_metrics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own user_engagement" ON user_engagement
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own user_engagement" ON user_engagement
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily_activity" ON daily_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own behavioral_triggers" ON behavioral_triggers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own user_profiles" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own user_profiles" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access emotional_metrics" ON emotional_metrics
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access user_engagement" ON user_engagement
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access daily_activity" ON daily_activity
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access behavioral_triggers" ON behavioral_triggers
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access user_profiles" ON user_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- DONE! Advanced features ready.
-- =====================================================
