-- Add FCM Token to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Index for faster lookups (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token);
