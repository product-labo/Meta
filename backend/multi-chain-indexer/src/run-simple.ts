import dotenv from 'dotenv';
import path from 'path';
import { rpcPool } from './services/RpcPool';
import { dataRotator } from './services/DataRotator';
import { ChainWorkerSimple } from './workers/ChainWorkerSimple';
import { dbService } from './services/DbService';

// Ensure env loaded
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('=== Multi-Chain Indexer (Simplified - No Cache/Kafka) ===');

    try {
        // 1. Initialize Infrastructure
        console.log('[Main] Initializing RPC Pool...');
        await rpcPool.initialize();
        console.log('[Main] RPC Pool initialized successfully');

        // 2. Start Rotation Cycle
        console.log('[Main] Starting data rotator...');
        await dataRotator.start();
        console.log('[Main] Data rotator started successfully');

        // 3. Start Workers
        console.log('[Main] Checking active chains...');
        const chains = await dbService.query('SELECT id, name FROM mc_chains WHERE is_active = true');

        if (chains.rowCount === 0) {
            console.log('[Main] No active chains found. Adding default chains...');
            
            // Add some default chains
            await dbService.query(`
                INSERT INTO mc_chains (id, name, rpc_url, is_active) VALUES 
                (1, 'Ethereum', 'https://ethereum-rpc.publicnode.com', true),
                (2, 'StarkNet', 'https://rpc.starknet.lava.build', true)
                ON CONFLICT (id) DO UPDATE SET is_active = true
            `);
            
            const chainsAfter = await dbService.query('SELECT id, name FROM mc_chains WHERE is_active = true');
            console.log(`[Main] Added ${chainsAfter.rowCount} default chains`);
        }

        const activeChains = await dbService.query('SELECT id, name FROM mc_chains WHERE is_active = true');
        console.log(`[Indexer] Spawning ${activeChains.rowCount} workers...`);

        const workers: ChainWorkerSimple[] = [];

        for (const row of activeChains.rows) {
            console.log(`[Indexer] Starting worker for Chain: ${row.name} (ID: ${row.id})`);
            const worker = new ChainWorkerSimple(row.id);
            workers.push(worker);
            worker.start();
        }

        console.log('[Main] All workers started. Indexing in progress...');
        console.log('[Main] Press Ctrl+C to stop');

        // Keep process alive handling signals
        process.on('SIGINT', async () => {
            console.log('\n[Main] Stopping workers...');
            workers.forEach(w => w.stop());
            console.log('[Main] Indexer stopped');
            process.exit(0);
        });

    } catch (error) {
        console.error('Fatal Indexer Error:', error);
        process.exit(1);
    }
}

main();
