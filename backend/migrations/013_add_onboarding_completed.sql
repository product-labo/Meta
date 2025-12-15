-- =====================================================
-- MIGRATION 013: ADD ONBOARDING COMPLETED FIELD
-- =====================================================
-- Adds onboarding_completed field to users table to track
-- whether a user has completed the initial onboarding flow

-- Add onboarding_completed field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed 
ON users(onboarding_completed) 
WHERE onboarding_completed = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN users.onboarding_completed IS 'Indicates whether user has completed the initial onboarding flow (project + wallet setup)';
