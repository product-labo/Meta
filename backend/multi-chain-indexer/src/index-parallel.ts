import dotenv from 'dotenv';
import path from 'path';
import { rpcPool } from './services/RpcPool';
import { dataRotator } from './services/DataRotator';
import { parallelIndexer } from './services/ParallelIndexer';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('=== Parallel Multi-Chain Indexer Starting ===');

    try {
        // Initialize infrastructure
        console.log('[Main] Initializing RPC Pool...');
        await rpcPool.initialize();

        // Initialize cache & streaming
        const { redisService } = require('./services/RedisService');
        const { kafkaService } = require('./services/KafkaService');

        console.log('[Main] Connecting to Redis...');
        await redisService.connect();

        console.log('[Main] Connecting to Kafka...');
        await kafkaService.connectProducer();

        // Start data rotator
        console.log('[Main] Starting data rotator...');
        await dataRotator.start();

        // Start parallel indexer (replaces individual ChainWorkers)
        console.log('[Main] Starting parallel indexer...');
        await parallelIndexer.start();

        // Handle shutdown
        process.on('SIGINT', async () => {
            console.log('Stopping parallel indexer...');
            parallelIndexer.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('Fatal Indexer Error:', error);
        process.exit(1);
    }
}

main();
