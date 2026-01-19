-- =============================================================================
-- GROUP B DATABASE TABLES
-- Tables needed for Group B functionality (User Experience Features)
-- =============================================================================

-- B1: Notification System Tables
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- B2: Task Management Tables
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- B3: Data Export System Tables
CREATE TABLE IF NOT EXISTS export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'csv',
    date_from TIMESTAMP,
    date_to TIMESTAMP,
    filters JSONB,
    include_fields TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
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

CREATE TABLE IF NOT EXISTS scheduled_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    template_id VARCHAR(100) NOT NULL,
    schedule_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    schedule_time TIME,
    email_recipients JSONB,
    format VARCHAR(10) DEFAULT 'csv',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- B4: Profile Management Tables
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    location VARCHAR(255),
    website VARCHAR(500),
    social_links JSONB,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_layout JSONB,
    default_project_view VARCHAR(50) DEFAULT 'grid',
    chart_preferences JSONB,
    notification_frequency VARCHAR(20) DEFAULT 'immediate',
    auto_refresh_interval INTEGER DEFAULT 30, -- seconds
    data_retention_days INTEGER DEFAULT 90,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- B5: Enhanced Project Management Tables
CREATE TABLE IF NOT EXISTS project_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_user_id ON export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_status ON export_requests(status);
CREATE INDEX IF NOT EXISTS idx_export_requests_created_at ON export_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_user_id ON scheduled_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_next_run ON scheduled_exports(next_run_at);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_user_id ON project_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_project_id ON project_bookmarks(project_id);

-- Add comments for documentation
COMMENT ON TABLE notification_settings IS 'User notification preferences and settings';
COMMENT ON TABLE task_comments IS 'Comments on tasks for collaboration';
COMMENT ON TABLE export_requests IS 'Data export requests and their status';
COMMENT ON TABLE scheduled_exports IS 'Scheduled recurring data exports';
COMMENT ON TABLE profiles IS 'Extended user profile information';
COMMENT ON TABLE user_settings IS 'User application settings and preferences';
COMMENT ON TABLE user_preferences IS 'User interface and behavior preferences';
COMMENT ON TABLE project_bookmarks IS 'User bookmarked projects for quick access';