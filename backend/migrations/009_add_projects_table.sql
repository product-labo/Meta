-- =====================================================
-- PROJECTS TABLE MIGRATION
-- Adds comprehensive project management support
-- =====================================================

-- Create enum for project categories (Web3 focus)
DO $$ BEGIN
    CREATE TYPE project_category AS ENUM (
        'defi',
        'social_fi',
        'gamefi',
        'nft',
        'infrastructure',
        'governance',
        'cefi',
        'metaverse',
        'dao',
        'identity',
        'storage',
        'ai_ml',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for project status
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM (
        'draft',
        'active',
        'paused',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic project info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category project_category NOT NULL DEFAULT 'other',
    status project_status NOT NULL DEFAULT 'draft',
    
    -- Project metadata
    website_url VARCHAR(500),
    github_url VARCHAR(500),
    logo_url VARCHAR(500),
    tags TEXT[], -- Array of tags for flexible categorization
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    launched_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_website_url CHECK (website_url IS NULL OR website_url ~ '^https?://.*'),
    CONSTRAINT valid_github_url CHECK (github_url IS NULL OR github_url ~ '^https?://github.com/.*'),
    CONSTRAINT valid_launch_date CHECK (launched_at IS NULL OR launched_at >= created_at)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Basic lookup indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_category_status ON projects(category, status);
CREATE INDEX IF NOT EXISTS idx_projects_launch_date ON projects(launched_at) WHERE launched_at IS NOT NULL;

-- GIN index for array tags for fast tag searching
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

-- Partial index for active projects (common use case)
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(created_at) WHERE status = 'active';

-- Text search index for name and description search
CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp (reuse existing function)
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically set launched_at when status changes to active
CREATE OR REPLACE FUNCTION set_project_launch_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Set launched_at when project becomes active and launched_at is not already set
    IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.launched_at IS NULL THEN
        NEW.launched_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_project_launch_timestamp ON projects;
CREATE TRIGGER set_project_launch_timestamp
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION set_project_launch_date();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get project count by user
CREATE OR REPLACE FUNCTION get_user_project_count(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM projects WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql;

-- Function to search projects by text
CREATE OR REPLACE FUNCTION search_projects(search_query TEXT)
RETURNS TABLE(
    project_id UUID,
    project_name VARCHAR(255),
    project_description TEXT,
    category project_category,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.category,
        ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), 
                plainto_tsquery('english', search_query)) as relevance
    FROM projects p
    WHERE to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) 
          @@ plainto_tsquery('english', search_query)
    ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE projects IS 'Stores comprehensive information about Web3 projects created by users';
COMMENT ON COLUMN projects.tags IS 'Array of tags for flexible categorization and filtering';
COMMENT ON COLUMN projects.launched_at IS 'Timestamp when the project was officially launched';
COMMENT ON COLUMN projects.status IS 'Current lifecycle status of the project';
COMMENT ON COLUMN projects.category IS 'Web3 category classification of the project';
