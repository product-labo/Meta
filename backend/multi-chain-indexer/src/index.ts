
import dotenv from 'dotenv';
import path from 'path';
import { rpcPool } from './services/RpcPool';
import { dataRotator } from './services/DataRotator';
import { ChainWorker } from './workers/ChainWorker';
import { dbService } from './services/DbService';

// Ensure env loaded
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('=== Multi-Chain Streaming Indexer Starting ===');

    try {
        // 1. Initialize Infrastrucutre
        console.log('[Main] Initializing RPC Pool...');
        await rpcPool.initialize();
        console.log('[Main] RPC Pool initialized successfully');

        // 1b. Initialize Cache & Streaming
        const { redisService } = require('./services/RedisService');
        const { kafkaService } = require('./services/KafkaService');

        console.log('[Main] Connecting to Redis...');
        await redisService.connect();

        console.log('[Main] Connecting to Kafka...');
        await kafkaService.connectProducer();

        // 2. Start Rotation Cycle (Wipe & New Cycle)
        console.log('[Main] Starting data rotator...');
        await dataRotator.start();
        console.log('[Main] Data rotator started successfully');

        // 3. Start Workers
        const chains = await dbService.query('SELECT id FROM mc_chains WHERE is_active = true');

        console.log(`[Indexer] Spawning ${chains.rowCount} workers...`);

        const workers: ChainWorker[] = [];

        for (const row of chains.rows) {
            const worker = new ChainWorker(row.id);
            workers.push(worker);
            worker.start(); // This runs the loop async
            console.log(`[Indexer] Worker started for Chain ID ${row.id}`);
        }

        // Keep process alive handling signals
        process.on('SIGINT', async () => {
            console.log('Stopping workers...');
            workers.forEach(w => w.stop());
            process.exit(0);
        });

    } catch (error) {
        console.error('Fatal Indexer Error:', error);
        process.exit(1);
    }
}

main();
