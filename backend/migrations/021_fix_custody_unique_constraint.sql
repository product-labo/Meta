-- Migration: 021_fix_custody_unique_constraint
-- Description: Update unique constraint to allow multiple wallets (one per network) for the same user/project

-- Drop the old constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_custodial_wallets_user_project') THEN
        ALTER TABLE custodial_wallets DROP CONSTRAINT uq_custodial_wallets_user_project;
    END IF;
END $$;

-- Drop the implicit unique index if it exists (sometimes created by UNIQUE constraint)
DROP INDEX IF EXISTS uq_custodial_wallets_user_project;

-- Add the new constraint including 'network'
-- We treat NULL project_id as a distinct value for "User's Global Wallet"
-- Postgres UNIQUE constraint with NULLs allows duplicates by default unless we use NULLS NOT DISTINCT (PG 15+) or partial indexes.
-- Boardling seems to use PG15+ based on previous files, but let's be safe with a unique index which is more compatible.

CREATE UNIQUE INDEX idx_custodial_wallets_unique_user_project_network 
ON custodial_wallets (user_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'), network);

-- Alternatively, if we are sure about PG version:
-- ALTER TABLE custodial_wallets ADD CONSTRAINT uq_custodial_wallets_user_project_network UNIQUE NULLS NOT DISTINCT (user_id, project_id, network);
