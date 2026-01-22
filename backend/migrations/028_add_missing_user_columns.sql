-- Add missing columns to users table for authentication functionality
-- Migration: 028_add_missing_user_columns.sql

-- Add is_verified column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add phone_number column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add otp_secret column for OTP verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_secret VARCHAR(10);

-- Add roles column as JSON array
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;

-- Add onboarding_completed column
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add avatar_url column for social login
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add social login provider IDs
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(255);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- Make password_hash nullable since we support OTP-only signup
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraints for social login IDs
ALTER TABLE users ADD CONSTRAINT unique_google_id UNIQUE (google_id);
ALTER TABLE users ADD CONSTRAINT unique_github_id UNIQUE (github_id);

-- Update existing users to be verified (for backward compatibility)
UPDATE users SET is_verified = true WHERE is_verified IS NULL;

COMMENT ON COLUMN users.is_verified IS 'Whether the user has verified their email/phone';
COMMENT ON COLUMN users.phone_number IS 'User phone number for OTP verification';
COMMENT ON COLUMN users.otp_secret IS 'Temporary OTP code for verification';
COMMENT ON COLUMN users.roles IS 'User roles as JSON array (startup, investor, etc.)';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed onboarding flow';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.google_id IS 'Google OAuth provider ID';
COMMENT ON COLUMN users.github_id IS 'GitHub OAuth provider ID';