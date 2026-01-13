-- Migration: Create Watchlist and Alerts Tables
-- Description: Creates user-specific watchlist and alert functionality
-- Date: 2024-12-31

-- Create watchlist table for user project tracking
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL, -- Contract address or project identifier
    project_name VARCHAR(255), -- Cached project name for performance
    project_category VARCHAR(100), -- Cached category for filtering
    added_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate entries for same user-project combination
    UNIQUE(user_id, project_id)
);

-- Create alerts table for user-specific alert configurations
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL, -- Contract address or project identifier
    
    -- Alert configuration
    type VARCHAR(50) NOT NULL CHECK (type IN ('adoption', 'retention', 'revenue', 'feature_usage', 'wallet_anomalies')),
    condition VARCHAR(50) NOT NULL CHECK (condition IN ('above', 'below', 'equals', 'change')),
    threshold DECIMAL(15,2), -- Numeric threshold value
    threshold_unit VARCHAR(20), -- Unit: 'percent', 'absolute', 'usd', etc.
    
    -- Alert frequency and status
    frequency VARCHAR(20) NOT NULL DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'weekly', 'monthly')),
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITHOUT TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create alert_history table for tracking triggered alerts
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL,
    
    -- Alert trigger details
    triggered_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    alert_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(15,2),
    actual_value DECIMAL(15,2),
    message TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_at TIMESTAMP WITHOUT TIME ZONE,
    resolved_at TIMESTAMP WITHOUT TIME ZONE
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_project_id ON watchlist(project_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_project_id ON alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_frequency ON alerts(frequency);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_watchlist_updated_at 
    BEFORE UPDATE ON watchlist 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at 
    BEFORE UPDATE ON alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional - can be removed in production)
-- This assumes user ID 1 exists from the authentication system
DO $$
BEGIN
    -- Only insert if users table has data
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        -- Get the first user ID for sample data
        INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
        SELECT 
            (SELECT id FROM users LIMIT 1),
            '0x1234567890abcdef1234567890abcdef12345678',
            'DeFi Protocol',
            'DeFi'
        WHERE NOT EXISTS (
            SELECT 1 FROM watchlist 
            WHERE project_id = '0x1234567890abcdef1234567890abcdef12345678'
        );
        
        INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
        SELECT 
            (SELECT id FROM users LIMIT 1),
            '0xabcdef1234567890abcdef1234567890abcdef12',
            'NFT Marketplace',
            'NFT'
        WHERE NOT EXISTS (
            SELECT 1 FROM watchlist 
            WHERE project_id = '0xabcdef1234567890abcdef1234567890abcdef12'
        );
        
        -- Sample alerts
        INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency)
        SELECT 
            (SELECT id FROM users LIMIT 1),
            '0x1234567890abcdef1234567890abcdef12345678',
            'retention',
            'below',
            20.00,
            'percent',
            'immediate'
        WHERE NOT EXISTS (
            SELECT 1 FROM alerts 
            WHERE project_id = '0x1234567890abcdef1234567890abcdef12345678' 
            AND type = 'retention'
        );
        
        INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency)
        SELECT 
            (SELECT id FROM users LIMIT 1),
            '0xabcdef1234567890abcdef1234567890abcdef12',
            'adoption',
            'above',
            25.00,
            'percent',
            'weekly'
        WHERE NOT EXISTS (
            SELECT 1 FROM alerts 
            WHERE project_id = '0xabcdef1234567890abcdef1234567890abcdef12' 
            AND type = 'adoption'
        );
    END IF;
END $$;

-- Verify tables were created successfully
SELECT 'Watchlist and Alerts tables created successfully!' as status;