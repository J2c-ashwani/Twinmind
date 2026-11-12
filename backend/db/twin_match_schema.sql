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

-- Two-person invitation & mutual consent before revealing comparison insights
CREATE TABLE IF NOT EXISTS twin_match_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(requester_id, recipient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_twin_matches_user1 ON twin_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_twin_matches_user2 ON twin_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_twin_match_shares_match_id ON twin_match_shares(match_id);
CREATE INDEX IF NOT EXISTS idx_twin_match_invites_recipient ON twin_match_invitations(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_twin_match_invites_requester ON twin_match_invitations(requester_id, status);
