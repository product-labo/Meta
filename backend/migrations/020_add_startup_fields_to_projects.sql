-- =====================================================
-- Add Startup Fields to Projects Table
-- Migration: 020_add_startup_fields_to_projects
-- Description: Adds chain, contract_address, abi, utility to projects
-- =====================================================

DO $$
BEGIN
    -- Add chain column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'chain') THEN
        ALTER TABLE projects ADD COLUMN chain VARCHAR(50);
    END IF;

    -- Add contract_address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'contract_address') THEN
        ALTER TABLE projects ADD COLUMN contract_address VARCHAR(100);
    END IF;

    -- Add abi column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'abi') THEN
        ALTER TABLE projects ADD COLUMN abi TEXT;
    END IF;

    -- Add utility column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'utility') THEN
        ALTER TABLE projects ADD COLUMN utility VARCHAR(50);
    END IF;
END $$;
