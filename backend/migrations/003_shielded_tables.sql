-- Migration: Add shielded wallet and invoice tables
-- This migration adds support for shielded operations when Zaino is available

-- Shielded wallets table
CREATE TABLE IF NOT EXISTS shielded_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL DEFAULT 'Shielded Wallet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shielded invoices table
CREATE TABLE IF NOT EXISTS shielded_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES shielded_wallets(id) ON DELETE SET NULL,
    amount_zec DECIMAL(16, 8) NOT NULL CHECK (amount_zec > 0),
    z_address VARCHAR(255) NOT NULL,
    item_id VARCHAR(255),
    memo TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    paid_amount_zec DECIMAL(16, 8),
    paid_txid VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shielded_wallets_user_id ON shielded_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_shielded_wallets_address ON shielded_wallets(address);
CREATE INDEX IF NOT EXISTS idx_shielded_invoices_user_id ON shielded_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_shielded_invoices_wallet_id ON shielded_invoices(wallet_id);
CREATE INDEX IF NOT EXISTS idx_shielded_invoices_status ON shielded_invoices(status);
CREATE INDEX IF NOT EXISTS idx_shielded_invoices_z_address ON shielded_invoices(z_address);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shielded_wallets_updated_at 
    BEFORE UPDATE ON shielded_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shielded_invoices_updated_at 
    BEFORE UPDATE ON shielded_invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE shielded_wallets IS 'Shielded wallets for users - requires Zaino indexer';
COMMENT ON TABLE shielded_invoices IS 'Shielded invoices using z-addresses - requires Zaino indexer';
COMMENT ON COLUMN shielded_invoices.memo IS 'Encrypted memo field for shielded transactions';