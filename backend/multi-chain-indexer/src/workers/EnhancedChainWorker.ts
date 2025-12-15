import { rpcPool } from '../services/RpcPool';
import { dbService } from '../services/DbService';
import { redisService } from '../services/RedisService';
import { kafkaService } from '../services/KafkaService';
import { dataRotator } from '../services/DataRotator';
import { ethers } from 'ethers';
import { RpcProvider } from 'starknet';

export class EnhancedChainWorker {
    private chainId: number;
    private isRunning = false;
    private lastProcessedBlock = 0;
    private errorCount = 0;
    private maxErrors = 5;

    constructor(chainId: number) {
        this.chainId = chainId;
    }

    async start() {
        this.isRunning = true;
        console.log(`[Worker-${this.chainId}] Starting enhanced worker`);
        
        // Initialize last processed block
        await this.loadLastProcessedBlock();
        
        this.processLoop();
    }

    stop() {
        this.isRunning = false;
        console.log(`[Worker-${this.chainId}] Stopping`);
    }

    private async processLoop() {
        while (this.isRunning) {
            try {
                await this.processChain();
                this.errorCount = 0; // Reset on success
                await new Promise(r => setTimeout(r, 5000));
                
            } catch (error) {
                this.errorCount++;
                console.error(`[Worker-${this.chainId}] Error (${this.errorCount}/${this.maxErrors}):`, error.message);
                
                if (this.errorCount >= this.maxErrors) {
                    console.error(`[Worker-${this.chainId}] Max errors reached, rotating RPC`);
                    rpcPool.rotate(this.chainId);
                    this.errorCount = 0;
                }
                
                await new Promise(r => setTimeout(r, 10000)); // Wait longer on error
            }
        }
    }

    private async processChain() {
        const provider = rpcPool.getProvider(this.chainId);
        const cycleId = dataRotator.getCurrentCycleId();
        
        if (!cycleId) {
            console.warn(`[Worker-${this.chainId}] No active cycle`);
            return;
        }

        // Get current block with caching
        const currentBlock = await this.getCurrentBlockWithCache(provider);
        
        if (currentBlock <= this.lastProcessedBlock) {
            return; // No new blocks
        }

        console.log(`[Worker-${this.chainId}] Processing blocks ${this.lastProcessedBlock + 1} to ${currentBlock}`);

        // Process new blocks
        for (let blockNum = this.lastProcessedBlock + 1; blockNum <= currentBlock; blockNum++) {
            await this.processBlock(provider, blockNum, cycleId);
        }

        this.lastProcessedBlock = currentBlock;
        await this.saveLastProcessedBlock();
    }

    private async getCurrentBlockWithCache(provider: any): Promise<number> {
        const cacheKey = `latest_block:${this.chainId}`;
        
        // Try cache first
        if (redisService.isHealthy()) {
            const cached = await redisService.get(cacheKey);
            if (cached) {
                const blockData = JSON.parse(cached);
                if (Date.now() - blockData.timestamp < 10000) { // 10s cache
                    return blockData.blockNumber;
                }
            }
        }

        // Fetch from RPC
        const blockNumber = provider instanceof RpcProvider 
            ? (await provider.getBlock('latest')).block_number
            : await provider.getBlockNumber();

        // Cache result
        if (redisService.isHealthy()) {
            await redisService.set(cacheKey, JSON.stringify({
                blockNumber,
                timestamp: Date.now()
            }), 10);
        }

        return blockNumber;
    }

    private async processBlock(provider: any, blockNumber: number, cycleId: number) {
        try {
            // Check cache first
            const cacheKey = `block_data:${this.chainId}:${blockNumber}`;
            let blockData = null;
            
            if (redisService.isHealthy()) {
                const cached = await redisService.get(cacheKey);
                if (cached) {
                    blockData = JSON.parse(cached);
                }
            }

            // Fetch if not cached
            if (!blockData) {
                if (provider instanceof RpcProvider) {
                    blockData = await this.processStarknetBlock(provider, blockNumber);
                } else {
                    blockData = await this.processEvmBlock(provider, blockNumber);
                }

                // Cache block data
                if (redisService.isHealthy()) {
                    await redisService.set(cacheKey, JSON.stringify(blockData), 3600); // 1 hour
                }
            }

            // Save to database
            await this.saveBlockData(blockData, cycleId);

            // Stream to Kafka
            if (kafkaService.isHealthy()) {
                await kafkaService.publishBlockData(this.chainId, blockData);
                
                // Stream transactions
                for (const tx of blockData.transactions || []) {
                    await kafkaService.publishTransaction(this.chainId, tx);
                }
            }

        } catch (error) {
            console.error(`[Worker-${this.chainId}] Block ${blockNumber} processing failed:`, error.message);
        }
    }

    private async processEvmBlock(provider: ethers.JsonRpcProvider, blockNumber: number) {
        const block = await provider.getBlock(blockNumber, true);
        
        return {
            number: block.number,
            hash: block.hash,
            timestamp: block.timestamp,
            gasUsed: block.gasUsed?.toString(),
            gasLimit: block.gasLimit?.toString(),
            baseFeePerGas: block.baseFeePerGas?.toString(),
            transactions: block.transactions.slice(0, 10).map(tx => ({ // Limit for performance
                hash: typeof tx === 'string' ? tx : tx.hash,
                from: typeof tx === 'string' ? null : tx.from,
                to: typeof tx === 'string' ? null : tx.to,
                value: typeof tx === 'string' ? null : tx.value?.toString()
            }))
        };
    }

    private async processStarknetBlock(provider: RpcProvider, blockNumber: number) {
        const block = await provider.getBlock(blockNumber);
        
        return {
            number: block.block_number,
            hash: block.block_hash,
            timestamp: block.timestamp,
            transactions: block.transactions?.slice(0, 10) || []
        };
    }

    private async saveBlockData(blockData: any, cycleId: number) {
        await dbService.query(`
            INSERT INTO mc_chain_snapshots (cycle_id, chain_id, block_number, block_timestamp, gas_price)
            VALUES ($1, $2, $3, to_timestamp($4), $5)
            ON CONFLICT (cycle_id, chain_id, block_number) DO NOTHING
        `, [
            cycleId,
            this.chainId,
            blockData.number,
            blockData.timestamp,
            blockData.baseFeePerGas || 0
        ]);
    }

    private async loadLastProcessedBlock() {
        try {
            const result = await dbService.query(`
                SELECT MAX(block_number) as last_block 
                FROM mc_chain_snapshots 
                WHERE chain_id = $1
            `, [this.chainId]);
            
            this.lastProcessedBlock = result.rows[0]?.last_block || 0;
            console.log(`[Worker-${this.chainId}] Starting from block ${this.lastProcessedBlock}`);
            
        } catch (error) {
            console.warn(`[Worker-${this.chainId}] Could not load last block:`, error.message);
            this.lastProcessedBlock = 0;
        }
    }

    private async saveLastProcessedBlock() {
        if (redisService.isHealthy()) {
            await redisService.set(`last_block:${this.chainId}`, this.lastProcessedBlock.toString());
        }
    }
}
