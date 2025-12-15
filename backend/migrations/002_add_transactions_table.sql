-- =====================================================
-- TRANSACTIONS TABLE MIGRATION
-- Version: 002
-- Description: Add transactions table for RPC data storage
-- =====================================================

-- Create transactions table for storing raw RPC transaction data
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txid VARCHAR(64) NOT NULL UNIQUE,
    block_hash VARCHAR(64),
    block_height INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE,
    size INTEGER DEFAULT 0,
    value_out BIGINT DEFAULT 0,
    value_in BIGINT DEFAULT 0,
    fee BIGINT DEFAULT 0,
    tx_type VARCHAR(20) DEFAULT 'normal',
    
    -- Raw transaction data
    raw_data JSONB,
    
    -- Processing status
    processed_for_analytics BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_txid ON transactions(txid);
CREATE INDEX IF NOT EXISTS idx_transactions_block_hash ON transactions(block_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_block_height ON transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_processed ON transactions(processed_for_analytics) WHERE processed_for_analytics = false;

-- Create transaction inputs table
CREATE TABLE IF NOT EXISTS transaction_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txid VARCHAR(64) NOT NULL,
    input_index INTEGER NOT NULL,
    prev_txid VARCHAR(64),
    prev_output_index INTEGER,
    address TEXT,
    value BIGINT DEFAULT 0,
    script_sig TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(txid, input_index)
);

-- Create transaction outputs table  
CREATE TABLE IF NOT EXISTS transaction_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txid VARCHAR(64) NOT NULL,
    output_index INTEGER NOT NULL,
    address TEXT,
    value BIGINT DEFAULT 0,
    script_pubkey TEXT,
    spent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(txid, output_index)
);

-- Create indexes for inputs and outputs
CREATE INDEX IF NOT EXISTS idx_transaction_inputs_txid ON transaction_inputs(txid);
CREATE INDEX IF NOT EXISTS idx_transaction_inputs_address ON transaction_inputs(address) WHERE address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_inputs_prev_txid ON transaction_inputs(prev_txid) WHERE prev_txid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_outputs_txid ON transaction_outputs(txid);
CREATE INDEX IF NOT EXISTS idx_transaction_outputs_address ON transaction_outputs(address) WHERE address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_outputs_spent ON transaction_outputs(spent) WHERE spent = false;

-- Add update trigger for transactions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transactions_updated_at') THEN
        CREATE TRIGGER update_transactions_updated_at
            BEFORE UPDATE ON transactions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create function to save complete transaction with inputs/outputs
CREATE OR REPLACE FUNCTION save_complete_transaction(
    p_txid VARCHAR(64),
    p_block_hash VARCHAR(64),
    p_block_height INTEGER,
    p_timestamp TIMESTAMP WITH TIME ZONE,
    p_size INTEGER,
    p_value_out BIGINT,
    p_value_in BIGINT,
    p_fee BIGINT,
    p_tx_type VARCHAR(20),
    p_raw_data JSONB,
    p_inputs JSONB,
    p_outputs JSONB
)
RETURNS UUID AS $$
DECLARE
    tx_id UUID;
    input_record JSONB;
    output_record JSONB;
BEGIN
    -- Insert main transaction record
    INSERT INTO transactions (
        txid, block_hash, block_height, timestamp, size, 
        value_out, value_in, fee, tx_type, raw_data
    ) VALUES (
        p_txid, p_block_hash, p_block_height, p_timestamp, p_size,
        p_value_out, p_value_in, p_fee, p_tx_type, p_raw_data
    ) 
    ON CONFLICT (txid) DO UPDATE SET
        block_hash = EXCLUDED.block_hash,
        block_height = EXCLUDED.block_height,
        timestamp = EXCLUDED.timestamp,
        size = EXCLUDED.size,
        value_out = EXCLUDED.value_out,
        value_in = EXCLUDED.value_in,
        fee = EXCLUDED.fee,
        tx_type = EXCLUDED.tx_type,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
    RETURNING id INTO tx_id;
    
    -- Delete existing inputs/outputs to avoid duplicates
    DELETE FROM transaction_inputs WHERE txid = p_txid;
    DELETE FROM transaction_outputs WHERE txid = p_txid;
    
    -- Insert inputs
    FOR input_record IN SELECT * FROM jsonb_array_elements(p_inputs)
    LOOP
        INSERT INTO transaction_inputs (
            txid, input_index, prev_txid, prev_output_index, address, value, script_sig
        ) VALUES (
            p_txid,
            (input_record->>'index')::INTEGER,
            input_record->>'prev_txid',
            (input_record->>'prev_index')::INTEGER,
            input_record->>'address',
            (input_record->>'value')::BIGINT,
            input_record->>'script_sig'
        );
    END LOOP;
    
    -- Insert outputs
    FOR output_record IN SELECT * FROM jsonb_array_elements(p_outputs)
    LOOP
        INSERT INTO transaction_outputs (
            txid, output_index, address, value, script_pubkey
        ) VALUES (
            p_txid,
            (output_record->>'index')::INTEGER,
            output_record->>'address',
            (output_record->>'value')::BIGINT,
            output_record->>'script_pubkey'
        );
    END LOOP;
    
    RETURN tx_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE transactions IS 'Raw transaction data from RPC with processing status';
COMMENT ON TABLE transaction_inputs IS 'Transaction inputs with previous output references';
COMMENT ON TABLE transaction_outputs IS 'Transaction outputs with addresses and values';
COMMENT ON FUNCTION save_complete_transaction IS 'Save complete transaction with inputs and outputs in a single call';

SELECT 'Transactions table migration 002 completed successfully' as status;