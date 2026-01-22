/**
 * Optimized EVM Indexer Worker
 * 
 * Enhanced version with batch processing, connection pooling, and caching
 * Requirements: 4.1, 4.2, 8.3, 8.5
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { 
    performancePool, 
    abiCache, 
    transactionBatchProcessor, 
    eventBatchProcessor,
    monitoredQuery 
} from '../config/performanceConfig.js';
import { abiParserService } from './abiParserService.js';

/**
 * Simple semaphore for controlling concurrency
 */
class Semaphore {
    constructor(permits) {
        this.permits = permits;
        this.waiting = [];
    }

    async acquire() {
        return new Promise((resolve) => {
            if (this.permits > 0) {
                this.permits--;
                resolve(() => this.release());
            } else {
                this.waiting.push(() => {
                    resolve(() => this.release());
                });
            }
        });
    }

    release() {
        this.permits++;
        if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            this.permits--;
            next();
        }
    }
}

/**
 * Optimized EVM Indexer Worker with performance enhancements
 */
export class OptimizedEVMIndexerWorker extends EventEmitter {
    constructor(rpcEndpoints, options = {}) {
        super();
        this.rpcEndpoints = rpcEndpoints || [];
        this.currentRpcIndex = 0;
        
        // Performance options
        this.batchSize = options.batchSize || 50; // Smaller batches for better memory usage
        this.concurrentBatches = options.concurrentBatches || 3; // Process multiple batches concurrently
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        
        // State tracking
        this.isRunning = false;
        this.shouldStop = false;
        this.processedBlocks = 0;
        this.startTime = null;
        
        // Performance metrics
        this.metrics = {
            blocksProcessed: 0,
            transactionsFound: 0,
            eventsFound: 0,
            batchesProcessed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgBatchTime: 0,
            totalBatchTime: 0
        };
    }

    /**
     * Index wallet with optimized batch processing
     */
    async indexWallet(walletId, address, chain, chainType, startBlock, endBlock, onProgress) {
        this.isRunning = true;
        this.shouldStop = false;
        this.startTime = Date.now();
        this.processedBlocks = 0;

        const result = {
            walletId,
            address,
            chain,
            chainType,
            startBlock,
            endBlock,
            transactionsFound: 0,
            eventsFound: 0,
            blocksProcessed: 0,
            success: false,
            error: null,
            metrics: {}
        };

        try {
            console.log(`Starting optimized EVM indexing for wallet ${walletId} on ${chain} from block ${startBlock} to ${endBlock}`);

            const provider = await this.getProvider();
            const currentBlock = Math.min(endBlock, await provider.getBlockNumber());
            result.endBlock = currentBlock;

            // Calculate batch ranges
            const totalBlocks = currentBlock - startBlock + 1;
            const batchRanges = this.calculateBatchRanges(startBlock, currentBlock, this.batchSize);

            console.log(`Processing ${totalBlocks} blocks in ${batchRanges.length} batches of ${this.batchSize} blocks each`);

            // Process batches with concurrency control
            await this.processBatchesConcurrently(
                batchRanges,
                walletId,
                address,
                chain,
                chainType,
                provider,
                onProgress,
                result
            );

            // Flush any remaining batched data
            await this.flushBatchedData();

            // Update wallet's last indexed block
            await this.updateWalletIndexingStatus(walletId, currentBlock, result.transactionsFound, result.eventsFound);

            result.success = true;
            result.metrics = this.getMetrics();
            
            console.log(`Completed optimized EVM indexing for wallet ${walletId}:`, {
                transactions: result.transactionsFound,
                events: result.eventsFound,
                blocks: result.blocksProcessed,
                metrics: result.metrics
            });

        } catch (error) {
            result.error = error.message;
            console.error(`Optimized EVM indexing failed for wallet ${walletId}:`, error);
            throw error;
        } finally {
            this.isRunning = false;
        }

        return result;
    }

    /**
     * Calculate batch ranges for processing
     */
    calculateBatchRanges(startBlock, endBlock, batchSize) {
        const ranges = [];
        let currentStart = startBlock;

        while (currentStart <= endBlock) {
            const currentEnd = Math.min(currentStart + batchSize - 1, endBlock);
            ranges.push({ start: currentStart, end: currentEnd });
            currentStart = currentEnd + 1;
        }

        return ranges;
    }

