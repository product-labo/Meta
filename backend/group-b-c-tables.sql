-- Group B & C: Missing Database Tables
-- Notifications, Exports, Profile Management, OAuth, and Onboarding

-- Notification Settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_alerts BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    transaction_alerts BOOLEAN DEFAULT true,
    security_alerts BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    weekly_reports BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Export Requests table
CREATE TABLE IF NOT EXISTS export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) DEFAULT 'csv',
    date_from TIMESTAMP,
    date_to TIMESTAMP,
    filters JSON,
    include_fields TEXT[],
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    file_path TEXT,
    file_size BIGINT,
    download_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    last_downloaded_at TIMESTAMP
);

-- Scheduled Exports table
CREATE TABLE IF NOT EXISTS scheduled_exports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
    schedule_time TIME,
    email_recipients JSON,
    format VARCHAR(10) DEFAULT 'csv',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Profiles table (enhanced)
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    location VARCHAR(255),
    website VARCHAR(255),
    social_links JSON DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User Settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    data_sharing BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_layout JSON DEFAULT '{}',
    default_project_view VARCHAR(50) DEFAULT 'grid',
    chart_preferences JSON DEFAULT '{}',
    notification_frequency VARCHAR(20) DEFAULT 'immediate',
    auto_refresh_interval INTEGER DEFAULT 300,
    data_retention_days INTEGER DEFAULT 90,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- OAuth Providers table
CREATE TABLE IF NOT EXISTS oauth_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Startup Details table (enhanced)
CREATE TABLE IF NOT EXISTS startup_details (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_size VARCHAR(50),
    industry VARCHAR(100),
    website VARCHAR(255),
    description TEXT,
    founding_year INTEGER,
    location VARCHAR(255),
    funding_stage VARCHAR(50),
    contract_address VARCHAR(255),
    chain VARCHAR(50),
    category VARCHAR(100),
    utility_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Onboarding Status table
CREATE TABLE IF NOT EXISTS onboarding_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) DEFAULT 'role_selection',
    role_selected BOOLEAN DEFAULT false,
    role_type VARCHAR(50),
    company_details_completed BOOLEAN DEFAULT false,
    wallet_connected BOOLEAN DEFAULT false,
    project_created BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    additional_info JSON DEFAULT '{}',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User Wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    wallet_type VARCHAR(50) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    connected_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, wallet_address, chain)
);

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
    
    -- Add last_login_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_export_requests_user_id ON export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_status ON export_requests(status);
CREATE INDEX IF NOT EXISTS idx_export_requests_created_at ON export_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);

CREATE INDEX IF NOT EXISTS idx_onboarding_status_user_id ON onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_current_step ON onboarding_status(current_step);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Insert sample data for testing
INSERT INTO notification_settings (user_id, email_alerts, push_notifications)
SELECT 1, true, true
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, display_name, bio)
SELECT 1, 'Test User', 'Sample user profile for testing'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_settings (user_id, theme, language)
SELECT 1, 'light', 'en'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO onboarding_status (user_id, role_selected, role_type)
SELECT 1, true, 'startup'
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;