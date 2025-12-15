-- Migration 005: Unified Address System
-- Add tables for unified addresses that work with both WebZjs and zcash-devtool

-- Unified addresses table (ZIP-316 compliant)
CREATE TABLE IF NOT EXISTS unified_addresses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    unified_address VARCHAR(500) NOT NULL, -- ZIP-316 unified address
    network VARCHAR(20) NOT NULL CHECK (network IN ('mainnet', 'testnet')),
    diversifier VARCHAR(64), -- 32-byte F4JSh diversifier (hex)
    include_transparent BOOLEAN DEFAULT FALSE,
    include_sapling BOOLEAN DEFAULT TRUE,
    include_orchard BOOLEAN DEFAULT TRUE,
    webzjs_wallet_id INTEGER REFERENCES webzjs_wallets(id) ON DELETE SET NULL,
    devtool_wallet_id INTEGER REFERENCES devtool_wallets(id) ON DELETE SET NULL,
    receivers_data JSONB, -- Store individual receiver data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unified invoices table
CREATE TABLE IF NOT EXISTS unified_invoices (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unified_address_id INTEGER NOT NULL REFERENCES unified_addresses(id) ON DELETE CASCADE,
    amount_zec DECIMAL(16, 8) NOT NULL,
    description TEXT,
    payment_methods JSONB DEFAULT '["webzjs", "devtool"]'::jsonb, -- Which alternatives can pay
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    paid_amount_zec DECIMAL(16, 8),
    paid_txid VARCHAR(255),
    paid_method VARCHAR(50), -- Which alternative was used for payment
    paid_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment tracking table (for monitoring payments from different alternatives)
CREATE TABLE IF NOT EXISTS unified_payments (
    id SERIAL PRIMARY KEY,
    unified_invoice_id INTEGER NOT NULL REFERENCES unified_invoices(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL, -- 'webzjs', 'devtool', etc.
    txid VARCHAR(255),
    amount_zec DECIMAL(16, 8) NOT NULL,
    confirmations INTEGER DEFAULT 0,
    block_height INTEGER,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'detected' CHECK (status IN ('detected', 'confirmed', 'failed'))
);

-- Address usage tracking (for analytics)
CREATE TABLE IF NOT EXISTS unified_address_usage (
    id SERIAL PRIMARY KEY,
    unified_address_id INTEGER NOT NULL REFERENCES unified_addresses(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL, -- 'invoice_created', 'payment_received', etc.
    alternative_used VARCHAR(50), -- 'webzjs', 'devtool', etc.
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unified_addresses_user_id ON unified_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_addresses_unified_address ON unified_addresses(unified_address);
CREATE INDEX IF NOT EXISTS idx_unified_addresses_network ON unified_addresses(network);
CREATE INDEX IF NOT EXISTS idx_unified_addresses_diversifier ON unified_addresses(diversifier);

CREATE INDEX IF NOT EXISTS idx_unified_invoices_user_id ON unified_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_invoices_address_id ON unified_invoices(unified_address_id);
CREATE INDEX IF NOT EXISTS idx_unified_invoices_status ON unified_invoices(status);
CREATE INDEX IF NOT EXISTS idx_unified_invoices_expires_at ON unified_invoices(expires_at);

CREATE INDEX IF NOT EXISTS idx_unified_payments_invoice_id ON unified_payments(unified_invoice_id);
CREATE INDEX IF NOT EXISTS idx_unified_payments_txid ON unified_payments(txid);
CREATE INDEX IF NOT EXISTS idx_unified_payments_method ON unified_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_unified_payments_status ON unified_payments(status);

CREATE INDEX IF NOT EXISTS idx_unified_usage_address_id ON unified_address_usage(unified_address_id);
CREATE INDEX IF NOT EXISTS idx_unified_usage_type ON unified_address_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_unified_usage_alternative ON unified_address_usage(alternative_used);

-- Update triggers for updated_at timestamps
CREATE TRIGGER update_unified_addresses_updated_at 
    BEFORE UPDATE ON unified_addresses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_invoices_updated_at 
    BEFORE UPDATE ON unified_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for easier querying
CREATE OR REPLACE VIEW unified_invoice_details AS
SELECT 
    ui.*,
    ua.unified_address,
    ua.name as address_name,
    ua.network,
    ua.include_transparent,
    ua.include_sapling,
    ua.include_orchard,
    u.email as user_email,
    u.name as user_name
FROM unified_invoices ui
JOIN unified_addresses ua ON ui.unified_address_id = ua.id
JOIN users u ON ui.user_id = u.id;

CREATE OR REPLACE VIEW unified_payment_summary AS
SELECT 
    ua.user_id,
    ua.network,
    CASE 
        WHEN ua.include_orchard AND ua.include_sapling AND NOT ua.include_transparent THEN '2025_standard'
        WHEN ua.include_orchard AND ua.include_sapling AND ua.include_transparent THEN 'full_compatibility'
        ELSE 'custom'
    END as address_type,
    COUNT(ui.id) as total_invoices,
    COUNT(CASE WHEN ui.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN ui.status = 'pending' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN ui.status = 'expired' THEN 1 END) as expired_invoices,
    SUM(CASE WHEN ui.status = 'paid' THEN ui.paid_amount_zec ELSE 0 END) as total_paid_amount,
    AVG(CASE WHEN ui.status = 'paid' THEN ui.paid_amount_zec END) as avg_payment_amount
FROM unified_addresses ua
LEFT JOIN unified_invoices ui ON ua.id = ui.unified_address_id
GROUP BY ua.user_id, ua.network, address_type;

-- Functions for unified address operations
CREATE OR REPLACE FUNCTION get_unified_address_compatibility(address_text VARCHAR)
RETURNS JSONB AS $$
DECLARE
    compatibility JSONB;
    addr_type VARCHAR;
BEGIN
    -- Determine address type
    IF address_text LIKE 't1%' OR address_text LIKE 't3%' THEN
        addr_type := 'transparent';
    ELSIF address_text LIKE 'zs1%' THEN
        addr_type := 'sapling';
    ELSIF address_text LIKE 'u1%' THEN
        addr_type := 'unified';
    ELSE
        addr_type := 'unknown';
    END IF;
    
    -- Set compatibility based on address type
    compatibility := jsonb_build_object(
        'address_type', addr_type,
        'webzjs_compatible', 
        CASE 
            WHEN addr_type IN ('transparent', 'sapling', 'unified') THEN true
            ELSE false
        END,
        'devtool_compatible',
        CASE 
            WHEN addr_type IN ('transparent', 'sapling', 'unified') THEN true
            ELSE false
        END,
        'recommended_for_unified', 
        CASE 
            WHEN addr_type IN ('transparent', 'unified') THEN true
            ELSE false
        END
    );
    
    RETURN compatibility;
END;
$$ LANGUAGE plpgsql;

-- Function to track address usage
CREATE OR REPLACE FUNCTION track_unified_address_usage(
    addr_id INTEGER,
    usage_type_param VARCHAR,
    alternative_param VARCHAR DEFAULT NULL,
    metadata_param JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO unified_address_usage (
        unified_address_id, 
        usage_type, 
        alternative_used, 
        metadata
    ) VALUES (
        addr_id, 
        usage_type_param, 
        alternative_param, 
        metadata_param
    );
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE unified_addresses IS 'Addresses that work with both WebZjs and zcash-devtool';
COMMENT ON TABLE unified_invoices IS 'Invoices that can be paid using either alternative';
COMMENT ON TABLE unified_payments IS 'Payment tracking from different alternatives';
COMMENT ON TABLE unified_address_usage IS 'Analytics for unified address usage';

COMMENT ON COLUMN unified_addresses.receivers_data IS 'JSON array of individual receiver data (type, data, etc.)';
COMMENT ON COLUMN unified_invoices.payment_methods IS 'JSON array of supported payment alternatives';
COMMENT ON COLUMN unified_invoices.paid_method IS 'Which alternative was actually used for payment';

-- Sample data for testing (optional)
-- INSERT INTO unified_addresses (user_id, address, address_type, label, network, address_info) 
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN',
--     'transparent',
--     'Test Unified Address',
--     'testnet',
--     '{"webzjs_compatible": true, "devtool_compatible": true, "type": "transparent"}'::jsonb
-- );