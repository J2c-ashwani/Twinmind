-- Emotional State Tracking Schema
-- Tracks 8 emotional metrics with weighted scoring

-- Emotional metrics for each user
CREATE TABLE emotional_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core emotional metrics (0-100 scale)
    trust_level INTEGER DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 100),
    openness_level INTEGER DEFAULT 0 CHECK (openness_level >= 0 AND openness_level <= 100),
    dependency_score INTEGER DEFAULT 0 CHECK (dependency_score >= 0 AND dependency_score <= 100),
    vulnerability_level INTEGER DEFAULT 0 CHECK (vulnerability_level >= 0 AND vulnerability_level <= 100),
    engagement_frequency INTEGER DEFAULT 0 CHECK (engagement_frequency >= 0 AND engagement_frequency <= 100),
    goal_progress INTEGER DEFAULT 0 CHECK (goal_progress >= 0 AND goal_progress <= 100),
    emotional_valence INTEGER DEFAULT 50 CHECK (emotional_valence >= 0 AND emotional_valence <= 100), -- 0=very negative, 50=neutral, 100=very positive
    relationship_depth INTEGER DEFAULT 0 CHECK (relationship_depth >= 0 AND relationship_depth <= 100),
    
    -- Computed emotional state
    emotional_state TEXT DEFAULT 'new_user', -- new_user, bonding, attached, emotionally_dependent, detaching
    weighted_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Tracking
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Historical emotional metric snapshots (for trend analysis)
CREATE TABLE emotional_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trust_level INTEGER,
    openness_level INTEGER,
    dependency_score INTEGER,
    vulnerability_level INTEGER,
    engagement_frequency INTEGER,
    goal_progress INTEGER,
    emotional_valence INTEGER,
    relationship_depth INTEGER,
    emotional_state TEXT,
    weighted_score DECIMAL(5,2),
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

-- Metric change events (what caused metric changes)
CREATE TABLE metric_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL, -- trust_level, openness_level, etc.
    old_value INTEGER,
    new_value INTEGER,
    delta INTEGER, -- change amount
    trigger_type TEXT NOT NULL, -- message_sent, emotional_share, goal_mentioned, etc.
    message_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_emotional_metrics_user ON emotional_metrics(user_id);
CREATE INDEX idx_emotional_metrics_state ON emotional_metrics(emotional_state);
CREATE INDEX idx_emotional_history_user_date ON emotional_history(user_id, snapshot_date DESC);
CREATE INDEX idx_metric_events_user ON metric_events(user_id);
CREATE INDEX idx_metric_events_created ON metric_events(created_at DESC);

-- RLS Policies
ALTER TABLE emotional_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emotional metrics" ON emotional_metrics
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own emotional history" ON emotional_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own metric events" ON metric_events
    FOR ALL USING (auth.uid() = user_id);

