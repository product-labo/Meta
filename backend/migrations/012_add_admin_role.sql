-- =====================================================
-- ADD ADMIN ROLE TO USERS TABLE
-- =====================================================
-- This migration adds an is_admin field to support
-- admin permission checking for authorization

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Indicates if the user has admin privileges for accessing admin endpoints';
