import { rpcPool } from './RpcPool';
import { dbService } from './DbService';
import { dataRotator } from './DataRotator';
import { ethers } from 'ethers';
import { RpcProvider } from 'starknet';

interface ChainSnapshot {
    chainId: number;
    blockData: any;
    entitySnapshots: any[];
    eventLogs: any[];
    transactions: any[];
}

export class OptimizedParallelIndexer {
    private isRunning = false;
    private activeChains: number[] = [];
    private retryCount = new Map<number, number>();
    private maxRetries = 3;

    async start() {
        this.isRunning = true;
        
        try {
            // Load active chains with retry
            const chains = await this.queryWithRetry('SELECT id FROM mc_chains WHERE is_active = true');
            this.activeChains = chains.rows.map(row => row.id);
            
            console.log(`[OptimizedIndexer] Starting with ${this.activeChains.length} chains`);
            
            if (this.activeChains.length === 0) {
                console.warn('[OptimizedIndexer] No active chains found');
                return;
            }
            
            this.processLoop();
        } catch (error) {
            console.error('[OptimizedIndexer] Failed to start:', error);
            throw error;
        }
    }

    stop() {
        this.isRunning = false;
    }

    private async processLoop() {
        while (this.isRunning) {
            try {
                await this.processAllChainsParallel();
                await new Promise(r => setTimeout(r, 5000)); // 5s cycle
            } catch (error) {
                console.error('[OptimizedIndexer] Process loop error:', error);
                await new Promise(r => setTimeout(r, 10000)); // Wait longer on error
            }
        }
    }