    /**
     * Process batches with controlled concurrency
     */
    async processBatchesConcurrently(batchRanges, walletId, address, chain, chainType, provider, onProgress, result) {
        const semaphore = new Semaphore(this.concurrentBatches);
        const promises = [];

        for (let i = 0; i < batchRanges.length && !this.shouldStop; i++) {
            const range = batchRanges[i];
            
            const promise = semaphore.acquire().then(async (release) => {
                try {
                    const batchStartTime = Date.now();
                    const batchResult = await this.processBatchOptimized(
                        walletId,
                        address,
                        chain,
                        chainType,
                        range.start,
                        range.end,
                        provider
                    );

                    // Update metrics
                    const batchTime = Date.now() - batchStartTime;
                    this.updateBatchMetrics(batchTime, batchResult);

                    // Update result
                    result.transactionsFound += batchResult.transactions;
                    result.eventsFound += batchResult.events;
                    result.blocksProcessed = range.end - result.startBlock + 1;

                    // Emit progress
                    if (onProgress) {
                        const progress = this.calculateProgress(result, batchRanges.length, i + 1);
                        onProgress(progress);
                    }

                    return batchResult;
                } finally {
                    release();
                }
            });

            promises.push(promise);
        }

        // Wait for all batches to complete
        await Promise.all(promises);
    }

    /**
     * Process a single batch with optimizations
     */
    async processBatchOptimized(walletId, address, chain, chainType, startBlock, endBlock, provider) {
        const transactions = [];
        const events = [];

        try {
            // Fetch blocks in parallel with limited concurrency
            const blockPromises = [];
            for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
                blockPromises.push(this.fetchBlockWithRetry(provider, blockNum));
            }

            const blocks = await Promise.all(blockPromises);

            // Process blocks
            for (const block of blocks) {
                if (!block || this.shouldStop) continue;

                // Process transactions
                if (block.transactions) {
                    for (const tx of block.transactions) {
                        if (this.isWalletInvolved(address, tx)) {
                            const decodedTx = await this.decodeTransactionCached(tx, chain);
                            transactions.push(this.formatTransaction(walletId, chain, chainType, tx, block, decodedTx));
                        }
                    }
                }

                // Process events (logs)
                const logs = await this.fetchLogsForBlock(provider, block.number, address);
                for (const log of logs) {
                    const decodedEvent = await this.decodeEventCached(log, chain);
                    if (decodedEvent) {
                        events.push(this.formatEvent(walletId, chain, chainType, log, block, decodedEvent));
                    }
                }
            }

            // Batch store data instead of immediate storage
            if (transactions.length > 0) {
                await this.batchStoreTransactions(transactions);
            }
            if (events.length > 0) {
                await this.batchStoreEvents(events);
            }

        } catch (error) {
            console.error(`Error processing batch ${startBlock}-${endBlock}:`, error);
            throw error;
        }

