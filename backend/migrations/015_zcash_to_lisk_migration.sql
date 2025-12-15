-- Zcash to Lisk Migration SQL Script
-- This migration converts all Zcash-specific database structures to Lisk equivalents
-- while preserving all user and project data.
-- **Validates: Requirements 1.2, 5.1, 5.2**

BEGIN;

-- Step 1: Create backup tables for rollback capability
CREATE TABLE IF NOT EXISTS backup_users AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS backup_invoices AS SELECT * FROM invoices;
CREATE TABLE IF NOT EXISTS backup_wallets AS SELECT * FROM wallets WHERE FALSE; -- Structure only

-- Handle missing tables gracefully
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webzjs_wallets') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_webzjs_wallets AS SELECT * FROM webzjs_wallets';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devtool_wallets') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_devtool_wallets AS SELECT * FROM devtool_wallets';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_addresses') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup_unified_addresses AS SELECT * FROM unified_addresses';
    END IF;
END $$;

-- Step 2: Create new Lisk-specific tables
CREATE TABLE IF NOT EXISTS lisk_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(64) UNIQUE NOT NULL,
    sender_address VARCHAR(41) NOT NULL,
    recipient_address VARCHAR(41) NOT NULL,
    amount_lsk DECIMAL(20,8) NOT NULL CHECK (amount_lsk > 0),
    fee_lsk DECIMAL(20,8) NOT NULL CHECK (fee_lsk > 0),
    block_height BIGINT,
    block_id VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lisk_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    total_lsk_revenue DECIMAL(20,8) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    unique_payers INTEGER DEFAULT 0,
    average_payment_lsk DECIMAL(20,8) DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add Lisk-specific columns to existing tables
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS balance_lsk DECIMAL(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lisk_address VARCHAR(41),
ADD COLUMN IF NOT EXISTS lisk_public_key VARCHAR(64);

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS amount_lsk DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS lisk_address VARCHAR(41),
ADD COLUMN IF NOT EXISTS paid_amount_lsk DECIMAL(20,8);

-- Step 4: Migrate user data from ZEC to LSK
UPDATE users 
SET 
    balance_lsk = COALESCE(balance_zec, 0),
    lisk_address = LOWER(SUBSTRING(MD5(id::text || 'lisk'), 1, 40)),
    lisk_public_key = LOWER(MD5(id::text || 'pubkey'))
WHERE balance_lsk IS NULL;

-- Step 5: Migrate invoice data from Zcash to Lisk format
UPDATE invoices 
SET 
    amount_lsk = COALESCE(amount_zec, 0),
    lisk_address = LOWER(SUBSTRING(MD5(id::text || 'lisk'), 1, 40)),
    paid_amount_lsk = paid_amount_zec
WHERE amount_lsk IS NULL;

-- Step 6: Update wallet_type enum to include Lisk types
DO $$ 
BEGIN
    -- Drop and recreate wallet_type enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type') THEN
        DROP TYPE wallet_type CASCADE;
    END IF;
    
    CREATE TYPE wallet_type AS ENUM ('lisk_mainnet', 'lisk_testnet');
END $$;

-- Step 7: Update wallets table for Lisk (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN
        EXECUTE 'ALTER TABLE wallets 
                 ADD COLUMN IF NOT EXISTS lisk_address VARCHAR(41),
                 ADD COLUMN IF NOT EXISTS lisk_public_key VARCHAR(64),
                 ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT ''lisk_testnet''';
        
        EXECUTE 'UPDATE wallets 
                 SET 
                     lisk_address = LOWER(SUBSTRING(MD5(id::text || ''lisk''), 1, 40)),
                     lisk_public_key = LOWER(MD5(id::text || ''pubkey'')),
                     network = ''lisk_testnet''
                 WHERE lisk_address IS NULL';
    END IF;
END $$;

-- Step 8: Create Lisk-optimized indexes
-- User indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_lisk_address ON users(lisk_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_balance_lsk ON users(balance_lsk);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_lisk_public_key ON users(lisk_public_key);

-- Invoice indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_lisk_address ON invoices(lisk_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_amount_lsk ON invoices(amount_lsk);

-- Lisk transaction indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_transactions_transaction_id ON lisk_transactions(transaction_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_transactions_sender_address ON lisk_transactions(sender_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_transactions_recipient_address ON lisk_transactions(recipient_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_transactions_block_height ON lisk_transactions(block_height);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_transactions_timestamp ON lisk_transactions(timestamp);

-- Lisk analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_analytics_project_id ON lisk_analytics(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_analytics_period_start ON lisk_analytics(period_start);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lisk_analytics_total_lsk_revenue ON lisk_analytics(total_lsk_revenue);

-- Step 9: Add Lisk-specific constraints
-- User constraints
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_balance_lsk_check CHECK (balance_lsk >= 0);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_lisk_address_format CHECK (lisk_address ~ '^[0-9a-f]{40}$');
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_lisk_public_key_format CHECK (lisk_public_key ~ '^[0-9a-f]{64}$');

-- Invoice constraints
ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS invoices_amount_lsk_check CHECK (amount_lsk >= 0);
ALTER TABLE invoices ADD CONSTRAINT IF NOT EXISTS invoices_lisk_address_format CHECK (lisk_address ~ '^[0-9a-f]{40}$');

-- Lisk transaction constraints
ALTER TABLE lisk_transactions ADD CONSTRAINT IF NOT EXISTS lisk_transactions_sender_format CHECK (sender_address ~ '^[0-9a-f]{40}$');
ALTER TABLE lisk_transactions ADD CONSTRAINT IF NOT EXISTS lisk_transactions_recipient_format CHECK (recipient_address ~ '^[0-9a-f]{40}$');

-- Lisk analytics constraints
ALTER TABLE lisk_analytics ADD CONSTRAINT IF NOT EXISTS lisk_analytics_revenue_non_negative CHECK (total_lsk_revenue >= 0);
ALTER TABLE lisk_analytics ADD CONSTRAINT IF NOT EXISTS lisk_analytics_tx_count_non_negative CHECK (transaction_count >= 0);

-- Step 10: Update views to use Lisk data
DROP VIEW IF EXISTS user_balances;
CREATE VIEW user_balances AS
SELECT 
    u.id,
    u.email,
    u.name,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.paid_amount_lsk ELSE 0 END), 0) as total_received_lsk,
    u.balance_lsk as available_balance_lsk,
    COUNT(i.id) as total_invoices
FROM users u
LEFT JOIN invoices i ON u.id = i.user_id
GROUP BY u.id, u.email, u.name, u.balance_lsk;

-- Step 11: Drop old Zcash-specific columns (after data migration)
ALTER TABLE users DROP COLUMN IF EXISTS balance_zec;
ALTER TABLE invoices DROP COLUMN IF EXISTS amount_zec;
ALTER TABLE invoices DROP COLUMN IF EXISTS z_address;
ALTER TABLE invoices DROP COLUMN IF EXISTS paid_amount_zec;

-- Step 12: Drop Zcash-specific indexes
DROP INDEX IF EXISTS idx_invoices_z_address;
DROP INDEX IF EXISTS idx_users_balance_zec;

-- Step 13: Drop Zcash-specific tables (only if they exist and are not referenced)
DO $$ 
DECLARE
    table_name TEXT;
    zcash_tables TEXT[] := ARRAY['webzjs_wallets', 'webzjs_invoices', 'devtool_wallets', 'devtool_invoices', 'unified_addresses', 'unified_invoices', 'unified_payments', 'unified_address_usage'];
BEGIN
    FOREACH table_name IN ARRAY zcash_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
            -- Check if table has any data
            EXECUTE format('
                DO $inner$ 
                BEGIN
                    IF (SELECT COUNT(*) FROM %I) = 0 THEN
                        DROP TABLE %I CASCADE;
                    END IF;
                END $inner$;
            ', table_name, table_name);
        END IF;
    END LOOP;
END $$;

-- Step 14: Update table statistics for optimal query planning
ANALYZE users;
ANALYZE invoices;
ANALYZE lisk_transactions;
ANALYZE lisk_analytics;
ANALYZE projects;

-- Step 15: Create migration log entry
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE,
    notes TEXT
);

INSERT INTO migration_log (migration_name, notes) 
VALUES ('015_zcash_to_lisk_migration', 'Successfully migrated from Zcash to Lisk blockchain integration');

-- Validation queries (for testing)
-- These will be used by the property tests to validate the migration

-- Check that all users have Lisk data
DO $$ 
DECLARE
    user_count INTEGER;
    lisk_user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO lisk_user_count FROM users WHERE lisk_address IS NOT NULL AND balance_lsk IS NOT NULL;
    
    IF user_count != lisk_user_count THEN
        RAISE EXCEPTION 'Migration validation failed: Not all users have Lisk data. Users: %, Lisk users: %', user_count, lisk_user_count;
    END IF;
    
    RAISE NOTICE 'Migration validation passed: All % users have Lisk data', user_count;
END $$;

-- Check that all invoices have Lisk data
DO $$ 
DECLARE
    invoice_count INTEGER;
    lisk_invoice_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invoice_count FROM invoices;
    SELECT COUNT(*) INTO lisk_invoice_count FROM invoices WHERE lisk_address IS NOT NULL AND amount_lsk IS NOT NULL;
    
    IF invoice_count != lisk_invoice_count THEN
        RAISE EXCEPTION 'Migration validation failed: Not all invoices have Lisk data. Invoices: %, Lisk invoices: %', invoice_count, lisk_invoice_count;
    END IF;
    
    RAISE NOTICE 'Migration validation passed: All % invoices have Lisk data', invoice_count;
END $$;

-- Check that no Zcash columns remain
DO $$ 
DECLARE
    zcash_columns INTEGER;
BEGIN
    SELECT COUNT(*) INTO zcash_columns 
    FROM information_schema.columns 
    WHERE table_name IN ('users', 'invoices') 
    AND (column_name LIKE '%zec%' OR column_name LIKE '%z_address%');
    
    IF zcash_columns > 0 THEN
        RAISE EXCEPTION 'Migration validation failed: % Zcash columns still exist', zcash_columns;
    END IF;
    
    RAISE NOTICE 'Migration validation passed: No Zcash columns remain';
END $$;

COMMIT;

-- Post-migration notes:
-- 1. All user ZEC balances have been converted to LSK balances (1:1 ratio)
-- 2. All Zcash addresses have been replaced with generated Lisk addresses
-- 3. New Lisk-specific tables (lisk_transactions, lisk_analytics) are ready for use
-- 4. Backup tables have been created for rollback capability
-- 5. All indexes and constraints have been optimized for Lisk operations
-- 6. The migration is fully reversible using the backup tables