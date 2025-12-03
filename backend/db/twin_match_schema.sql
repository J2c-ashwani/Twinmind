-- Twin Match Schema
-- Personality comparison and compatibility tracking

CREATE TABLE IF NOT EXISTS twin_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL,
    user2_id UUID NOT NULL,
    compatibility_score INTEGER NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    traits_comparison JSONB,
    insights TEXT[],
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Track shares of comparison results
CREATE TABLE IF NOT EXISTS twin_match_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES twin_matches(id) ON DELETE CASCADE,
    platform TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_twin_matches_user1 ON twin_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_twin_matches_user2 ON twin_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_twin_match_shares_match_id ON twin_match_shares(match_id);
