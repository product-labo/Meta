"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const RpcPool_1 = require("./src/services/RpcPool");
const DataRotator_1 = require("./src/services/DataRotator");
const ChainWorkerSimple_1 = require("./src/workers/ChainWorkerSimple");
const DbService_1 = require("./src/services/DbService");
// Ensure env loaded
dotenv_1.default.config({ path: path_1.default.join(__dirname, '.env') });
async function main() {
    console.log('=== Multi-Chain Indexer (Simplified - No Cache/Kafka) ===');
    try {
        // 1. Initialize Infrastructure
        console.log('[Main] Initializing RPC Pool...');
        await RpcPool_1.rpcPool.initialize();
        console.log('[Main] RPC Pool initialized successfully');
        // 2. Start Rotation Cycle
        console.log('[Main] Starting data rotator...');
        await DataRotator_1.dataRotator.start();
        console.log('[Main] Data rotator started successfully');
        // 3. Start Workers
        console.log('[Main] Checking active chains...');
        const chains = await DbService_1.dbService.query('SELECT id, name FROM mc_chains WHERE is_active = true');
        if (chains.rowCount === 0) {
            console.log('[Main] No active chains found. Adding default chains...');
            // Add some default chains
            await DbService_1.dbService.query(`
                INSERT INTO mc_chains (id, name, rpc_url, is_active) VALUES 
                (1, 'Ethereum', 'https://ethereum-rpc.publicnode.com', true),
                (2, 'StarkNet', 'https://rpc.starknet.lava.build', true)
                ON CONFLICT (id) DO UPDATE SET is_active = true
            `);
            const chainsAfter = await DbService_1.dbService.query('SELECT id, name FROM mc_chains WHERE is_active = true');
            console.log(`[Main] Added ${chainsAfter.rowCount} default chains`);
        }
        const activeChains = await DbService_1.dbService.query('SELECT id, name FROM mc_chains WHERE is_active = true');
        console.log(`[Indexer] Spawning ${activeChains.rowCount} workers...`);
        const workers = [];
        for (const row of activeChains.rows) {
            console.log(`[Indexer] Starting worker for Chain: ${row.name} (ID: ${row.id})`);
            const worker = new ChainWorkerSimple_1.ChainWorkerSimple(row.id);
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
    }
    catch (error) {
        console.error('Fatal Indexer Error:', error);
        process.exit(1);
    }
}
main();
