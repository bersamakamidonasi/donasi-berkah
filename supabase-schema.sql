-- ===========================================
-- SUPABASE SCHEMA FOR BANTU SESAMA DONATION BOT
-- ===========================================

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    username TEXT,
    amount INTEGER NOT NULL CHECK (amount >= 1000),
    payment_method TEXT DEFAULT 'qris',
    qr_string TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create index for faster lookups by order_id
CREATE INDEX idx_orders_order_id ON orders(order_id);

-- Create index for user_id queries
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Create index for status queries
CREATE INDEX idx_orders_status ON orders(status);

-- Comments for documentation
COMMENT ON TABLE orders IS 'Stores donation orders for Bantu Sesama Bot';
COMMENT ON COLUMN orders.id IS 'Primary key, auto-generated UUID';
COMMENT ON COLUMN orders.order_id IS 'Unique order identifier from Pakasir';
COMMENT ON COLUMN orders.user_id IS 'Telegram user ID of the donor';
COMMENT ON COLUMN orders.username IS 'Telegram username of the donor';
COMMENT ON COLUMN orders.amount IS 'Donation amount in Rupiah, minimum 1000';
COMMENT ON COLUMN orders.payment_method IS 'Payment method, default qris';
COMMENT ON COLUMN orders.qr_string IS 'QR code string from Pakasir';
COMMENT ON COLUMN orders.status IS 'Order status: pending, completed, expired';
COMMENT ON COLUMN orders.expired_at IS 'QRIS expiration timestamp';
COMMENT ON COLUMN orders.created_at IS 'Order creation timestamp';
COMMENT ON COLUMN orders.completed_at IS 'Order completion timestamp';
