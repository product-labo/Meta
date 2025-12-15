-- Migration 004: Alternative Wallet Systems (WebZjs and zcash-devtool)
-- Add tables for WebZjs and zcash-devtool wallet configurations

-- WebZjs wallets table
CREATE TABLE IF NOT EXISTS webzjs_wallets (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    network VARCHAR(20) NOT NULL CHECK (network IN ('mainnet', 'testnet')),
    mnemonic_encrypted TEXT, -- Base64 encoded mnemonic (use proper encryption in production)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WebZjs invoices table
CREATE TABLE IF NOT EXISTS webzjs_invoices (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id INTEGER REFERENCES webzjs_wallets(id) ON DELETE SET NULL,
    amount_zec DECIMAL(16, 8) NOT NULL,
    item_id VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    paid_amount_zec DECIMAL(16, 8),
    paid_txid VARCHAR(255),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- zcash-devtool wallets table
CREATE TABLE IF NOT EXISTS devtool_wallets (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    network VARCHAR(20) NOT NULL CHECK (network IN ('mainnet', 'testnet')),
    wallet_path VARCHAR(500) NOT NULL, -- File system path to wallet
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- zcash-devtool invoices table
CREATE TABLE IF NOT EXISTS devtool_invoices (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id INTEGER REFERENCES devtool_wallets(id) ON DELETE SET NULL,
    amount_zec DECIMAL(16, 8) NOT NULL,
    item_id VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    paid_amount_zec DECIMAL(16, 8),
    paid_txid VARCHAR(255),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webzjs_wallets_user_id ON webzjs_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_webzjs_wallets_network ON webzjs_wallets(network);
CREATE INDEX IF NOT EXISTS idx_webzjs_invoices_user_id ON webzjs_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_webzjs_invoices_status ON webzjs_invoices(status);
CREATE INDEX IF NOT EXISTS idx_webzjs_invoices_wallet_id ON webzjs_invoices(wallet_id);

CREATE INDEX IF NOT EXISTS idx_devtool_wallets_user_id ON devtool_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_devtool_wallets_network ON devtool_wallets(network);
CREATE INDEX IF NOT EXISTS idx_devtool_invoices_user_id ON devtool_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_devtool_invoices_status ON devtool_invoices(status);
CREATE INDEX IF NOT EXISTS idx_devtool_invoices_wallet_id ON devtool_invoices(wallet_id);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_webzjs_wallets_updated_at BEFORE UPDATE ON webzjs_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webzjs_invoices_updated_at BEFORE UPDATE ON webzjs_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devtool_wallets_updated_at BEFORE UPDATE ON devtool_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devtool_invoices_updated_at BEFORE UPDATE ON devtool_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE webzjs_wallets IS 'WebZjs browser-based wallet configurations';
COMMENT ON TABLE webzjs_invoices IS 'Invoices for WebZjs browser-based payments';
COMMENT ON TABLE devtool_wallets IS 'zcash-devtool CLI wallet configurations';
COMMENT ON TABLE devtool_invoices IS 'Invoices for zcash-devtool CLI-based payments';

COMMENT ON COLUMN webzjs_wallets.mnemonic_encrypted IS 'Base64 encoded mnemonic - use proper encryption in production';
COMMENT ON COLUMN devtool_wallets.wallet_path IS 'File system path to zcash-devtool wallet directory';