-- ==============================================================================
-- GROWTH PUBLICATION SLOTS TABLE
-- Authoritative Atomic Idempotency & Multi-Slot Coordination Engine
-- Guarantees exactly-once publishing per platform, date, and slot index.
-- Solves check-then-act race conditions across concurrent workers & server restarts.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS growth_publication_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slot_key TEXT UNIQUE NOT NULL,                       -- e.g. 'facebook:2026-10-31:1'
    platform TEXT NOT NULL,                             -- 'facebook', 'instagram', 'linkedin', 'threads', 'youtube', 'tiktok'
    slot_date DATE NOT NULL,                            -- Asia/Kolkata date (YYYY-MM-DD)
    slot_index INT NOT NULL DEFAULT 1,                  -- Supports multiple posts per day (1=Morning, 2=Afternoon, 3=Evening)
    status TEXT NOT NULL DEFAULT 'pending',             -- 'pending', 'rendering', 'publishing', 'verifying', 'published', 'failed'
    locked_until TIMESTAMP WITH TIME ZONE,              -- Distributed lease expiration
    worker_id TEXT,                                     -- Identifies container/worker holding lease
    post_id TEXT,                                       -- Platform post ID after publication
    post_url TEXT,                                      -- Canonical live post URL
    error_message TEXT,                                 -- Last failure reason if failed
    attempts INT DEFAULT 0,                             -- Retry counter
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_platform_slot UNIQUE (platform, slot_date, slot_index)
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_growth_slots_platform_date ON growth_publication_slots(platform, slot_date);
CREATE INDEX IF NOT EXISTS idx_growth_slots_status ON growth_publication_slots(status);
CREATE INDEX IF NOT EXISTS idx_growth_slots_lease ON growth_publication_slots(locked_until);
