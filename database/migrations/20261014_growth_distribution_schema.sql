-- ====================================================================
-- TwinGenie Growth Infrastructure & Four-Platform Distribution Schema
-- ====================================================================

-- 1. Growth Campaigns Table
CREATE TABLE IF NOT EXISTS growth_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name TEXT NOT NULL,
    theme TEXT NOT NULL,
    description TEXT,
    target_platforms TEXT[] DEFAULT ARRAY['linkedin', 'instagram', 'facebook', 'youtube'],
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Growth Posts Table (The Durable Scheduled Queue)
CREATE TABLE IF NOT EXISTS growth_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES growth_campaigns(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'instagram', 'facebook', 'youtube')),
    format TEXT NOT NULL CHECK (format IN ('carousel_pdf', 'image_carousel', 'reel', 'short', 'single_image', 'text_post')),
    title TEXT,
    caption TEXT NOT NULL,
    hashtags TEXT[] DEFAULT ARRAY[]::text[],
    utm_link TEXT,
    media_paths TEXT[] DEFAULT ARRAY[]::text[], -- Local or cloud URLs for slides, PDF, or video
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'pending_approval', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
    platform_post_id TEXT,
    platform_post_url TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_log TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Attribution & Metrics Tracking
CREATE TABLE IF NOT EXISTS growth_attribution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES growth_posts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,
    utm_source TEXT NOT NULL,
    utm_medium TEXT NOT NULL,
    utm_campaign TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    link_clicks INTEGER DEFAULT 0,
    app_downloads INTEGER DEFAULT 0,
    activated_users INTEGER DEFAULT 0,
    d1_retained_users INTEGER DEFAULT 0,
    metrics_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_growth_posts_scheduled ON growth_posts (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_growth_posts_platform ON growth_posts (platform, status);
CREATE INDEX IF NOT EXISTS idx_growth_attribution_campaign ON growth_attribution (utm_campaign);
