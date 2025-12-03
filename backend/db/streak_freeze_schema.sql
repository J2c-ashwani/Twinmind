-- Streak Freeze Feature Schema
-- Allows users to save their streak once if they miss a day

-- Add freeze token tracking to user_streaks
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_streaks' 
                   AND column_name = 'freeze_tokens') THEN
        ALTER TABLE user_streaks ADD COLUMN freeze_tokens INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_streaks' 
                   AND column_name = 'freeze_used_at') THEN
        ALTER TABLE user_streaks ADD COLUMN freeze_used_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_streaks' 
                   AND column_name = 'last_freeze_earned') THEN
        ALTER TABLE user_streaks ADD COLUMN last_freeze_earned TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Track freeze purchases and earnings
CREATE TABLE IF NOT EXISTS streak_freeze_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    purchase_type TEXT NOT NULL CHECK (purchase_type IN ('xp', 'premium', 'milestone', 'free')),
    tokens_earned INTEGER DEFAULT 1,
    xp_cost INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_freeze_purchases_user_id ON streak_freeze_purchases(user_id);

-- Function to auto-apply freeze on streak break
CREATE OR REPLACE FUNCTION apply_streak_freeze()
RETURNS TRIGGER AS $$
BEGIN
    -- If streak is about to break and user has freeze tokens
    IF NEW.current_streak = 1 AND OLD.current_streak > 1 AND OLD.freeze_tokens > 0 THEN
        -- Use a freeze token
        NEW.current_streak := OLD.current_streak;
        NEW.freeze_tokens := OLD.freeze_tokens - 1;
        NEW.freeze_used_at := NOW();
        
        -- Log the freeze usage
        INSERT INTO streak_freeze_purchases (user_id, purchase_type, tokens_earned)
        VALUES (NEW.user_id, 'free', -1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_apply_streak_freeze') THEN
        CREATE TRIGGER trigger_apply_streak_freeze
        BEFORE UPDATE ON user_streaks
        FOR EACH ROW
        EXECUTE FUNCTION apply_streak_freeze();
    END IF;
END $$;
