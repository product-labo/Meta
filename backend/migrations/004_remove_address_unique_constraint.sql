-- Remove unique constraint on z_address to allow treasury address reuse
-- This is needed when using a single treasury address for all payments

-- Drop the unique constraint on z_address
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_z_address_key;

-- Keep the index for performance but remove uniqueness
DROP INDEX IF EXISTS idx_invoices_z_address;
CREATE INDEX idx_invoices_z_address ON invoices(z_address);

-- Add a comment to document this change
COMMENT ON COLUMN invoices.z_address IS 'Zcash address for payment - can be treasury address (non-unique)';