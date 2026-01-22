-- Migration: 025_fix_abi_selector_length
-- Description: Increase selector field length to accommodate event topics (66 chars)
-- Requirements: 8.1, 8.2

-- Increase selector field length from VARCHAR(10) to VARCHAR(66) to accommodate event topics
ALTER TABLE contract_abi_features 
ALTER COLUMN selector TYPE VARCHAR(66);

-- Update comment to reflect that selector can be either function selector or event topic
COMMENT ON COLUMN contract_abi_features.selector IS 'Function selector (10 chars) or event topic (66 chars)';