-- Group D: Advanced Features Database Tables
-- API Management, Collaboration Features, and supporting tables

-- API Keys table for API Management
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    permissions JSON DEFAULT '["read"]',
    rate_limit INTEGER DEFAULT 1000,
    allowed_origins JSON DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- API Usage Logs for tracking API key usage
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    request_size INTEGER,
    response_size INTEGER
);

-- Project Team table for collaboration
CREATE TABLE IF NOT EXISTS project_team (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    permissions JSON DEFAULT '["read"]',
    joined_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Project Invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    permissions JSON DEFAULT '["read"]',
    invite_token VARCHAR(255) NOT NULL UNIQUE,
    invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    message TEXT,
    accepted_at TIMESTAMP,
    accepted_by INTEGER REFERENCES users(id)
);

-- Shared Projects table for project sharing
CREATE TABLE IF NOT EXISTS shared_projects (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_token VARCHAR(255) NOT NULL UNIQUE,
    share_type VARCHAR(20) DEFAULT 'link' CHECK (share_type IN ('link', 'embed')),
    permissions JSON DEFAULT '["read"]',
    password_hash VARCHAR(255),
    expires_at TIMESTAMP,
    description TEXT,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP
);

-- Project Activity Logs for audit trail
CREATE TABLE IF NOT EXISTS project_activity_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details JSON,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Add subscription/plan columns to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_tier') THEN
        ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'api_key_limit') THEN
        ALTER TABLE users ADD COLUMN api_key_limit INTEGER DEFAULT 3;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rate_limit_per_key') THEN
        ALTER TABLE users ADD COLUMN rate_limit_per_key INTEGER DEFAULT 1000;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'monthly_request_limit') THEN
        ALTER TABLE users ADD COLUMN monthly_request_limit INTEGER DEFAULT 10000;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);

CREATE INDEX IF NOT EXISTS idx_project_team_project_id ON project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON project_team(user_id);

CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);

CREATE INDEX IF NOT EXISTS idx_shared_projects_project_id ON shared_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_shared_projects_shared_by ON shared_projects(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_projects_token ON shared_projects(share_token);

CREATE INDEX IF NOT EXISTS idx_project_activity_logs_project_id ON project_activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_logs_user_id ON project_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_logs_timestamp ON project_activity_logs(timestamp);

-- Insert sample data for testing
INSERT INTO api_keys (user_id, name, key_hash, key_prefix, status, permissions, rate_limit) 
SELECT 1, 'Development Key', 'sample_hash_' || generate_random_uuid(), 'mk_dev', 'active', '["read", "write"]', 5000
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT DO NOTHING;

INSERT INTO project_team (project_id, user_id, role, permissions)
SELECT 1, 2, 'editor', '["read", "write", "export_data"]'
WHERE EXISTS (SELECT 1 FROM projects WHERE id = 1) 
  AND EXISTS (SELECT 1 FROM users WHERE id = 2)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Add some sample activity logs
INSERT INTO project_activity_logs (project_id, user_id, action, details)
SELECT 1, 1, 'project_created', '{"description": "Initial project setup"}'
WHERE EXISTS (SELECT 1 FROM projects WHERE id = 1)
ON CONFLICT DO NOTHING;

COMMIT;