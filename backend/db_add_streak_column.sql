-- ================================================================
-- ADD MISSING STREAK COLUMN TO RELATIONSHIP METRICS
-- Purpose: Enable streak tracking in daily metrics recording
-- ================================================================

-- Add streak column if it doesn't exist
ALTER TABLE relationship_growth_metrics 
ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_relationship_metrics_streak 
ON relationship_growth_metrics(user_id, streak DESC);

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'relationship_growth_metrics'
  AND column_name = 'streak';
