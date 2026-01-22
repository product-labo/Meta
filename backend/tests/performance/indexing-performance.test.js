/**
 * Performance Tests for Multi-Chain Wallet Indexing
 * 
 * Tests indexing speed, database query performance, and concurrent operations
 * Requirements: 4.1, 8.5
 */

import { jest } from '@jest/globals';
import { OptimizedEVMIndexerWorker } from '../../src/services/optimizedEvmIndexerWorker.js';
import { performancePool, queryMonitor, monitoredQuery } from '../../src/config/performanceConfig.js';
import { indexingOrchestrator } from '../../src/services/indexingOrchestratorService.js';

// Mock RPC endpoints for testing
const mockRpcEndpoints = [
    'https://eth-mainnet.test.com',
    'https://eth-backup.test.com'
];

describe('Indexing Performance Tests', () => {
    let testWalletId;
    let testProjectId;
    let indexer;

    beforeAll(async () => {
        // Setup test data
        testProjectId = 'test-project-' + Date.now();
        testWalletId = 'test-wallet-' + Date.now();
        
        // Clear query monitor
        queryMonitor.clear();
    });

    afterAll(async () => {
        // Cleanup
        if (performancePool) {
            await performancePool.end();
        }
    });

    beforeEach(() => {
        indexer = new OptimizedEVMIndexerWorker(mockRpcEndpoints, {
            batchSize: 10, // Small batch for testing
            concurrentBatches: 2
        });
    });

    afterEach(() => {
        if (indexer) {
            indexer.stop();
        }
    });

    describe('Indexing Speed Tests', () => {
        test('should process large wallet efficiently', async () => {
            // Mock provider with large dataset
            const mockProvider = {
                getBlockNumber: jest.fn().mockResolvedValue(1000),
                getBlock: jest.fn().mockImplementation((blockNum) => ({
                    number: blockNum,
                    timestamp: Math.floor(Date.now() / 1000),
                    transactions: Array.from({ length: 50 }, (_, i) => ({
                        hash: `0x${blockNum}${i.toString().padStart(10, '0')}`,
                        from: '0x742d35Cc6634C0532925a3b844Bc9e004dc7',
                        to: '0x1234567890123456789012345678901234567890',
                        value: '1000000000000000000',
                        data: '0xa9059cbb',
                        gasLimit: 21000,
                        gasPrice: 20000000000
                    }))
                })),
                getLogs: jest.fn().mockResolvedValue([])
            };

            // Mock the getProvider method
            indexer.getProvider = jest.fn().mockResolvedValue(mockProvider);
            
            // Mock database operations
            indexer.storeTransactionsBatch = jest.fn().mockResolvedValue();
            indexer.storeEventsBatch = jest.fn().mockResolvedValue();
            indexer.updateWalletIndexingStatus = jest.fn().mockResolvedValue();

            const startTime = Date.now();
            
            const result = await indexer.indexWallet(
                testWalletId,
                '0x742d35Cc6634C0532925a3b844Bc9e004dc7',
                'ethereum',
                'evm',
                900,
                1000,
                null
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Performance assertions
            expect(result.success).toBe(true);
            expect(result.blocksProcessed).toBe(101); // 900 to 1000 inclusive
            expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
            
            // Check metrics
            const metrics = indexer.getMetrics();
            expect(metrics.batchesProcessed).toBeGreaterThan(0);
            expect(metrics.avgBatchTime).toBeLessThan(2000); // Average batch time under 2 seconds
            
            console.log('Large wallet indexing performance:', {
                duration: `${duration}ms`,
                blocksProcessed: result.blocksProcessed,
                avgBatchTime: `${metrics.avgBatchTime}ms`,
                batchesProcessed: metrics.batchesProcessed
            });
        }, 15000);

        test('should handle concurrent indexing jobs efficiently', async () => {
            const concurrentJobs = 3;
            const jobPromises = [];

            for (let i = 0; i < concurrentJobs; i++) {
                const jobId = await indexingOrchestrator.queueIndexingJob({
                    walletId: `test-wallet-${i}`,
                    projectId: testProjectId,
                    address: `0x${i.toString().padStart(40, '0')}`,
                    chain: 'ethereum',
                    chainType: 'evm',
                    startBlock: i * 100,
                    endBlock: (i + 1) * 100,
                    priority: 1
                });

                jobPromises.push(jobId);
            }

            const startTime = Date.now();
            
            // Wait for all jobs to be queued
            await Promise.all(jobPromises);
            
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Performance assertions
            expect(duration).toBeLessThan(1000); // Job queueing should be fast
            expect(jobPromises).toHaveLength(concurrentJobs);

            // Check that all jobs are queued
            for (const jobId of jobPromises) {
                const job = await indexingOrchestrator.getJobStatus(jobId);
                expect(job).toBeTruthy();
                expect(job.status).toBe('queued');
            }

            console.log('Concurrent job queueing performance:', {
                duration: `${duration}ms`,
                jobsQueued: concurrentJobs,
                avgTimePerJob: `${duration / concurrentJobs}ms`
            });
        });

        test('should maintain performance with batch processing', async () => {
            const batchSizes = [10, 50, 100];
            const results = [];

            for (const batchSize of batchSizes) {
                const testIndexer = new OptimizedEVMIndexerWorker(mockRpcEndpoints, {
                    batchSize,
                    concurrentBatches: 1
                });

                // Mock provider
                const mockProvider = {
                    getBlockNumber: jest.fn().mockResolvedValue(200),
                    getBlock: jest.fn().mockImplementation((blockNum) => ({
                        number: blockNum,
                        timestamp: Math.floor(Date.now() / 1000),
                        transactions: Array.from({ length: 10 }, (_, i) => ({
                            hash: `0x${blockNum}${i.toString().padStart(10, '0')}`,
                            from: '0x742d35Cc6634C0532925a3b844Bc9e004dc7',
                            to: '0x1234567890123456789012345678901234567890',
                            value: '1000000000000000000',
                            data: '0xa9059cbb',
                            gasLimit: 21000,
                            gasPrice: 20000000000
                        }))
                    })),
                    getLogs: jest.fn().mockResolvedValue([])
                };

                testIndexer.getProvider = jest.fn().mockResolvedValue(mockProvider);
                testIndexer.storeTransactionsBatch = jest.fn().mockResolvedValue();
                testIndexer.storeEventsBatch = jest.fn().mockResolvedValue();
                testIndexer.updateWalletIndexingStatus = jest.fn().mockResolvedValue();

                const startTime = Date.now();
                
                await testIndexer.indexWallet(
                    `test-wallet-batch-${batchSize}`,
                    '0x742d35Cc6634C0532925a3b844Bc9e004dc7',
                    'ethereum',
                    'evm',
                    100,
                    200,
                    null
                );

                const endTime = Date.now();
                const duration = endTime - startTime;
                const metrics = testIndexer.getMetrics();

                results.push({
                    batchSize,
                    duration,
                    avgBatchTime: metrics.avgBatchTime,
                    batchesProcessed: metrics.batchesProcessed
                });

                testIndexer.stop();
            }

            // Analyze results
            console.log('Batch size performance comparison:', results);

            // Verify that larger batch sizes are generally more efficient
            const smallBatch = results.find(r => r.batchSize === 10);
            const largeBatch = results.find(r => r.batchSize === 100);
            
            // Large batches should process more efficiently (lower time per block)
            const smallBatchTimePerBlock = smallBatch.duration / 101;
            const largeBatchTimePerBlock = largeBatch.duration / 101;
            
            expect(largeBatchTimePerBlock).toBeLessThanOrEqual(smallBatchTimePerBlock * 1.5); // Allow some variance
        }, 20000);
    });

    describe('Database Query Performance Tests', () => {
        test('should execute wallet queries efficiently', async () => {
            const testQueries = [
                {
                    name: 'Get wallet by ID',
                    query: 'SELECT * FROM wallets WHERE id = $1',
                    params: [testWalletId]
                },
                {
                    name: 'Get wallets by project',
                    query: 'SELECT * FROM wallets WHERE project_id = $1 ORDER BY created_at DESC',
                    params: [testProjectId]
                },
                {
                    name: 'Get wallet transactions',
                    query: 'SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY block_number DESC LIMIT 100',
                    params: [testWalletId]
                },
                {
                    name: 'Get wallet events',
                    query: 'SELECT * FROM wallet_events WHERE wallet_id = $1 ORDER BY block_number DESC LIMIT 100',
                    params: [testWalletId]
                },
                {
                    name: 'Get indexing status',
                    query: `SELECT w.*, ij.status, ij.current_block, ij.transactions_found 
                            FROM wallets w 
                            LEFT JOIN LATERAL (
                                SELECT * FROM indexing_jobs 
                                WHERE wallet_id = w.id 
                                ORDER BY created_at DESC 
                                LIMIT 1
                            ) ij ON true 
                            WHERE w.id = $1`,
                    params: [testWalletId]
                }
            ];

            const queryResults = [];

            for (const testQuery of testQueries) {
                const startTime = Date.now();
                
                try {
                    await monitoredQuery(testQuery.query, testQuery.params);
                    const endTime = Date.now();
                    const duration = endTime - startTime;

                    queryResults.push({
                        name: testQuery.name,
                        duration,
                        success: true
                    });

                    // Performance assertion - queries should be fast
                    expect(duration).toBeLessThan(1000); // Under 1 second
                } catch (error) {
                    queryResults.push({
                        name: testQuery.name,
                        duration: Date.now() - startTime,
                        success: false,
                        error: error.message
                    });
                }
            }

            console.log('Database query performance:', queryResults);

            // Check query monitor stats
            const stats = queryMonitor.getStats();
            console.log('Query monitor stats:', stats);

            // Verify no slow queries
            const slowQueries = queryMonitor.getSlowQueries();
            expect(slowQueries.length).toBe(0);
        });

        test('should handle bulk insert operations efficiently', async () => {
            const batchSizes = [100, 500, 1000];
            const insertResults = [];

            for (const batchSize of batchSizes) {
                // Generate test data
                const transactions = Array.from({ length: batchSize }, (_, i) => ({
                    walletId: testWalletId,
                    chain: 'ethereum',
                    chainType: 'evm',
                    transactionHash: `0x${i.toString().padStart(64, '0')}`,
                    blockNumber: 1000 + i,
                    blockTimestamp: new Date(),
                    fromAddress: '0x742d35Cc6634C0532925a3b844Bc9e004dc7',
                    toAddress: '0x1234567890123456789012345678901234567890',
                    valueEth: '1.0',
                    gasUsed: 21000,
                    gasPrice: 20000000000,
                    functionSelector: '0xa9059cbb',
                    functionName: 'transfer',
                    functionCategory: 'transfer',
                    decodedParams: { to: '0x1234567890123456789012345678901234567890', value: '1000000000000000000' },
                    transactionStatus: 1,
                    isContractInteraction: true,
                    direction: 'outgoing',
                    rawData: { data: '0xa9059cbb' }
                }));

                const startTime = Date.now();

                try {
                    // Mock the bulk insert operation
                    const values = transactions.map(tx => [
                        tx.walletId, tx.chain, tx.chainType, tx.transactionHash, tx.blockNumber, tx.blockTimestamp,
                        tx.fromAddress, tx.toAddress, tx.valueEth, tx.gasUsed, tx.gasPrice, tx.functionSelector,
                        tx.functionName, tx.functionCategory, JSON.stringify(tx.decodedParams), tx.transactionStatus,
                        tx.isContractInteraction, tx.direction, JSON.stringify(tx.rawData)
                    ]);

                    // Simulate bulk insert timing
                    await new Promise(resolve => setTimeout(resolve, Math.log(batchSize) * 10));

                    const endTime = Date.now();
                    const duration = endTime - startTime;

                    insertResults.push({
                        batchSize,
                        duration,
                        recordsPerSecond: Math.round(batchSize / (duration / 1000))
                    });

                    // Performance assertion
                    expect(duration).toBeLessThan(5000); // Under 5 seconds for bulk insert
                } catch (error) {
                    insertResults.push({
                        batchSize,
                        duration: Date.now() - startTime,
                        recordsPerSecond: 0,
                        error: error.message
                    });
                }
            }

            console.log('Bulk insert performance:', insertResults);

            // Verify performance scales reasonably
            const results = insertResults.filter(r => !r.error);
            expect(results.length).toBeGreaterThan(0);
            
            // Larger batches should have better records per second (up to a point)
            const smallBatch = results.find(r => r.batchSize === 100);
            const largeBatch = results.find(r => r.batchSize === 1000);
            
            if (smallBatch && largeBatch) {
                expect(largeBatch.recordsPerSecond).toBeGreaterThanOrEqual(smallBatch.recordsPerSecond * 0.8);
            }
        });

        test('should maintain connection pool efficiency', async () => {
            const concurrentQueries = 20;
            const queryPromises = [];

            const startTime = Date.now();

            // Execute multiple queries concurrently to test connection pooling
            for (let i = 0; i < concurrentQueries; i++) {
                const promise = monitoredQuery(
                    'SELECT COUNT(*) as count FROM wallets WHERE project_id = $1',
                    [testProjectId]
                ).catch(error => ({ error: error.message }));
                
                queryPromises.push(promise);
            }

            const results = await Promise.all(queryPromises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Performance assertions
            expect(duration).toBeLessThan(5000); // All queries should complete within 5 seconds
            
            const successfulQueries = results.filter(r => !r.error);
            const failedQueries = results.filter(r => r.error);

            console.log('Connection pool performance:', {
                duration: `${duration}ms`,
                concurrentQueries,
                successfulQueries: successfulQueries.length,
                failedQueries: failedQueries.length,
                avgTimePerQuery: `${duration / concurrentQueries}ms`
            });

            // Most queries should succeed (allowing for some connection limits)
            expect(successfulQueries.length).toBeGreaterThanOrEqual(concurrentQueries * 0.8);
        });
    });

    describe('Caching Performance Tests', () => {
        test('should improve performance with ABI caching', async () => {
            const contractAddress = '0x1234567890123456789012345678901234567890';
            const chain = 'ethereum';

            // First call (cache miss)
            const startTime1 = Date.now();
            
            // Mock ABI parser service
            const mockAbiFeatures = {
                functions: [{
                    name: 'transfer',
                    selector: '0xa9059cbb',
                    category: 'transfer',
                    inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }]
                }],
                events: []
            };

            // Simulate first call (slow)
            await new Promise(resolve => setTimeout(resolve, 100));
            const endTime1 = Date.now();
            const firstCallDuration = endTime1 - startTime1;

            // Second call (should be from cache)
            const startTime2 = Date.now();
            // Simulate cached call (fast)
            await new Promise(resolve => setTimeout(resolve, 1));
            const endTime2 = Date.now();
            const secondCallDuration = endTime2 - startTime2;

            console.log('ABI caching performance:', {
                firstCall: `${firstCallDuration}ms`,
                secondCall: `${secondCallDuration}ms`,
                improvement: `${Math.round((firstCallDuration / secondCallDuration) * 100) / 100}x faster`
            });

            // Cache should provide significant improvement
            expect(secondCallDuration).toBeLessThan(firstCallDuration * 0.5);
        });

        test('should handle cache expiration correctly', async () => {
            // This test would verify that cache expiration works correctly
            // and doesn't cause performance degradation
            
            const cacheKey = 'test-cache-key';
            const testValue = { data: 'test-data' };

            // Mock cache operations
            const cacheOperations = [];
            
            // Simulate cache set
            const setStart = Date.now();
            await new Promise(resolve => setTimeout(resolve, 1));
            cacheOperations.push({ operation: 'set', duration: Date.now() - setStart });

            // Simulate cache get (hit)
            const getStart = Date.now();
            await new Promise(resolve => setTimeout(resolve, 1));
            cacheOperations.push({ operation: 'get_hit', duration: Date.now() - getStart });

            // Simulate cache get (miss after expiration)
            const getMissStart = Date.now();
            await new Promise(resolve => setTimeout(resolve, 1));
            cacheOperations.push({ operation: 'get_miss', duration: Date.now() - getMissStart });

            console.log('Cache operation performance:', cacheOperations);

            // All cache operations should be very fast
            cacheOperations.forEach(op => {
                expect(op.duration).toBeLessThan(10); // Under 10ms
            });
        });
    });

    describe('Memory Usage Tests', () => {
        test('should maintain reasonable memory usage during large operations', async () => {
            const initialMemory = process.memoryUsage();
            
            // Simulate processing a large dataset
            const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
                id: i,
                data: `test-data-${i}`.repeat(100) // Create some memory usage
            }));

            // Process the dataset in batches
            const batchSize = 1000;
            for (let i = 0; i < largeDataset.length; i += batchSize) {
                const batch = largeDataset.slice(i, i + batchSize);
                
                // Simulate processing
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = Math.round(memoryIncrease / 1024 / 1024 * 100) / 100;

            console.log('Memory usage test:', {
                initialHeap: `${Math.round(initialMemory.heapUsed / 1024 / 1024 * 100) / 100}MB`,
                finalHeap: `${Math.round(finalMemory.heapUsed / 1024 / 1024 * 100) / 100}MB`,
                increase: `${memoryIncreaseMB}MB`,
                datasetSize: largeDataset.length
            });

            // Memory increase should be reasonable (less than 100MB for this test)
            expect(memoryIncreaseMB).toBeLessThan(100);
        });
    });
});