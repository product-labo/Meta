import { rpcPool } from '../services/RpcPool';
import { dbService } from '../services/DbService';
import { dataRotator } from '../services/DataRotator';
import { transactionProcessor } from '../services/TransactionProcessor';
import { decoderService } from '../services/DecoderService';
import { ethers } from 'ethers';
import { RpcProvider, hash, num, Contract, CallData } from 'starknet';

export class ChainWorkerSimple {
    private chainId: number;
    private isRunning: boolean = false;

    constructor(chainId: number) {
        this.chainId = chainId;
    }

    async start() {
        this.isRunning = true;
        this.processLoop();
    }

    stop() {
        this.isRunning = false;
    }

    private async processLoop() {
        while (this.isRunning) {
            try {
                await this.dispatchSnapshot();
            } catch (err: any) {
                console.error(`[ChainWorker ${this.chainId}] Error:`, err.message);
            }
            await new Promise(r => setTimeout(r, 10000));
        }
    }

    private async dispatchSnapshot() {
        const provider = rpcPool.getProvider(this.chainId);
        if (provider instanceof RpcProvider) {
            await this.captureStarknetSnapshot(provider);
        } else {
            await this.captureEvmSnapshot(provider as ethers.JsonRpcProvider);
        }
    }

    private async captureEvmSnapshot(provider: ethers.JsonRpcProvider) {
        const cycleId = dataRotator.getCurrentCycleId();
        if (!cycleId) return;

        console.log(`[ChainWorker ${this.chainId}] Capturing EVM snapshot for cycle ${cycleId}`);

        try {
            const latestBlock = await provider.getBlockNumber();
            console.log(`[ChainWorker ${this.chainId}] Latest block: ${latestBlock}`);

            // Get last processed block for this chain
            const lastProcessedResult = await dbService.query(
                'SELECT last_block FROM mc_chain_progress WHERE chain_id = $1',
                [this.chainId]
            );

            const startBlock = lastProcessedResult.rows[0]?.last_block || latestBlock - 10;
            const endBlock = Math.min(startBlock + 50, latestBlock);

            console.log(`[ChainWorker ${this.chainId}] Processing blocks ${startBlock} to ${endBlock}`);

            for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
                const block = await provider.getBlock(blockNum, true);
                if (!block) continue;

                console.log(`[ChainWorker ${this.chainId}] Block ${blockNum}: ${block.transactions.length} transactions`);

                for (const tx of block.transactions) {
                    if (typeof tx === 'string') continue;
                    
                    const receipt = await provider.getTransactionReceipt(tx.hash);
                    if (!receipt) continue;

                    // Process transaction
                    const processedTx = await transactionProcessor.processTransaction(tx, receipt, this.chainId);
                    
                    // Decode contract interactions
                    if (tx.to) {
                        const decoded = await decoderService.decodeTransaction(tx, this.chainId);
                        console.log(`[ChainWorker ${this.chainId}] TX ${tx.hash}:`, {
                            to: tx.to,
                            value: tx.value?.toString(),
                            decoded: decoded
                        });
                    }

                    // Log event instead of Kafka
                    console.log(`[ChainWorker ${this.chainId}] Processed TX:`, {
                        hash: tx.hash,
                        block: blockNum,
                        to: tx.to,
                        value: tx.value?.toString(),
                        gasUsed: receipt.gasUsed?.toString()
                    });
                }
            }

            // Update progress
            await dbService.query(
                'INSERT INTO mc_chain_progress (chain_id, last_block) VALUES ($1, $2) ON CONFLICT (chain_id) DO UPDATE SET last_block = $2',
                [this.chainId, endBlock]
            );

        } catch (error) {
            console.error(`[ChainWorker ${this.chainId}] EVM snapshot error:`, error);
        }
    }

    private async captureStarknetSnapshot(provider: RpcProvider) {
        const cycleId = dataRotator.getCurrentCycleId();
        if (!cycleId) return;

        console.log(`[ChainWorker ${this.chainId}] Capturing StarkNet snapshot for cycle ${cycleId}`);

        try {
            const latestBlock = await provider.getBlockNumber();
            console.log(`[ChainWorker ${this.chainId}] StarkNet latest block: ${latestBlock}`);

            // Get last processed block
            const lastProcessedResult = await dbService.query(
                'SELECT last_block FROM mc_chain_progress WHERE chain_id = $1',
                [this.chainId]
            );

            const startBlock = lastProcessedResult.rows[0]?.last_block || latestBlock - 10;
            const endBlock = Math.min(startBlock + 20, latestBlock);

            console.log(`[ChainWorker ${this.chainId}] Processing StarkNet blocks ${startBlock} to ${endBlock}`);

            for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
                const block = await provider.getBlockWithTxs(blockNum);
                if (!block) continue;

                console.log(`[ChainWorker ${this.chainId}] StarkNet Block ${blockNum}: ${block.transactions.length} transactions`);

                for (const tx of block.transactions) {
                    console.log(`[ChainWorker ${this.chainId}] StarkNet TX:`, {
                        hash: tx.transaction_hash,
                        type: tx.type,
                        sender: tx.sender_address,
                        calldata: tx.calldata?.slice(0, 5)
                    });
                }
            }

            // Update progress
            await dbService.query(
                'INSERT INTO mc_chain_progress (chain_id, last_block) VALUES ($1, $2) ON CONFLICT (chain_id) DO UPDATE SET last_block = $2',
                [this.chainId, endBlock]
            );

        } catch (error) {
            console.error(`[ChainWorker ${this.chainId}] StarkNet snapshot error:`, error);
        }
    }
}
