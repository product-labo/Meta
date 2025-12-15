-- Add subscription management fields to users table
-- This migration adds support for free trials, premium subscriptions, and data monetization

-- Add subscription status enum
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('free', 'premium', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add subscription fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS balance_zec DECIMAL(16,8) DEFAULT 0 CHECK (balance_zec >= 0);

-- Add indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires ON users(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed) WHERE onboarding_completed = FALSE;

-- Add comments
COMMENT ON COLUMN users.subscription_status IS 'Current subscription tier: free (trial), premium, or enterprise';
COMMENT ON COLUMN users.subscription_expires_at IS 'Expiration date for current subscription (NULL for permanent)';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed the onboarding flow';
COMMENT ON COLUMN users.balance_zec IS 'User balance in ZEC from data monetization earnings';
