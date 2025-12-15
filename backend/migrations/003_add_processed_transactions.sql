-- Add processed transactions table for analytics
CREATE TABLE IF NOT EXISTS processed_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- Transaction identification
    txid VARCHAR(64) NOT NULL,
    block_height INTEGER,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Enhanced classification
    tx_type TEXT NOT NULL CHECK (tx_type IN ('transfer', 'swap', 'bridge', 'shielded', 'contract', 'mint', 'burn')),
    tx_subtype TEXT CHECK (tx_subtype IN ('incoming', 'outgoing', 'self', 'multi_party')),
    
    -- Value and fee analysis
    value_zatoshi BIGINT DEFAULT 0,
    fee_zatoshi BIGINT DEFAULT 0,
    usd_value_at_time DECIMAL(12,2),
    
    -- Behavioral context
    counterparty_address TEXT,
    counterparty_type TEXT CHECK (counterparty_type IN ('exchange', 'defi', 'wallet', 'contract', 'unknown')),
    feature_used TEXT,
    
    -- Sequence analysis
    sequence_position INTEGER,
    session_id UUID,
    time_since_previous_tx_minutes INTEGER,
    
    -- Privacy analysis (for shielded transactions)
    is_shielded BOOLEAN DEFAULT FALSE,
    shielded_pool_entry BOOLEAN DEFAULT FALSE,
    shielded_pool_exit BOOLEAN DEFAULT FALSE,
    
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(wallet_id, txid)
);

-- Create indexes for processed transactions
CREATE INDEX IF NOT EXISTS idx_processed_tx_wallet ON processed_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_processed_tx_txid ON processed_transactions(txid);
CREATE INDEX IF NOT EXISTS idx_processed_tx_type ON processed_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_processed_tx_timestamp ON processed_transactions(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_processed_tx_shielded ON processed_transactions(is_shielded) WHERE is_shielded = true;

-- Composite indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_processed_tx_wallet_timestamp ON processed_transactions(wallet_id, block_timestamp);
CREATE INDEX IF NOT EXISTS idx_processed_tx_wallet_type ON processed_transactions(wallet_id, tx_type);

SELECT 'Processed transactions table created successfully' as status;