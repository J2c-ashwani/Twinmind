-- Google Play subscription entitlement fields.
-- Run this migration before enabling PAYMENTS_PROVIDER=google_play in production.

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS google_play_product_id TEXT,
    ADD COLUMN IF NOT EXISTS google_play_purchase_token TEXT,
    ADD COLUMN IF NOT EXISTS google_play_order_id TEXT,
    ADD COLUMN IF NOT EXISTS google_play_linked_purchase_token TEXT,
    ADD COLUMN IF NOT EXISTS google_play_raw_response JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_unique ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_google_play_order_id ON subscriptions(google_play_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_google_play_token ON subscriptions(google_play_purchase_token);
