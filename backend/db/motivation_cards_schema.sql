-- Weekly Motivation Cards Schema
-- Auto-generated personalized motivational quotes from user conversations

CREATE TABLE IF NOT EXISTS motivation_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    quote TEXT NOT NULL,
    card_image_url TEXT,
    twin_name TEXT DEFAULT 'Your Twin',
    context TEXT, -- Brief context about the quote
    is_shared BOOLEAN DEFAULT false,
    shared_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Track card shares for analytics
CREATE TABLE IF NOT EXISTS motivation_card_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES motivation_cards(id) ON DELETE CASCADE,
    platform TEXT, -- 'twitter', 'linkedin', 'instagram', 'native'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_motivation_cards_user_id ON motivation_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_motivation_cards_week ON motivation_cards(week_start);
CREATE INDEX IF NOT EXISTS idx_motivation_card_shares_card_id ON motivation_card_shares(card_id);

-- Function to get current week start (Monday)
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
    RETURN input_date - ((EXTRACT(DOW FROM input_date)::INTEGER + 6) % 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
