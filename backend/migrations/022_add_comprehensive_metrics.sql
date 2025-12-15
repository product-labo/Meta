-- Create project_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Add requested columns
ALTER TABLE project_metrics
ADD COLUMN IF NOT EXISTS retention_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adoption_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS activation_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS churn_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gas_consumed DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fees_generated DECIMAL(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_users_7d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS returning_users_7d INTEGER DEFAULT 0;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS idx_project_metrics_project ON project_metrics(project_id);
