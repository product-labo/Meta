-- Add social login columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Create custodial_wallets table
CREATE TABLE IF NOT EXISTS custodial_wallets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) NOT NULL,
    project_id uuid REFERENCES projects(id),
    address VARCHAR(255) NOT NULL,
    public_key VARCHAR(255) NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    iv VARCHAR(255) NOT NULL,
    network VARCHAR(20) DEFAULT 'mainnet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custodial_wallets_user_id ON custodial_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
