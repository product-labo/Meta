-- =====================================================
-- FHE SUPPORT MIGRATION
-- Version: 008
-- Description: Add FHE support to existing tables
-- =====================================================

-- Add FHE metadata table
CREATE TABLE IF NOT EXISTS fhe_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_type VARCHAR(20) NOT NULL CHECK (key_type IN ('client', 'server', 'public')),
    key_data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Add FHE configuration table
CREATE TABLE IF NOT EXISTS fhe_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('integer', 'decimal', 'string', 'boolean')),
    encryption_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(table_name, column_name)
);

-- Insert default FHE configurations
INSERT INTO fhe_config (table_name, column_name, data_type) VALUES
-- Wallet data
('wallets', 'address', 'string'),

-- Transaction data
('transactions', 'value_out', 'decimal'),
('transactions', 'value_in', 'decimal'),
('transactions', 'fee', 'decimal'),

-- Activity metrics
('wallet_activity_metrics', 'transaction_count', 'integer'),
('wallet_activity_metrics', 'total_volume_zatoshi', 'decimal'),
('wallet_activity_metrics', 'total_fees_paid', 'decimal'),
('wallet_activity_metrics', 'transfers_count', 'integer'),
('wallet_activity_metrics', 'swaps_count', 'integer'),
('wallet_activity_metrics', 'bridges_count', 'integer'),
('wallet_activity_metrics', 'shielded_count', 'integer'),

-- Productivity scores
('wallet_productivity_scores', 'total_score', 'integer'),
('wallet_productivity_scores', 'retention_score', 'integer'),
('wallet_productivity_scores', 'adoption_score', 'integer'),
('wallet_productivity_scores', 'activity_score', 'integer'),
('wallet_productivity_scores', 'diversity_score', 'integer'),

-- Processed transactions
('processed_transactions', 'value_zatoshi', 'decimal'),
('processed_transactions', 'fee_zatoshi', 'decimal'),
('processed_transactions', 'usd_value_at_time', 'decimal'),

-- User data (sensitive)
('users', 'email', 'string'),
('users', 'password_hash', 'string')

ON CONFLICT (table_name, column_name) DO NOTHING;

-- Create function to check if column should be encrypted
CREATE OR REPLACE FUNCTION should_encrypt_column(p_table_name TEXT, p_column_name TEXT)
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM fhe_config 
        WHERE table_name = p_table_name 
        AND column_name = p_column_name 
        AND encryption_enabled = TRUE
    );
END;
$ LANGUAGE plpgsql;

-- Create function to get column data type for encryption
CREATE OR REPLACE FUNCTION get_encryption_data_type(p_table_name TEXT, p_column_name TEXT)
RETURNS TEXT AS $
BEGIN
    RETURN (
        SELECT data_type FROM fhe_config 
        WHERE table_name = p_table_name 
        AND column_name = p_column_name 
        AND encryption_enabled = TRUE
    );
END;
$ LANGUAGE plpgsql;

-- Add encrypted data audit table
CREATE TABLE IF NOT EXISTS fhe_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('encrypt', 'decrypt', 'compute')),
    record_id UUID,
    user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- Create indexes for FHE tables
CREATE INDEX IF NOT EXISTS idx_fhe_keys_type ON fhe_keys(key_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fhe_config_table ON fhe_config(table_name);
CREATE INDEX IF NOT EXISTS idx_fhe_audit_table_column ON fhe_audit_log(table_name, column_name);
CREATE INDEX IF NOT EXISTS idx_fhe_audit_timestamp ON fhe_audit_log(timestamp);

-- Add comments
COMMENT ON TABLE fhe_keys IS 'Stores FHE cryptographic keys for encryption/decryption operations';
COMMENT ON TABLE fhe_config IS 'Configuration for which columns should be encrypted with FHE';
COMMENT ON TABLE fhe_audit_log IS 'Audit trail for all FHE operations';

-- Create FHE performance monitoring view
CREATE OR REPLACE VIEW fhe_performance_stats AS
SELECT 
    table_name,
    column_name,
    operation,
    COUNT(*) as operation_count,
    COUNT(CASE WHEN success THEN 1 END) as success_count,
    COUNT(CASE WHEN NOT success THEN 1 END) as error_count,
    ROUND(100.0 * COUNT(CASE WHEN success THEN 1 END) / COUNT(*), 2) as success_rate,
    MIN(timestamp) as first_operation,
    MAX(timestamp) as last_operation
FROM fhe_audit_log
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY table_name, column_name, operation
ORDER BY operation_count DESC;

COMMENT ON VIEW fhe_performance_stats IS 'Performance statistics for FHE operations in the last 24 hours';

SELECT 'FHE support migration 008 completed successfully' as status;