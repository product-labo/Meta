-- Migration: Add chain column to wallets table
-- Default to 'lisk' for existing records

BEGIN;

-- 1. Add column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='chain') THEN
        ALTER TABLE wallets ADD COLUMN chain VARCHAR(50) NOT NULL DEFAULT 'lisk';
    END IF;
END $$;

-- 2. Drop old constraint if exists (name might vary, trying standard naming convention)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_project_id_address_key;

-- 3. Add new unique constraint including chain
-- This allows same address to be added for different chains (e.g. EVM address on Lisk and Ethereum)
ALTER TABLE wallets ADD CONSTRAINT wallets_project_id_address_chain_key UNIQUE (project_id, address, chain);

COMMIT;
