-- Daily Insights Table
CREATE TABLE IF NOT EXISTS daily_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary TEXT, -- AI summary of the day
    mood_score INTEGER, -- 1-10
    dominant_emotion TEXT,
    key_topics TEXT[],
    actionable_tip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_daily_insights_user_date ON daily_insights(user_id, date);
