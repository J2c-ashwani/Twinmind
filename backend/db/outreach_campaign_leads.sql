-- ==============================================================================
-- OUTREACH CAMPAIGN LEADS & CONTINUOUS REPLENISHMENT TABLE
-- Authoritative persistent store for PR, Investor, and M&A outreach campaigns.
-- Survives Render restarts, container rebuilds, and scale events.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS outreach_campaign_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_type VARCHAR(32) NOT NULL, -- 'pr', 'investor', 'acquisition'
    recipient_name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT NOT NULL,         -- Publication, VC Fund, Acquirer
    role_or_focus TEXT,                 -- Beat, Thesis, Route
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'skipped', 'failed', 'bounced'
    attempts INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    resend_id TEXT,
    error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_campaign_email UNIQUE (campaign_type, email)
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_outreach_leads_type_status ON outreach_campaign_leads(campaign_type, status);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_email ON outreach_campaign_leads(email);