    private async processAllChainsParallel() {
        const cycleId = dataRotator.getCurrentCycleId();
        if (!cycleId) {
            console.warn('[OptimizedIndexer] No cycle ID available');
            return;
        }

        console.log(`[OptimizedIndexer] Processing ${this.activeChains.length} chains...`);
        
        // Process chains with concurrency limit
        const concurrencyLimit = 3;
        const results: ChainSnapshot[] = [];
        
        for (let i = 0; i < this.activeChains.length; i += concurrencyLimit) {
            const batch = this.activeChains.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(chainId => this.queryChainDataSafe(chainId, cycleId));
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result, index) => {
                const chainId = batch[index];
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                    this.retryCount.set(chainId, 0); // Reset retry count on success
                } else {
                    const currentRetries = this.retryCount.get(chainId) || 0;
                    this.retryCount.set(chainId, currentRetries + 1);
                    console.error(`[OptimizedIndexer] Chain ${chainId} failed (${currentRetries + 1}/${this.maxRetries}):`, 
                        result.status === 'rejected' ? result.reason : 'Unknown error');
                }
            });
        }

        if (results.length > 0) {
            await this.batchSaveSnapshots(results, cycleId);
        }
    }

    private async queryChainDataSafe(chainId: number, cycleId: number): Promise<ChainSnapshot | null> {
        const retries = this.retryCount.get(chainId) || 0;
        if (retries >= this.maxRetries) {
            console.warn(`[OptimizedIndexer] Skipping chain ${chainId} - max retries exceeded`);
            return null;
        }

        try {
            const provider = rpcPool.getProvider(chainId);
            
            if (provider instanceof RpcProvider) {
                return await this.queryStarknetData(chainId, provider, cycleId);
            } else {
                return await this.queryEvmData(chainId, provider as ethers.JsonRpcProvider, cycleId);
            }
        } catch (error) {
            console.error(`[OptimizedIndexer] Chain ${chainId} query failed:`, error.message);
            rpcPool.rotate(chainId); // Try next RPC endpoint
            return null;
        }
    }

    private async queryEvmData(chainId: number, provider: ethers.JsonRpcProvider, cycleId: number): Promise<ChainSnapshot> {
        // Get basic block data first
        const block = await provider.getBlock('latest');
        if (!block) throw new Error('No block data');

        // Get contracts for this chain
        const contracts = await this.queryWithRetry('SELECT * FROM mc_registry WHERE chain_id = $1 LIMIT 10', [chainId]);

        // Simplified entity queries to avoid timeouts
        const entitySnapshots = await Promise.all(
            contracts.rows.slice(0, 5).map(async (contract) => { // Limit to 5 contracts
                try {
                    const balance = await provider.getBalance(contract.address);
                    return {
                        contract,
                        balance: balance.toString(),
                        nonce: 0,
                        code: '0x'
                    };
                } catch (error) {
                    console.warn(`[OptimizedIndexer] Failed to query contract ${contract.address}:`, error.message);
                    return {
                        contract,
                        balance: '0',
                        nonce: 0,
                        code: '0x'
                    };
                }
            })
        );

        return {
            chainId,
            blockData: { block },
            entitySnapshots,
            eventLogs: [],
            transactions: []
        };
    }

    private async queryStarknetData(chainId: number, provider: RpcProvider, cycleId: number): Promise<ChainSnapshot> {
        const block = await provider.getBlock('latest');
        const contracts = await this.queryWithRetry('SELECT * FROM mc_registry WHERE chain_id = $1 LIMIT 5', [chainId]);

        const entitySnapshots = await Promise.all(
            contracts.rows.map(async (contract) => {
                try {
                    const nonce = await provider.getNonceForAddress(contract.address);
                    return {
                        contract,
                        balance: '0',
                        nonce: parseInt(nonce, 16) || 0,
                        classHash: '0x'
                    };
                } catch (error) {
                    return {
                        contract,
                        balance: '0',
                        nonce: 0,
                        classHash: '0x'
                    };
                }
            })
        );

        return {
            chainId,
            blockData: { block },
            entitySnapshots,
            eventLogs: [],
            transactions: []
        };
    }

    private async batchSaveSnapshots(snapshots: ChainSnapshot[], cycleId: number) {
        try {
            const queries: Promise<any>[] = [];

            for (const snapshot of snapshots) {
                // Chain snapshots
                if (snapshot.blockData.block) {
                    const block = snapshot.blockData.block;
                    queries.push(
                        this.queryWithRetry(
                            `INSERT INTO mc_chain_snapshots (cycle_id, chain_id, block_number, block_timestamp, gas_price, fee_history_json)
                             VALUES ($1, $2, $3, to_timestamp($4), $5, $6)
                             ON CONFLICT (cycle_id, chain_id) DO UPDATE SET
                             block_number = EXCLUDED.block_number,
                             block_timestamp = EXCLUDED.block_timestamp`,
                            [
                                cycleId,
                                snapshot.chainId,
                                block.number || block.block_number,
                                block.timestamp,
                                block.baseFeePerGas || 0,
                                JSON.stringify({})
                            ]
                        )
                    );
                }

                // Entity snapshots
                for (const entity of snapshot.entitySnapshots) {
                    queries.push(
                        this.queryWithRetry(
                            `INSERT INTO mc_entity_snapshots (cycle_id, registry_id, balance, nonce, is_contract, code_hash)
                             VALUES ($1, $2, $3, $4, $5, $6)
                             ON CONFLICT (cycle_id, registry_id) DO UPDATE SET
                             balance = EXCLUDED.balance,
                             nonce = EXCLUDED.nonce`,
                            [
                                cycleId,
                                entity.contract.id,
                                entity.balance,
                                entity.nonce,
                                entity.code !== '0x',
                                entity.code ? ethers.keccak256(entity.code) : '0x'
                            ]
                        )
                    );
                }
            }

            // Execute queries with limited concurrency
            const results = await Promise.allSettled(queries);
            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            console.log(`[OptimizedIndexer] Saved ${successful}/${queries.length} records across ${snapshots.length} chains`);
        } catch (error) {
            console.error('[OptimizedIndexer] Batch save failed:', error);
        }
    }

    private async queryWithRetry(query: string, params?: any[], maxRetries = 3): Promise<any> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await dbService.query(query, params);
            } catch (error) {
                console.error(`[OptimizedIndexer] DB query attempt ${i + 1} failed:`, error.message);
                if (i === maxRetries - 1) throw error;
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
    }
}
