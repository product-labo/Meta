-- Test database connection and create basic structure
-- Run this manually in your PostgreSQL database

-- Connect to database 'david' as user 'david_user'

-- Test connection
SELECT 'Database connection successful' as status;

-- Create migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check if migration already applied
SELECT * FROM schema_migrations WHERE version = 1;

-- If no results, run the migration:
-- (Copy content from src/database/migrations/001_initial_schema.sql)

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
