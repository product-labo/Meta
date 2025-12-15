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

export class ParallelIndexer {
    private isRunning = false;
    private activeChains: number[] = [];

    async start() {
        this.isRunning = true;
        
        // Load active chains
        const chains = await dbService.query('SELECT id FROM mc_chains WHERE is_active = true');
        this.activeChains = chains.rows.map(row => row.id);
        
        console.log(`[ParallelIndexer] Starting with ${this.activeChains.length} chains`);
        
        this.processLoop();
    }

    stop() {
        this.isRunning = false;
    }

    private async processLoop() {
        while (this.isRunning) {
            try {
                await this.processAllChainsParallel();
            } catch (error) {
                console.error('[ParallelIndexer] Error:', error);
            }
            await new Promise(r => setTimeout(r, 5000)); // 5s cycle
        }
    }

    private async processAllChainsParallel() {
        const cycleId = dataRotator.getCurrentCycleId();
        if (!cycleId) return;

        console.log(`[ParallelIndexer] Processing ${this.activeChains.length} chains in parallel...`);
        
        // Query all chains simultaneously
        const chainPromises = this.activeChains.map(chainId => 
            this.queryChainData(chainId, cycleId)
        );

        const snapshots = await Promise.allSettled(chainPromises);
        
        // Batch save all successful results
        const successfulSnapshots = snapshots
            .filter((result): result is PromiseFulfilledResult<ChainSnapshot> => 
                result.status === 'fulfilled' && result.value !== null
            )
            .map(result => result.value);

        if (successfulSnapshots.length > 0) {
            await this.batchSaveSnapshots(successfulSnapshots, cycleId);
        }

        // Log failures
        snapshots.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`[ParallelIndexer] Chain ${this.activeChains[index]} failed:`, result.reason);
            }
        });
    }

    private async queryChainData(chainId: number, cycleId: number): Promise<ChainSnapshot | null> {
        try {
            const provider = rpcPool.getProvider(chainId);
            
            if (provider instanceof RpcProvider) {
                return await this.queryStarknetData(chainId, provider, cycleId);
            } else {
                return await this.queryEvmData(chainId, provider as ethers.JsonRpcProvider, cycleId);
            }
        } catch (error) {
            console.error(`[ParallelIndexer] Chain ${chainId} query failed:`, error);
            return null;
        }
    }

    private async queryEvmData(chainId: number, provider: ethers.JsonRpcProvider, cycleId: number): Promise<ChainSnapshot> {
        // Parallel queries for chain data
        const [block, feeHistory, contracts] = await Promise.all([
            provider.getBlock('latest'),
            provider.send('eth_feeHistory', [5, 'latest', [25, 50, 75]]).catch(() => null),
            dbService.query('SELECT * FROM mc_registry WHERE chain_id = $1', [chainId])
        ]);

        if (!block) throw new Error('No block data');

        // Parallel entity queries
        const entityPromises = contracts.rows.map(async (contract) => {
            const [balance, nonce, code, logs] = await Promise.all([
                provider.getBalance(contract.address),
                provider.getTransactionCount(contract.address),
                provider.getCode(contract.address),
                contract.monitor_events ? provider.getLogs({
                    address: contract.address,
                    fromBlock: block.number - 10,
                    toBlock: block.number
                }) : []
            ]);

            return {
                contract,
                balance: balance.toString(),
                nonce,
                code,
                logs
            };
        });

        const entityResults = await Promise.allSettled(entityPromises);
        const entitySnapshots = entityResults
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value);

        // Collect all event logs and transactions
        const allLogs = entitySnapshots.flatMap(entity => entity.logs);
        const uniqueTxHashes = [...new Set(allLogs.map(log => log.transactionHash))];

        // Parallel transaction queries
        const txPromises = uniqueTxHashes.map(txHash => 
            Promise.all([
                provider.getTransaction(txHash),
                provider.getTransactionReceipt(txHash)
            ]).then(([tx, receipt]) => ({ tx, receipt, txHash }))
        );

        const txResults = await Promise.allSettled(txPromises);
        const transactions = txResults
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value);

        return {
            chainId,
            blockData: { block, feeHistory },
            entitySnapshots,
            eventLogs: allLogs,
            transactions
        };
    }

    private async queryStarknetData(chainId: number, provider: RpcProvider, cycleId: number): Promise<ChainSnapshot> {
        const [block, contracts] = await Promise.all([
            provider.getBlock('latest'),
            dbService.query('SELECT * FROM mc_registry WHERE chain_id = $1', [chainId])
        ]);

        const entityPromises = contracts.rows.map(async (contract) => {
            const [nonce, classHash] = await Promise.all([
                provider.getNonceForAddress(contract.address).catch(() => '0'),
                provider.getClassHashAt(contract.address).catch(() => '0x')
            ]);

            return {
                contract,
                balance: '0',
                nonce: parseInt(nonce, 16) || 0,
                classHash
            };
        });

        const entityResults = await Promise.allSettled(entityPromises);
        const entitySnapshots = entityResults
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value);

        return {
            chainId,
            blockData: { block },
            entitySnapshots,
            eventLogs: [],
            transactions: []
        };
    }

    private async batchSaveSnapshots(snapshots: ChainSnapshot[], cycleId: number) {
        const queries: Promise<any>[] = [];

        for (const snapshot of snapshots) {
            // Chain snapshots
            if (snapshot.blockData.block) {
                const block = snapshot.blockData.block;
                queries.push(
                    dbService.query(
                        `INSERT INTO mc_chain_snapshots (cycle_id, chain_id, block_number, block_timestamp, gas_price, fee_history_json)
                         VALUES ($1, $2, $3, to_timestamp($4), $5, $6)`,
                        [
                            cycleId,
                            snapshot.chainId,
                            block.number || block.block_number,
                            block.timestamp,
                            block.baseFeePerGas || 0,
                            JSON.stringify(snapshot.blockData.feeHistory || {})
                        ]
                    )
                );
            }

            // Entity snapshots
            for (const entity of snapshot.entitySnapshots) {
                queries.push(
                    dbService.query(
                        `INSERT INTO mc_entity_snapshots (cycle_id, registry_id, balance, nonce, is_contract, code_hash)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            cycleId,
                            entity.contract.id,
                            entity.balance,
                            entity.nonce,
                            entity.code !== '0x' || entity.classHash !== '0x',
                            entity.code ? ethers.keccak256(entity.code) : entity.classHash
                        ]
                    )
                );
            }

            // Event logs
            for (const log of snapshot.eventLogs) {
                queries.push(
                    dbService.query(
                        `INSERT INTO mc_event_logs (cycle_id, registry_id, block_number, tx_hash, topic0, data)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [cycleId, null, log.blockNumber, log.transactionHash, log.topics[0], log.data]
                    )
                );
            }
        }

        // Execute all queries in parallel
        await Promise.allSettled(queries);
        console.log(`[ParallelIndexer] Saved ${queries.length} records across ${snapshots.length} chains`);
    }
}

export const parallelIndexer = new ParallelIndexer();
