-- Add user engagement tracking tables

-- User engagement state and metrics
CREATE TABLE user_engagement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_state TEXT NOT NULL DEFAULT 'new_user', -- new_user, bonding, habit, dependency, long_term
    state_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_messages INTEGER DEFAULT 0,
    consecutive_days INTEGER DEFAULT 0,
    last_active_date DATE,
    emotional_shares INTEGER DEFAULT 0,
    goal_mentions INTEGER DEFAULT 0,
    organic_returns INTEGER DEFAULT 0, -- Returns without notification
    first_message_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Daily activity tracking for streak calculation
CREATE TABLE daily_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    message_count INTEGER DEFAULT 0,
    emotional_content BOOLEAN DEFAULT FALSE,
    goal_related BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Behavioral triggers log
CREATE TABLE behavioral_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL, -- completed_onboarding, shared_emotion, daily_streak, etc.
    old_state TEXT,
    new_state TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_engagement_user ON user_engagement(user_id);
CREATE INDEX idx_user_engagement_state ON user_engagement(current_state);
CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date);
CREATE INDEX idx_behavioral_triggers_user ON behavioral_triggers(user_id);
CREATE INDEX idx_behavioral_triggers_created ON behavioral_triggers(created_at DESC);

-- RLS Policies
ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagement" ON user_engagement
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activity" ON daily_activity
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own triggers" ON behavioral_triggers
    FOR ALL USING (auth.uid() = user_id);

-- Helper function to update consecutive days
CREATE OR REPLACE FUNCTION update_consecutive_days(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_consecutive INTEGER := 0;
    v_current_date DATE;
    v_check_date DATE;
BEGIN
    v_current_date := CURRENT_DATE;
    v_check_date := v_current_date;
    
    -- Count consecutive days backwards from today
    WHILE EXISTS (
        SELECT 1 FROM daily_activity 
        WHERE user_id = p_user_id 
        AND activity_date = v_check_date
    ) LOOP
        v_consecutive := v_consecutive + 1;
        v_check_date := v_check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN v_consecutive;
END;
$$ LANGUAGE plpgsql;

-- Function to get user engagement state
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
    v_consecutive INTEGER;
BEGIN
    -- Get current engagement data
    SELECT * INTO v_engagement
    FROM user_engagement
    WHERE user_id = p_user_id;
    
    IF v_engagement IS NULL THEN
        -- New user
        RETURN QUERY SELECT 
            'new_user'::TEXT,
            0,
            0,
            0,
            FALSE,
            'bonding'::TEXT;
        RETURN;
    END IF;
    
    v_consecutive := update_consecutive_days(p_user_id);
    
    -- Determine transitions
    RETURN QUERY SELECT
        v_engagement.current_state,
        EXTRACT(DAY FROM NOW() - v_engagement.state_since)::INTEGER,
        v_consecutive,
        v_engagement.total_messages,
        CASE
            WHEN v_engagement.current_state = 'new_user' AND v_engagement.emotional_shares > 0 THEN TRUE
            WHEN v_engagement.current_state = 'bonding' AND v_consecutive >= 5 THEN TRUE
            WHEN v_engagement.current_state = 'habit' AND v_engagement.organic_returns >= 3 THEN TRUE
            WHEN v_engagement.current_state = 'dependency' AND v_consecutive >= 30 THEN TRUE
            ELSE FALSE
        END,
        CASE
            WHEN v_engagement.current_state = 'new_user' THEN 'bonding'
            WHEN v_engagement.current_state = 'bonding' THEN 'habit'
            WHEN v_engagement.current_state = 'habit' THEN 'dependency'
            WHEN v_engagement.current_state = 'dependency' THEN 'long_term'
            ELSE 'long_term'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;
