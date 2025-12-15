-- Add password_hash column to users table for authentication
-- This migration adds support for user registration and login

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add comment
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for user authentication';
