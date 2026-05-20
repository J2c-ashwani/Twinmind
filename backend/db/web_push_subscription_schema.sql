-- Browser push subscription storage.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS web_push_subscription JSONB,
    ADD COLUMN IF NOT EXISTS push_provider TEXT;
