-- Simple transactions table creation
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txid VARCHAR(64) NOT NULL UNIQUE,
    block_hash VARCHAR(64),
    block_height INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE,
    size INTEGER DEFAULT 0,
    value_out BIGINT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_txid ON transactions(txid);
CREATE INDEX IF NOT EXISTS idx_transactions_block_height ON transactions(block_height);

SELECT 'Simple transactions table created successfully' as status;