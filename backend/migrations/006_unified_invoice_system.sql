-- Unified Invoice System Migration
-- Centralizes all payment methods while maintaining balance tracking

-- Create unified invoices table
CREATE TABLE IF NOT EXISTS unified_invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('subscription', 'one_time')),
    amount_zec DECIMAL(16, 8) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('auto', 'transparent', 'shielded', 'unified', 'webzjs', 'devtool')),
    network VARCHAR(10) NOT NULL DEFAULT 'testnet' CHECK (network IN ('mainnet', 'testnet')),
    
    -- Payment address and metadata
    payment_address TEXT NOT NULL,
    address_type VARCHAR(30) NOT NULL,
    address_metadata JSONB DEFAULT '{}',
    
    -- Invoice details
    item_id TEXT,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    
    -- Payment tracking
    paid_amount_zec DECIMAL(16, 8),
    paid_txid TEXT,
    paid_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Wallet linking (optional)
    webzjs_wallet_id INTEGER REFERENCES webzjs_wallets(id),
    devtool_wallet_id INTEGER REFERENCES devtool_wallets(id),
    shielded_wallet_id INTEGER REFERENCES shielded_wallets(id),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_invoices_user_id ON unified_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_invoices_status ON unified_invoices(status);
CREATE INDEX IF NOT EXISTS idx_unified_invoices_payment_address ON unified_invoices(payment_address);
CREATE INDEX IF NOT EXISTS idx_unified_invoices_payment_method ON unified_invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_unified_invoices_created_at ON unified_invoices(created_at);

-- Create payment method statistics view
CREATE OR REPLACE VIEW payment_method_stats AS
SELECT 
    payment_method,
    network,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN paid_amount_zec END), 0) as total_revenue_zec,
    COALESCE(AVG(CASE WHEN status = 'paid' THEN paid_amount_zec END), 0) as avg_payment_zec
FROM unified_invoices 
GROUP BY payment_method, network
ORDER BY total_revenue_zec DESC;

-- Create user payment preferences table
CREATE TABLE IF NOT EXISTS user_payment_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    preferred_method VARCHAR(20) DEFAULT 'auto' CHECK (preferred_method IN ('auto', 'transparent', 'shielded', 'unified', 'webzjs', 'devtool')),
    preferred_network VARCHAR(10) DEFAULT 'testnet' CHECK (preferred_network IN ('mainnet', 'testnet')),
    
    -- Wallet preferences
    default_webzjs_wallet_id INTEGER REFERENCES webzjs_wallets(id),
    default_devtool_wallet_id INTEGER REFERENCES devtool_wallets(id),
    default_shielded_wallet_id INTEGER REFERENCES shielded_wallets(id),
    
    -- Settings
    auto_create_wallets BOOLEAN DEFAULT false,
    require_memo BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Update user_balances view to include unified invoices
DROP VIEW IF EXISTS user_balances;
CREATE VIEW user_balances AS
SELECT 
    u.id,
    u.email,
    u.name,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.paid_amount_zec ELSE 0 END), 0) + 
    COALESCE(SUM(CASE WHEN ui.status = 'paid' THEN ui.paid_amount_zec ELSE 0 END), 0) as total_received_zec,
    COALESCE(SUM(CASE WHEN w.status = 'sent' THEN w.amount_zec ELSE 0 END), 0) as total_withdrawn_zec,
    (COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.paid_amount_zec ELSE 0 END), 0) + 
     COALESCE(SUM(CASE WHEN ui.status = 'paid' THEN ui.paid_amount_zec ELSE 0 END), 0)) - 
    COALESCE(SUM(CASE WHEN w.status = 'sent' THEN w.amount_zec ELSE 0 END), 0) as available_balance_zec,
    COUNT(DISTINCT i.id) + COUNT(DISTINCT ui.id) as total_invoices,
    COUNT(DISTINCT w.id) as total_withdrawals
FROM users u
LEFT JOIN invoices i ON u.id = i.user_id
LEFT JOIN unified_invoices ui ON u.id = ui.user_id
LEFT JOIN withdrawals w ON u.id = w.user_id
GROUP BY u.id, u.email, u.name;

-- Create comprehensive invoice view (combines legacy and unified)
CREATE OR REPLACE VIEW all_invoices AS
SELECT 
    'legacy' as invoice_type,
    i.id,
    i.user_id,
    u.email,
    u.name as user_name,
    i.type,
    i.amount_zec,
    'transparent' as payment_method,
    'mainnet' as network,
    i.z_address as payment_address,
    'transparent' as address_type,
    i.item_id,
    NULL as description,
    i.status,
    i.paid_amount_zec,
    i.paid_txid,
    i.paid_at,
    i.expires_at,
    i.created_at,
    i.created_at as updated_at
FROM invoices i
JOIN users u ON i.user_id = u.id

UNION ALL

SELECT 
    'unified' as invoice_type,
    ui.id,
    ui.user_id,
    u.email,
    u.name as user_name,
    ui.type,
    ui.amount_zec,
    ui.payment_method,
    ui.network,
    ui.payment_address,
    ui.address_type,
    ui.item_id,
    ui.description,
    ui.status,
    ui.paid_amount_zec,
    ui.paid_txid,
    ui.paid_at,
    ui.expires_at,
    ui.created_at,
    ui.updated_at
FROM unified_invoices ui
JOIN users u ON ui.user_id = u.id
ORDER BY created_at DESC;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_invoices_updated_at 
    BEFORE UPDATE ON unified_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_payment_preferences_updated_at 
    BEFORE UPDATE ON user_payment_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment preferences for existing users
INSERT INTO user_payment_preferences (user_id, preferred_method, preferred_network)
SELECT id, 'auto', 'testnet' FROM users 
WHERE id NOT IN (SELECT user_id FROM user_payment_preferences);

COMMENT ON TABLE unified_invoices IS 'Centralized invoice system supporting all payment methods';
COMMENT ON TABLE user_payment_preferences IS 'User preferences for payment methods and wallets';
COMMENT ON VIEW payment_method_stats IS 'Statistics on payment method usage and revenue';
COMMENT ON VIEW all_invoices IS 'Combined view of legacy and unified invoices';