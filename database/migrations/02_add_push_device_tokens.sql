-- Multi-device push notification tokens.
-- Keep users.fcm_token as a backward-compatible fallback, but use this table
-- for enterprise-grade token rotation, reinstall handling, and multi-device users.

CREATE TABLE IF NOT EXISTS push_device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'android',
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    disabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user_enabled
    ON push_device_tokens(user_id, enabled);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_last_seen
    ON push_device_tokens(last_seen_at);