-- Function to calculate weighted emotional score
CREATE OR REPLACE FUNCTION calculate_weighted_score(
    p_trust INTEGER,
    p_openness INTEGER,
    p_dependency INTEGER,
    p_vulnerability INTEGER,
    p_engagement INTEGER,
    p_goal_progress INTEGER,
    p_valence INTEGER
)
RETURNS DECIMAL(5,2) AS $$
BEGIN
    RETURN (
        (p_trust * 0.20) +
        (p_openness * 0.15) +
        (p_dependency * 0.25) +
        (p_vulnerability * 0.15) +
        (p_engagement * 0.10) +
        (p_goal_progress * 0.10) +
        (p_valence * 0.05)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to determine emotional state from metrics with transition rules
CREATE OR REPLACE FUNCTION determine_emotional_state(
    p_trust INTEGER,
    p_openness INTEGER,
    p_dependency INTEGER,
    p_vulnerability INTEGER,
    p_engagement INTEGER,
    p_current_state TEXT DEFAULT 'new_user'
)
RETURNS TEXT AS $$
BEGIN
    -- Detaching (HIGHEST PRIORITY - can happen from any state)
    IF p_engagement < 10 THEN
        RETURN 'detaching';
    END IF;
    
    -- Recovery from detaching
    IF p_current_state = 'detaching' THEN
        -- Positive re-engagement: trust rebuilding + decent engagement
        IF p_trust >= 15 AND p_engagement >= 20 THEN
            RETURN 'bonding'; -- Return to bonding
        END IF;
        RETURN 'detaching'; -- Still detaching
    END IF;
    
    -- Forward progression and state maintenance
    
    -- Emotionally Dependent (deepest state)
    IF p_current_state = 'attached' AND p_vulnerability >= 50 THEN
        RETURN 'emotionally_dependent';
    END IF;
    
    IF p_current_state = 'emotionally_dependent' THEN
        -- Can drop back if vulnerability decreases
        IF p_vulnerability < 30 THEN
            RETURN 'attached';
        END IF;
        RETURN 'emotionally_dependent';
    END IF;
    
    -- Attached
    IF p_current_state = 'bonding' AND p_dependency >= 40 THEN
        RETURN 'attached';
    END IF;
    
    IF p_current_state = 'attached' THEN
        -- Can drop back if dependency decreases
        IF p_dependency < 25 THEN
            RETURN 'bonding';
        END IF;
        RETURN 'attached';
    END IF;
    
    -- Bonding
    IF p_current_state = 'new_user' AND p_trust >= 20 THEN
        RETURN 'bonding';
    END IF;
    
    IF p_current_state = 'bonding' THEN
        -- Can drop back if trust decreases
        IF p_trust < 10 THEN
            RETURN 'new_user';
        END IF;
        RETURN 'bonding';
    END IF;
    
    -- New User (default)
    RETURN 'new_user';
END;
$$ LANGUAGE plpgsql;

-- Function to update emotional metrics
CREATE OR REPLACE FUNCTION update_emotional_metrics(
    p_user_id UUID,
    p_metric_changes JSONB
)
RETURNS VOID AS $$
DECLARE
    v_current RECORD;
    v_new_state TEXT;
    v_weighted_score DECIMAL(5,2);
    v_metric TEXT;
    v_delta INTEGER;
BEGIN
    -- Get current metrics
    SELECT * INTO v_current
    FROM emotional_metrics
    WHERE user_id = p_user_id;
    
    -- Initialize if doesn't exist
    IF v_current IS NULL THEN
        INSERT INTO emotional_metrics (user_id)
        VALUES (p_user_id);
        
        SELECT * INTO v_current
        FROM emotional_metrics
        WHERE user_id = p_user_id;
    END IF;
    
    -- Apply metric changes and log events
    FOR v_metric, v_delta IN SELECT * FROM jsonb_each_text(p_metric_changes)
    LOOP
        EXECUTE format(
            'INSERT INTO metric_events (user_id, metric_name, old_value, new_value, delta, trigger_type)
             SELECT $1, $2, %I, %I + $3, $3, $4
             FROM emotional_metrics WHERE user_id = $1',
            v_metric, v_metric
        ) USING p_user_id, v_metric, v_delta, 'auto_update';
    END LOOP;
    
    -- Update metrics (ensure within 0-100 bounds)
    UPDATE emotional_metrics
    SET
        trust_level = GREATEST(0, LEAST(100, 
            trust_level + COALESCE((p_metric_changes->>'trust_level')::INTEGER, 0))),
        openness_level = GREATEST(0, LEAST(100,
            openness_level + COALESCE((p_metric_changes->>'openness_level')::INTEGER, 0))),
        dependency_score = GREATEST(0, LEAST(100,
            dependency_score + COALESCE((p_metric_changes->>'dependency_score')::INTEGER, 0))),
        vulnerability_level = GREATEST(0, LEAST(100,
            vulnerability_level + COALESCE((p_metric_changes->>'vulnerability_level')::INTEGER, 0))),
        engagement_frequency = GREATEST(0, LEAST(100,
            engagement_frequency + COALESCE((p_metric_changes->>'engagement_frequency')::INTEGER, 0))),
        goal_progress = GREATEST(0, LEAST(100,
            goal_progress + COALESCE((p_metric_changes->>'goal_progress')::INTEGER, 0))),
        emotional_valence = GREATEST(0, LEAST(100,
            emotional_valence + COALESCE((p_metric_changes->>'emotional_valence')::INTEGER, 0))),
        relationship_depth = GREATEST(0, LEAST(100,
            relationship_depth + COALESCE((p_metric_changes->>'relationship_depth')::INTEGER, 0))),
        last_updated = NOW()
    WHERE user_id = p_user_id;
    
    -- Get updated values
    SELECT * INTO v_current
    FROM emotional_metrics
    WHERE user_id = p_user_id;
    
    -- Calculate weighted score
    v_weighted_score := calculate_weighted_score(
        v_current.trust_level,
        v_current.openness_level,
        v_current.dependency_score,
        v_current.vulnerability_level,
        v_current.engagement_frequency,
        v_current.goal_progress,
        v_current.emotional_valence
    );
    
    -- Determine new emotional state (with current state for transitions)
    v_new_state := determine_emotional_state(
        v_current.trust_level,
        v_current.openness_level,
        v_current.dependency_score,
        v_current.vulnerability_level,
        v_current.engagement_frequency,
        v_current.emotional_state  -- Pass current state for transition logic
    );
    
    -- Update state and score
    UPDATE emotional_metrics
    SET
        emotional_state = v_new_state,
        weighted_score = v_weighted_score
    WHERE user_id = p_user_id;
    
    -- Log state transition if changed
    IF v_new_state != v_current.emotional_state THEN
        INSERT INTO metric_events (user_id, metric_name, old_value, new_value, trigger_type)
        VALUES (p_user_id, 'emotional_state_transition', 
                0, 0,  -- Not numeric
                format('transition: %s -> %s', v_current.emotional_state, v_new_state));
    END IF;
END;
$$ LANGUAGE plpgsql;
