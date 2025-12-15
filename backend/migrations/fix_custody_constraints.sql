-- Add unique constraint to prevent duplicate wallets for the same user/project combination
-- First, clean up any existing duplicates (keeping the most recent one)
DELETE FROM custodial_wallets a USING custodial_wallets b
WHERE a.id < b.id
AND a.user_id = b.user_id
AND (a.project_id = b.project_id OR (a.project_id IS NULL AND b.project_id IS NULL));

-- Now add the constraint
ALTER TABLE custodial_wallets
ADD CONSTRAINT uq_custodial_wallets_user_project 
UNIQUE NULLS NOT DISTINCT (user_id, project_id);
