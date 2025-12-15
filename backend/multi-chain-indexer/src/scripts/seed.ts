import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from indexer root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
};

async function seedData() {
    console.log('=== Seeding Multi-Chain Indexer Data ===');
    console.log(`Target: ${config.database} @ ${config.host}`);

    const client = new Client(config);

    try {
        await client.connect();

        // Insert supported chains
        console.log('Inserting chains...');
        await client.query(`
            INSERT INTO mc_chains (name, rpc_urls, block_time_sec, is_active) VALUES
            ('ethereum', ARRAY['https://ethereum-rpc.publicnode.com'], 12, true),
            ('starknet', ARRAY['https://rpc.starknet.lava.build', 'https://starknet-rpc.publicnode.com'], 30, true),
            ('polygon', ARRAY['https://polygon-bor-rpc.publicnode.com'], 2, true),
            ('bsc', ARRAY['https://bsc-rpc.publicnode.com'], 3, true),
            ('base', ARRAY['https://base-rpc.publicnode.com'], 2, true)
            ON CONFLICT (name) DO NOTHING
        `);

        // Insert sample contracts
        console.log('Inserting sample contracts...');
        await client.query(`
            INSERT INTO mc_registry (chain_id, address, category, name, monitor_events, priority) VALUES
            ((SELECT id FROM mc_chains WHERE name = 'ethereum'), '0xA0b86a33E6441E6C673A4a1C3CC2C4C8F98FB8A4', 'defi', 'Uniswap V3 Factory', true, 1),
            ((SELECT id FROM mc_chains WHERE name = 'ethereum'), '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'token', 'DAI Stablecoin', true, 1),
            ((SELECT id FROM mc_chains WHERE name = 'ethereum'), '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', 'defi', 'Compound cDAI', true, 1),
            ((SELECT id FROM mc_chains WHERE name = 'polygon'), '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 'token', 'DAI on Polygon', true, 1),
            ((SELECT id FROM mc_chains WHERE name = 'polygon'), '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'token', 'USDC on Polygon', true, 1),
            ((SELECT id FROM mc_chains WHERE name = 'bsc'), '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 'token', 'BUSD', true, 1),
            ((SELECT id FROM mc_chains WHERE name = 'bsc'), '0x55d398326f99059fF775485246999027B3197955', 'token', 'USDT BSC', true, 1)
            ON CONFLICT (chain_id, address) DO NOTHING
        `);

        // Check what we have
        const chainsResult = await client.query('SELECT * FROM mc_chains WHERE is_active = true');
        const contractsResult = await client.query('SELECT COUNT(*) as count FROM mc_registry');
        
        console.log(`✅ Seeded ${chainsResult.rowCount} active chains`);
        console.log(`✅ Total contracts in registry: ${contractsResult.rows[0].count}`);
        
        console.log('\nActive chains:');
        chainsResult.rows.forEach(chain => {
            console.log(`  - ${chain.name} (ID: ${chain.id})`);
        });

    } catch (error: any) {
        console.error('Seeding Failed:', error.message);
    } finally {
        await client.end();
    }
}

seedData();