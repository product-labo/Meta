-- Migration 001: Add Analytics and Metrics Tables
-- This migration adds all the missing tables needed for the analytics platform

-- =====================================================
-- PROJECT METRICS AND ANALYTICS TABLES
-- =====================================================

-- Enhanced project metrics table (replacing the basic one)
CREATE TABLE IF NOT EXISTS project_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Core Metrics
    total_active_wallets INTEGER DEFAULT 0,
    total_volume NUMERIC(36, 18) DEFAULT 0,
    total_revenue NUMERIC(36, 18) DEFAULT 0,
    retention_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Transaction Metrics
    total_transactions BIGINT DEFAULT 0,
    successful_transactions BIGINT DEFAULT 0,
    failed_transactions BIGINT DEFAULT 0,
    average_gas_fee NUMERIC(36, 18) DEFAULT 0,
    
    -- User Metrics
    total_customers INTEGER DEFAULT 0,
    daily_active_users INTEGER DEFAULT 0,
    weekly_active_users INTEGER DEFAULT 0,
    monthly_active_users INTEGER DEFAULT 0,
    customer_retention_rate_percent DECIMAL(5, 2) DEFAULT 0,
    
    -- Revenue Metrics
    total_revenue_eth NUMERIC(36, 18) DEFAULT 0,
    total_revenue_usd NUMERIC(16, 2) DEFAULT 0,
    
    -- Computed Scores
    health_score INTEGER DEFAULT 0,
    productivity_score INTEGER DEFAULT 0,
    growth_score INTEGER DEFAULT 0,
    
    -- JSON Data Fields
    retention_data JSONB DEFAULT '[]',
    funnel_data JSONB DEFAULT '{}',
    competitor_data JSONB DEFAULT '{}',
    bridge_metrics JSONB DEFAULT '{}',
    activity_metrics JSONB DEFAULT '{}',
    productivity_breakdown JSONB DEFAULT '{}',
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily metrics for historical tracking
CREATE TABLE IF NOT EXISTS project_metrics_daily (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Daily Metrics
    active_wallets INTEGER DEFAULT 0,
    transaction_volume NUMERIC(36, 18) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    revenue NUMERIC(36, 18) DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    
    -- Feature Usage
    feature_usage JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, date)
);

-- =====================================================
-- NOTIFICATION AND ALERT SYSTEM
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info', 'success'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Alert specific data
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    category VARCHAR(50), -- 'bridge_error', 'whale_deposit', 'system_alert', etc.
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'unread', -- 'unread', 'read', 'dismissed', 'resolved'
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- TASK MANAGEMENT SYSTEM
-- =====================================================

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Task Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status and Priority
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    
    -- Dates
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Impact and Verification
    impact VARCHAR(255),
    verification_criteria TEXT,
    
    -- Auto-generation tracking
    auto_generated BOOLEAN DEFAULT FALSE,
    source_alert_id UUID REFERENCES notifications(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USER ANALYTICS AND COHORTS
-- =====================================================

-- User cohorts table
CREATE TABLE IF NOT EXISTS user_cohorts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Cohort Details
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cohort_type VARCHAR(50) NOT NULL, -- 'referral', 'organic', 'paid', 'enterprise'
    
    -- Metrics
    total_users INTEGER DEFAULT 0,
    retention_rate DECIMAL(5, 2) DEFAULT 0,
    revenue_per_user NUMERIC(16, 2) DEFAULT 0,
    platform VARCHAR(50), -- 'web', 'ios', 'android', 'cross-platform'
    
    -- Risk Assessment
    risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User funnel tracking
CREATE TABLE IF NOT EXISTS user_funnel_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    completion_rate DECIMAL(5, 2) DEFAULT 0,
    drop_off_rate DECIMAL(5, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, step_number)
);

-- =====================================================
-- WALLET INTELLIGENCE
-- =====================================================

-- Wallet analytics table
CREATE TABLE IF NOT EXISTS wallet_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    wallet_address VARCHAR(66) NOT NULL,
    
    -- Wallet Metrics
    total_transactions INTEGER DEFAULT 0,
    total_volume NUMERIC(36, 18) DEFAULT 0,
    total_revenue NUMERIC(36, 18) DEFAULT 0,
    
    -- Activity Metrics
    first_transaction_at TIMESTAMP WITH TIME ZONE,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    active_days INTEGER DEFAULT 0,
    
    -- Classification
    wallet_type VARCHAR(50), -- 'whale', 'regular', 'new', 'dormant'
    risk_score INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, wallet_address)
);

-- =====================================================
-- FEATURE ANALYTICS
-- =====================================================

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    feature_name VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    
    -- Performance Metrics
    success_rate DECIMAL(5, 2) DEFAULT 0,
    average_response_time INTEGER DEFAULT 0, -- in milliseconds
    
    -- User Engagement
    retention_impact DECIMAL(5, 2) DEFAULT 0,
    revenue_impact NUMERIC(16, 2) DEFAULT 0,
    
    -- Timestamps
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, feature_name, date)
);

-- =====================================================
-- EXPORT AND REPORTING
-- =====================================================

-- Export requests tracking
CREATE TABLE IF NOT EXISTS export_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Export Details
    export_type VARCHAR(50) NOT NULL, -- 'csv', 'pdf', 'json'
    data_type VARCHAR(50) NOT NULL, -- 'analytics', 'transactions', 'users', 'full'
    
    -- Date Range
    start_date DATE,
    end_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    file_url TEXT,
    file_size INTEGER,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Project Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_project_metrics_project_id ON project_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_updated_at ON project_metrics(updated_at);

-- Daily Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_project_metrics_daily_project_date ON project_metrics_daily(project_id, date);
CREATE INDEX IF NOT EXISTS idx_project_metrics_daily_date ON project_metrics_daily(date);

-- Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Wallet Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_project_id ON wallet_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_wallet_address ON wallet_analytics(wallet_address);

-- Feature Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_feature_analytics_project_date ON feature_analytics(project_id, date);
CREATE INDEX IF NOT EXISTS idx_feature_analytics_feature_name ON feature_analytics(feature_name);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need automatic timestamp updates
CREATE TRIGGER update_project_metrics_updated_at 
    BEFORE UPDATE ON project_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_cohorts_updated_at 
    BEFORE UPDATE ON user_cohorts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_analytics_updated_at 
    BEFORE UPDATE ON wallet_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();