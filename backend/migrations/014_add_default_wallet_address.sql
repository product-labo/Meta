-- Migration: Add default_wallet_address to projects table
-- This allows projects to have a default Zcash address for receiving payments

-- Add default_wallet_address column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS default_wallet_address VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_default_wallet 
ON projects(default_wallet_address) 
WHERE default_wallet_address IS NOT NULL;

-- Add comment
COMMENT ON COLUMN projects.default_wallet_address IS 'Default Zcash address for the project (typically the first wallet address added)';

-- Populate default_wallet_address from existing wallets
-- This sets the default address to the first wallet created for each project
UPDATE projects p
SET default_wallet_address = (
  SELECT w.address
  FROM wallets w
  WHERE w.project_id = p.id
  AND w.is_active = true
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE p.default_wallet_address IS NULL;

-- Create a trigger to automatically set default_wallet_address when first wallet is added
CREATE OR REPLACE FUNCTION set_default_wallet_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if this is the first wallet for the project
  IF NOT EXISTS (
    SELECT 1 FROM wallets 
    WHERE project_id = NEW.project_id 
    AND id != NEW.id
  ) THEN
    UPDATE projects 
    SET default_wallet_address = NEW.address
    WHERE id = NEW.project_id 
    AND default_wallet_address IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_default_wallet_address ON wallets;
CREATE TRIGGER trigger_set_default_wallet_address
AFTER INSERT ON wallets
FOR EACH ROW
EXECUTE FUNCTION set_default_wallet_address();
