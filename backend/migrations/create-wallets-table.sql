-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL,
    address text NOT NULL,
    type VARCHAR(20) NOT NULL,
    privacy_mode VARCHAR(20) DEFAULT 'private' NOT NULL,
    description text,
    network VARCHAR(20) DEFAULT 'mainnet',
    chain VARCHAR(50) DEFAULT 'lisk',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT wallets_project_id_address_chain_key UNIQUE (project_id, address, chain)
);

-- Comments
COMMENT ON TABLE wallets IS 'Stores wallet configurations for projects';
COMMENT ON COLUMN wallets.type IS 'Wallet type: t (transparent), z (shielded), or u (unified)';
COMMENT ON COLUMN wallets.privacy_mode IS 'Privacy setting: private, public, or monetizable';
