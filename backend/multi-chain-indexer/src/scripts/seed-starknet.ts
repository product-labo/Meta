
import { dbService } from '../services/DbService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const STARKNET_CHAIN_ID = 5; // Internal DB ID

const CONTRACTS = [
    {
        chainId: STARKNET_CHAIN_ID,
        address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // Starknet ETH
        name: 'ETH (Starknet)',
        category: 'TOKEN'
    }
];

async function seed() {
    console.log('Seeding Starknet...');
    const client = await dbService.getClient();

    try {
        // 1. Chains
        const rpc = process.env.STARKNET_RPC_PRIMARY;
        if (!rpc) {
            console.error('STARKNET_RPC_PRIMARY missing in .env');
            process.exit(1);
        }

        await client.query(
            `INSERT INTO mc_chains (id, name, rpc_urls, is_active) 
             VALUES ($1, $2, $3, true)
             ON CONFLICT (name) DO UPDATE SET rpc_urls = $3`,
            [STARKNET_CHAIN_ID, 'starknet', [rpc]]
        );
        console.log(`Seeded Chain: Starknet (ID ${STARKNET_CHAIN_ID})`);

        // 2. Contracts
        for (const contract of CONTRACTS) {
            await client.query(
                `INSERT INTO mc_registry (chain_id, address, name, category, target_functions)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (chain_id, address) DO NOTHING`,
                [contract.chainId, contract.address, contract.name, contract.category, '["balanceOf"]']
            );
            console.log(`Seeded Contract: ${contract.name}`);
        }

    } catch (e) {
        console.error('Seed Failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

seed();
