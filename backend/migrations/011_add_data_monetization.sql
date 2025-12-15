-- Migration: Add Data Monetization Tables
-- Description: Creates tables for data access grants and earnings tracking
-- Requirements: 11.1, 11.2, 11.3, 11.4, 11.5

-- Create data access grants table
-- Tracks which users have purchased access to which data packages
CREATE TABLE IF NOT EXISTS data_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_package_id TEXT NOT NULL, -- project_id or wallet_id
    data_type VARCHAR(50) NOT NULL DEFAULT 'project_analytics', -- 'project_analytics', 'wallet_analytics', 'comparison_data'
    invoice_id INTEGER REFERENCES unified_invoices(id),
    amount_paid_zec DECIMAL(16,8) NOT NULL DEFAULT 0,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one active grant per buyer per data package
    CONSTRAINT unique_buyer_data_package UNIQUE (buyer_user_id, data_package_id)
);

-- Create data owner earnings table
-- Tracks earnings from data monetization for data owners
CREATE TABLE IF NOT EXISTS data_owner_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_package_id TEXT NOT NULL,
    data_type VARCHAR(50) NOT NULL DEFAULT 'project_analytics',
    amount_zec DECIMAL(16,8) NOT NULL, -- 70% of payment
    platform_fee_zec DECIMAL(16,8) NOT NULL, -- 30% of payment
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES unified_invoices(id),
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_access_grants_buyer 
ON data_access_grants(buyer_user_id);

CREATE INDEX IF NOT EXISTS idx_data_access_grants_owner 
ON data_access_grants(data_owner_id);

CREATE INDEX IF NOT EXISTS idx_data_access_grants_package 
ON data_access_grants(data_package_id);

CREATE INDEX IF NOT EXISTS idx_data_access_grants_expires 
ON data_access_grants(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_owner_earnings_user 
ON data_owner_earnings(user_id);

CREATE INDEX IF NOT EXISTS idx_data_owner_earnings_package 
ON data_owner_earnings(data_package_id);

CREATE INDEX IF NOT EXISTS idx_data_owner_earnings_buyer 
ON data_owner_earnings(buyer_user_id);

-- Add comment to tables
COMMENT ON TABLE data_access_grants IS 'Tracks purchased data access grants for users';
COMMENT ON TABLE data_owner_earnings IS 'Tracks earnings from data monetization (70/30 split)';

-- Add comments to columns
COMMENT ON COLUMN data_access_grants.data_package_id IS 'ID of the data package (project_id or wallet_id)';
COMMENT ON COLUMN data_access_grants.data_type IS 'Type of data: project_analytics, wallet_analytics, or comparison_data';
COMMENT ON COLUMN data_access_grants.expires_at IS 'Access expiration date (typically 1 month from grant)';

COMMENT ON COLUMN data_owner_earnings.amount_zec IS 'Data owner share (70% of payment)';
COMMENT ON COLUMN data_owner_earnings.platform_fee_zec IS 'Platform fee (30% of payment)';
