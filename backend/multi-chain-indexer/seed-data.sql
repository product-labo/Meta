-- Seed data for multi-chain indexer

-- Insert supported chains
INSERT INTO mc_chains (name, rpc_urls, block_time_sec, is_active) VALUES
('ethereum', ARRAY['https://ethereum-rpc.publicnode.com'], 12, true),
('starknet', ARRAY['https://rpc.starknet.lava.build', 'https://starknet-rpc.publicnode.com'], 30, true),
('polygon', ARRAY['https://polygon-bor-rpc.publicnode.com'], 2, true),
('bsc', ARRAY['https://bsc-rpc.publicnode.com'], 3, true),
('base', ARRAY['https://base-rpc.publicnode.com'], 2, true)
ON CONFLICT (name) DO NOTHING;

-- Insert some sample contracts to monitor (popular DeFi contracts)
INSERT INTO mc_registry (chain_id, address, category, name, monitor_events, priority) VALUES
-- Ethereum contracts
((SELECT id FROM mc_chains WHERE name = 'ethereum'), '0xA0b86a33E6441E6C673A4a1C3CC2C4C8F98FB8A4', 'defi', 'Uniswap V3 Factory', true, 1),
((SELECT id FROM mc_chains WHERE name = 'ethereum'), '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'token', 'DAI Stablecoin', true, 1),
((SELECT id FROM mc_chains WHERE name = 'ethereum'), '0xA0b86a33E6441E6C673A4a1C3CC2C4C8F98FB8A4', 'defi', 'Compound cDAI', true, 1),

-- Polygon contracts  
((SELECT id FROM mc_chains WHERE name = 'polygon'), '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 'token', 'DAI on Polygon', true, 1),
((SELECT id FROM mc_chains WHERE name = 'polygon'), '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'token', 'USDC on Polygon', true, 1),

-- BSC contracts
((SELECT id FROM mc_chains WHERE name = 'bsc'), '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 'token', 'BUSD', true, 1),
((SELECT id FROM mc_chains WHERE name = 'bsc'), '0x55d398326f99059fF775485246999027B3197955', 'token', 'USDT BSC', true, 1)
ON CONFLICT (chain_id, address) DO NOTHING;