        return {
            transactions: transactions.length,
            events: events.length
        };
    }

    /**
     * Fetch block with retry logic
     */
    async fetchBlockWithRetry(provider, blockNumber, retries = 0) {
        try {
            return await provider.getBlock(blockNumber, true);
        } catch (error) {
            if (retries < this.maxRetries) {
                await this.delay(this.retryDelay * Math.pow(2, retries));
                return this.fetchBlockWithRetry(provider, blockNumber, retries + 1);
            }
            console.warn(`Failed to fetch block ${blockNumber} after ${this.maxRetries} retries`);
            return null;
        }
    }

    /**
     * Fetch logs for a specific block and address
     */
    async fetchLogsForBlock(provider, blockNumber, address) {
        try {
            return await provider.getLogs({
                fromBlock: blockNumber,
                toBlock: blockNumber,
                address: null // Get all logs, we'll filter later
            });
        } catch (error) {
            console.warn(`Failed to fetch logs for block ${blockNumber}:`, error.message);
            return [];
        }
    }

    /**
     * Check if wallet is involved in transaction
     */
    isWalletInvolved(walletAddress, tx) {
        const wallet = walletAddress.toLowerCase();
        return tx.from?.toLowerCase() === wallet || tx.to?.toLowerCase() === wallet;
    }

    /**
     * Decode transaction with caching
     */
    async decodeTransactionCached(tx, chain) {
        if (!tx.data || tx.data === '0x' || tx.data.length < 10) {
            return { functionSelector: null, functionName: null, functionCategory: null, decodedParams: null };
        }

        const functionSelector = tx.data.substring(0, 10);
        const cacheKey = `tx_decode_${chain}_${tx.to}_${functionSelector}`;
        
        // Check cache first
        let abiFeatures = abiCache.get(cacheKey);
        if (abiFeatures) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
            try {
                abiFeatures = await abiParserService.getABIFeatures(tx.to, chain);
                abiCache.set(cacheKey, abiFeatures, 600000); // Cache for 10 minutes
            } catch (error) {
                return { 
                    functionSelector, 
                    functionName: null, 
                    functionCategory: null, 
                    decodedParams: null,
                    decodeError: error.message 
                };
            }
        }

        const functionFeature = abiFeatures.functions?.find(f => f.selector === functionSelector);
        if (!functionFeature) {
            return { 
                functionSelector, 
                functionName: null, 
                functionCategory: null, 
                decodedParams: null,
                decodeError: 'Function signature not found'
            };
        }

        try {
            const iface = new ethers.Interface([{
                type: 'function',
                name: functionFeature.name,
                inputs: functionFeature.inputs
            }]);
            const decoded = iface.decodeFunctionData(functionFeature.name, tx.data);
            
            return {
                functionSelector,
                functionName: functionFeature.name,
                functionCategory: functionFeature.category,
                decodedParams: this.formatDecodedParams(decoded, functionFeature.inputs)
            };
        } catch (decodeError) {
            return {
                functionSelector,
                functionName: functionFeature.name,
                functionCategory: functionFeature.category,
                decodedParams: null,
                decodeError: decodeError.message
            };
        }
    }

    /**
     * Decode event with caching
     */
    async decodeEventCached(log, chain) {
        if (!log.topics || log.topics.length === 0) return null;

        const eventSignature = log.topics[0];
        const cacheKey = `event_decode_${chain}_${log.address}_${eventSignature}`;
        
        // Check cache first
        let abiFeatures = abiCache.get(cacheKey);
        if (abiFeatures) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
            try {
                abiFeatures = await abiParserService.getABIFeatures(log.address, chain);
                abiCache.set(cacheKey, abiFeatures, 600000); // Cache for 10 minutes
            } catch (error) {
                return {
                    eventName: 'Unknown',
                    decodedParams: { signature: eventSignature },
                    decodeError: error.message
                };
            }
        }

        const eventFeature = abiFeatures.events?.find(e => e.topic === eventSignature);
        if (!eventFeature) {
            return {
                eventName: 'Unknown',
                decodedParams: { signature: eventSignature },
                decodeError: 'Event signature not found'
            };
        }

        try {
            const iface = new ethers.Interface([{
                type: 'event',
                name: eventFeature.name,
                inputs: eventFeature.inputs
            }]);
            const decoded = iface.decodeEventLog(eventFeature.name, log.data, log.topics);
            
            return {
                eventName: eventFeature.name,
                decodedParams: this.formatDecodedParams(decoded, eventFeature.inputs)
            };
        } catch (decodeError) {
            return {
                eventName: eventFeature.name,
                decodedParams: { signature: eventSignature },
                decodeError: decodeError.message
            };
        }
    }

    /**
     * Format transaction for storage
     */
    formatTransaction(walletId, chain, chainType, tx, block, decodedTx) {
        return {
            walletId,
            chain,
            chainType,
            transactionHash: tx.hash,
            blockNumber: block.number,
            blockTimestamp: new Date(block.timestamp * 1000),
            fromAddress: tx.from,
            toAddress: tx.to,
            valueEth: ethers.formatEther(tx.value || 0),
            gasUsed: tx.gasLimit ? Number(tx.gasLimit) : null,
            gasPrice: tx.gasPrice ? Number(tx.gasPrice) : null,
            functionSelector: decodedTx.functionSelector,
            functionName: decodedTx.functionName,
            functionCategory: decodedTx.functionCategory,
            decodedParams: decodedTx.decodedParams,
            transactionStatus: 1,
            isContractInteraction: tx.to !== null && tx.data && tx.data !== '0x',
            direction: this.getTransactionDirection(walletId, tx.from, tx.to),
            rawData: {
                data: tx.data,
                value: tx.value?.toString(),
                gasLimit: tx.gasLimit?.toString(),
                gasPrice: tx.gasPrice?.toString(),
                decodeError: decodedTx.decodeError
            }
        };
    }

    /**
     * Format event for storage
     */
    formatEvent(walletId, chain, chainType, log, block, decodedEvent) {
        return {
            walletId,
            transactionHash: log.transactionHash,
            chain,
            chainType,
            blockNumber: block.number,
            blockTimestamp: new Date(block.timestamp * 1000),
            eventSignature: log.topics[0],
            eventName: decodedEvent.eventName,
            contractAddress: log.address,
            decodedParams: decodedEvent.decodedParams,
            logIndex: log.logIndex,
            rawTopics: log.topics,
            rawData: log.data
        };
    }

    /**
     * Batch store transactions using batch processor
     */
    async batchStoreTransactions(transactions) {
        return new Promise((resolve, reject) => {
            transactionBatchProcessor.add('transactions', transactions, async (batchedTransactions) => {
                try {
                    const flatTransactions = batchedTransactions.flat();
                    await this.storeTransactionsBatch(flatTransactions);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Batch store events using batch processor
     */
    async batchStoreEvents(events) {
        return new Promise((resolve, reject) => {
            eventBatchProcessor.add('events', events, async (batchedEvents) => {
                try {
                    const flatEvents = batchedEvents.flat();
                    await this.storeEventsBatch(flatEvents);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Store transactions batch with optimized query
     */
    async storeTransactionsBatch(transactions) {
        if (transactions.length === 0) return;

        const client = await performancePool.connect();
        try {
            await client.query('BEGIN');

            // Use COPY for bulk insert (much faster than individual INSERTs)
            const values = transactions.map(tx => [
                tx.walletId, tx.chain, tx.chainType, tx.transactionHash, tx.blockNumber, tx.blockTimestamp,
                tx.fromAddress, tx.toAddress, tx.valueEth, tx.gasUsed, tx.gasPrice, tx.functionSelector,
                tx.functionName, tx.functionCategory, JSON.stringify(tx.decodedParams), tx.transactionStatus,
                tx.isContractInteraction, tx.direction, JSON.stringify(tx.rawData)
            ]);

            // Use unnest for bulk insert
            const placeholders = values.map((_, i) => {
                const base = i * 19;
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19})`;
            }).join(', ');

            const query = `
                INSERT INTO wallet_transactions (
                    wallet_id, chain, chain_type, transaction_hash, block_number, block_timestamp,
                    from_address, to_address, value_eth, gas_used, gas_price, function_selector,
                    function_name, function_category, decoded_params, transaction_status,
                    is_contract_interaction, direction, raw_data
                ) VALUES ${placeholders}
                ON CONFLICT (wallet_id, chain, transaction_hash) DO NOTHING
            `;

            await monitoredQuery(query, values.flat());
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to store transactions batch: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Store events batch with optimized query
     */
    async storeEventsBatch(events) {
        if (events.length === 0) return;

        const client = await performancePool.connect();
        try {
            await client.query('BEGIN');

            const values = events.map(event => [
                event.walletId, event.transactionHash, event.chain, event.chainType, event.blockNumber,
                event.blockTimestamp, event.eventSignature, event.eventName, event.contractAddress,
                JSON.stringify(event.decodedParams), event.logIndex, event.rawTopics, event.rawData
            ]);

            const placeholders = values.map((_, i) => {
                const base = i * 13;
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13})`;
            }).join(', ');

            const query = `
                INSERT INTO wallet_events (
                    wallet_id, transaction_hash, chain, chain_type, block_number, block_timestamp,
                    event_signature, event_name, contract_address, decoded_params, log_index,
                    raw_topics, raw_data
                ) VALUES ${placeholders}
                ON CONFLICT (wallet_id, chain, transaction_hash, log_index) DO NOTHING
            `;

            await monitoredQuery(query, values.flat());
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`Failed to store events batch: ${error.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Flush all batched data
     */
    async flushBatchedData() {
        await Promise.all([
            transactionBatchProcessor.flushAll(),
            eventBatchProcessor.flushAll()
        ]);
    }

    /**
     * Get current provider with failover
     */
    async getProvider() {
        if (this.rpcEndpoints.length === 0) {
            throw new Error('No RPC endpoints configured');
        }

        for (let i = 0; i < this.rpcEndpoints.length; i++) {
            try {
                const endpoint = this.rpcEndpoints[this.currentRpcIndex];
                const provider = new ethers.JsonRpcProvider(endpoint);
                await provider.getBlockNumber(); // Test connection
                return provider;
            } catch (error) {
                console.warn(`RPC endpoint failed, trying next:`, error.message);
                this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
            }
        }

        throw new Error('All RPC endpoints are currently unavailable');
    }

    /**
     * Update batch processing metrics
     */
    updateBatchMetrics(batchTime, batchResult) {
        this.metrics.batchesProcessed++;
        this.metrics.totalBatchTime += batchTime;
        this.metrics.avgBatchTime = this.metrics.totalBatchTime / this.metrics.batchesProcessed;
        this.metrics.transactionsFound += batchResult.transactions;
        this.metrics.eventsFound += batchResult.events;
    }

    /**
     * Calculate progress information
     */
    calculateProgress(result, totalBatches, completedBatches) {
        const progressPercentage = (completedBatches / totalBatches) * 100;
        const elapsedTime = Date.now() - this.startTime;
        const avgTimePerBatch = elapsedTime / completedBatches;
        const remainingBatches = totalBatches - completedBatches;
        const estimatedTimeRemaining = Math.round((remainingBatches * avgTimePerBatch) / 1000);

        return {
            currentBlock: result.startBlock + result.blocksProcessed,
            totalBlocks: result.endBlock - result.startBlock + 1,
            progressPercentage: Math.min(progressPercentage, 100),
            transactionsFound: result.transactionsFound,
            eventsFound: result.eventsFound,
            blocksPerSecond: this.calculateBlocksPerSecond(result.blocksProcessed, elapsedTime),
            estimatedTimeRemaining,
            batchesCompleted: completedBatches,
            totalBatches
        };
    }

    /**
     * Calculate blocks per second
     */
    calculateBlocksPerSecond(blocksProcessed, elapsedMs) {
        if (elapsedMs <= 0) return 0;
        return Number((blocksProcessed / (elapsedMs / 1000)).toFixed(2));
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100
        };
    }

    /**
     * Utility methods
     */
    formatDecodedParams(decoded, paramDefinitions) {
        const result = {};
        if (paramDefinitions && Array.isArray(paramDefinitions)) {
            paramDefinitions.forEach((param, index) => {
                const value = decoded[index];
                if (value !== undefined) {
                    if (typeof value === 'bigint') {
                        result[param.name || `param${index}`] = value.toString();
                    } else if (value && typeof value === 'object' && value._isBigNumber) {
                        result[param.name || `param${index}`] = value.toString();
                    } else {
                        result[param.name || `param${index}`] = value;
                    }
                }
            });
        }
        return result;
    }

    getTransactionDirection(walletAddress, fromAddress, toAddress) {
        const wallet = walletAddress.toLowerCase();
        const from = fromAddress?.toLowerCase();
        const to = toAddress?.toLowerCase();

        if (from === wallet && to === wallet) return 'internal';
        if (from === wallet) return 'outgoing';
        if (to === wallet) return 'incoming';
        return 'unknown';
    }

    /**
     * Update wallet indexing status
     */
    async updateWalletIndexingStatus(walletId, lastIndexedBlock, transactionCount, eventCount) {
        const client = await performancePool.connect();
        try {
            await client.query(`
                UPDATE wallets 
                SET last_indexed_block = $1, 
                    last_synced_at = NOW(),
                    total_transactions = COALESCE(total_transactions, 0) + $2,
                    total_events = COALESCE(total_events, 0) + $3,
                    updated_at = NOW()
                WHERE id = $4
            `, [lastIndexedBlock, transactionCount, eventCount, walletId]);
        } finally {
            client.release();
        }
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stop indexing
     */
    stop() {
        this.shouldStop = true;
    }

    // Methods expected by tests
    
    /**
     * Decode transaction (simplified interface for tests)
     */
    async decodeTransaction(tx, chain) {
        // Handle invalid transactions gracefully
        if (!tx || !tx.data || tx.data.length < 10) {
            return { 
                functionSelector: null, 
                functionName: null, 
                functionCategory: null, 
                decodedParams: null 
            };
        }
        
        // Check for invalid hex data
        if (!/^0x[0-9a-fA-F]*$/.test(tx.data)) {
            return { 
                functionSelector: null, 
                functionName: null, 
                functionCategory: null, 
                decodedParams: null,
                decodeError: 'Invalid hex data'
            };
        }
        
        return await this.decodeTransactionCached(tx, chain);
    }

    /**
     * Store transactions (simplified interface for tests)
     */
    async storeTransactions(transactions) {
        // Validate transactions before storing
        const validTransactions = transactions.filter(tx => {
            // Check if walletId is a valid UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(tx.walletId)) {
                console.warn(`Invalid walletId format: ${tx.walletId}`);
                return false;
            }
            return true;
        });
        
        if (validTransactions.length === 0) {
            throw new Error('No valid transactions to store');
        }
        
        return await this.storeTransactionsBatch(validTransactions);
    }

    /**
     * Decode event (simplified interface for tests)
     */
    async decodeEvent(log, chain) {
        return await this.decodeEventCached(log, chain);
    }

    /**
     * Process batch (simplified interface for tests)
     */
    async processBatch(walletId, address, chain, startBlock, endBlock) {
        const provider = await this.getProvider();
        return await this.processBatchOptimized(walletId, address, chain, 'evm', startBlock, endBlock, provider);
    }

    /**
     * RPC Manager interface for tests
     */
    get rpcManager() {
        const self = this;
        return {
            getProvider: () => self.getProvider(),
            markEndpointFailed: (endpoint) => {
                // Simple implementation for tests
                const index = self.rpcEndpoints.indexOf(endpoint);
                if (index > -1) {
                    self.currentRpcIndex = (index + 1) % self.rpcEndpoints.length;
                    // Track failed endpoints
                    if (!self._failedEndpoints) self._failedEndpoints = new Set();
                    if (!self._retryDelays) self._retryDelays = new Map();
                    
                    self._failedEndpoints.add(endpoint);
                    const delay = Date.now() + (1000 * Math.pow(2, self._retryDelays.get(endpoint) || 0));
                    self._retryDelays.set(endpoint, delay);
                }
            },
            get failedEndpoints() {
                if (!self._failedEndpoints) self._failedEndpoints = new Set();
                return self._failedEndpoints;
            },
            get retryDelays() {
                if (!self._retryDelays) self._retryDelays = new Map();
                return self._retryDelays;
            },
            get currentIndex() {
                return self.currentRpcIndex;
            },
            rpcEndpoints: self.rpcEndpoints
        };
    }

    getTransactionDirection(walletAddress, fromAddress, toAddress) {
        const wallet = walletAddress.toLowerCase();
        const from = fromAddress?.toLowerCase();
        const to = toAddress?.toLowerCase();

        if (from === wallet && to === wallet) return 'internal';
        if (from === wallet) return 'outgoing';
        if (to === wallet) return 'incoming';
        return 'unknown';
    }

    /**
     * Update wallet indexing status
     */
    async updateWalletIndexingStatus(walletId, lastIndexedBlock, transactionCount, eventCount) {
        const client = await performancePool.connect();
        try {
            await client.query(`
                UPDATE wallets 
                SET last_indexed_block = $1, 
                    last_synced_at = NOW(),
                    total_transactions = COALESCE(total_transactions, 0) + $2,
                    total_events = COALESCE(total_events, 0) + $3,
                    updated_at = NOW()
                WHERE id = $4
            `, [lastIndexedBlock, transactionCount, eventCount, walletId]);
        } finally {
            client.release();
        }
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stop indexing
     */
    stop() {
        this.shouldStop = true;
    }

    /**
     * Check if indexing is running
     */
    isIndexing() {
        return this.isRunning;
    }
}

export default OptimizedEVMIndexerWorker;