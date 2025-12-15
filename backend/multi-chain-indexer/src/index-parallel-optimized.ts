import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('=== Optimized Parallel Indexer Starting ===');

    try {
        // Test database connection first
        const { dbService } = require('./services/DbService');
        console.log('[Main] Testing database connection...');
        await dbService.query('SELECT 1');
        console.log('[Main] Database connected successfully');

        // Initialize RPC Pool with retry logic
        const { rpcPool } = require('./services/RpcPool');
        console.log('[Main] Initializing RPC Pool...');
        await rpcPool.initialize();

        // Test Redis connection (optional)
        try {
            const { redisService } = require('./services/RedisService');
            console.log('[Main] Connecting to Redis...');
            await redisService.connect();
        } catch (error) {
            console.warn('[Main] Redis connection failed, continuing without cache:', error.message);
        }

        // Test Kafka connection (optional)
        try {
            const { kafkaService } = require('./services/KafkaService');
            console.log('[Main] Connecting to Kafka...');
            await kafkaService.connectProducer();
        } catch (error) {
            console.warn('[Main] Kafka connection failed, continuing without streaming:', error.message);
        }

        // Start data rotator
        const { dataRotator } = require('./services/DataRotator');
        console.log('[Main] Starting data rotator...');
        await dataRotator.start();

        // Start optimized parallel indexer
        const { OptimizedParallelIndexer } = require('./services/OptimizedParallelIndexer');
        const indexer = new OptimizedParallelIndexer();
        console.log('[Main] Starting optimized parallel indexer...');
        await indexer.start();

        // Handle shutdown
        process.on('SIGINT', async () => {
            console.log('Stopping indexer...');
            indexer.stop();
            process.exit(0);
        });

        console.log('[Main] Indexer started successfully');

    } catch (error) {
        console.error('Fatal Indexer Error:', error);
        process.exit(1);
    }
}

main();
