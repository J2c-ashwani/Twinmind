-- Growth Circles Database Schema
-- Tables for collaborative referral and gamification system

-- Main circles table
CREATE TABLE IF NOT EXISTS growth_circles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Growth Circle',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    collective_streak INTEGER DEFAULT 0,
    total_check_ins INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 5,
    description TEXT
);

-- Circle members table
CREATE TABLE IF NOT EXISTS circle_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID NOT NULL REFERENCES growth_circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'member')),
    is_active BOOLEAN DEFAULT true,
    contribution_score INTEGER DEFAULT 0,
    last_check_in TIMESTAMP WITH TIME ZONE,
    UNIQUE(circle_id, user_id)
);

-- Circle invitations table
CREATE TABLE IF NOT EXISTS circle_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID NOT NULL REFERENCES growth_circles(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL,
    invitation_code TEXT UNIQUE NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Circle milestones table
CREATE TABLE IF NOT EXISTS circle_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID NOT NULL REFERENCES growth_circles(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('10_days', '30_days', '90_days')),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward JSONB,
    UNIQUE(circle_id, milestone_type)
);

-- Circle activity log (for analytics)
CREATE TABLE IF NOT EXISTS circle_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    circle_id UUID NOT NULL REFERENCES growth_circles(id) ON DELETE CASCADE,
    user_id UUID,
    activity_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_code ON circle_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_circle_id ON circle_invitations(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_milestones_circle_id ON circle_milestones(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_activity_circle_id ON circle_activity(circle_id);

-- Function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM circle_invitations WHERE invitation_code = code) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;
