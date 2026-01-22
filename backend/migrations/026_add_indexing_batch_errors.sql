-- Migration 026: Add indexing batch errors table for manual retry functionality
-- This table tracks failed batches that can be retried manually

CREATE TABLE IF NOT EXISTS indexing_batch_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  start_block BIGINT NOT NULL,
  end_block BIGINT NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet_id, start_block, end_block)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_errors_wallet ON indexing_batch_errors(wallet_id);
CREATE INDEX IF NOT EXISTS idx_batch_errors_blocks ON indexing_batch_errors(start_block, end_block);
CREATE INDEX IF NOT EXISTS idx_batch_errors_created ON indexing_batch_errors(created_at);

-- Add retry-related fields to indexing_jobs table
ALTER TABLE indexing_jobs 
ADD COLUMN IF NOT EXISTS is_retry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS failed_batch_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rpc_endpoint_status JSONB;

COMMENT ON TABLE indexing_batch_errors IS 'Tracks failed indexing batches that can be retried manually';
COMMENT ON COLUMN indexing_batch_errors.retry_count IS 'Number of times this batch has been retried';
COMMENT ON COLUMN indexing_jobs.is_retry IS 'Whether this job is a retry of failed batches';
COMMENT ON COLUMN indexing_jobs.failed_batch_count IS 'Number of failed batches being retried';
COMMENT ON COLUMN indexing_jobs.rpc_endpoint_status IS 'Status of RPC endpoints during indexing';