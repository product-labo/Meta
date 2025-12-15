
import { rpcPool } from '../services/RpcPool';
import { dbService } from '../services/DbService';
import { dataRotator } from '../services/DataRotator';
import { transactionProcessor } from '../services/TransactionProcessor';
import { decoderService } from '../services/DecoderService';
import { kafkaService } from '../services/KafkaService';
import { ethers } from 'ethers';
import { RpcProvider, hash, num, Contract, CallData } from 'starknet';

export class ChainWorker {
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

        // 1. Chain Data
        const block = await provider.getBlock('latest');
        const feeHistory = await provider.send('eth_feeHistory', [5, 'latest', [25, 50, 75]]).catch(() => null);

        if (block) {
            await dbService.query(
                `INSERT INTO mc_chain_snapshots (cycle_id, chain_id, block_number, block_timestamp, gas_price, fee_history_json)
                 VALUES ($1, $2, $3, to_timestamp($4), $5, $6)`,
                [
                    cycleId,
                    this.chainId,
                    block.number,
                    block.timestamp,
                    block.baseFeePerGas || 0,
                    JSON.stringify(feeHistory || {})
                ]
            );
        }

        // 2. Fetch Contracts
        const registry = await dbService.query('SELECT * FROM mc_registry WHERE chain_id = $1', [this.chainId]);

        // 3. Entity Snapshots
        const promises = registry.rows.map(async (contract) => {
            try {
                const [balance, nonce, code] = await Promise.all([
                    provider.getBalance(contract.address),
                    provider.getTransactionCount(contract.address),
                    provider.getCode(contract.address)
                ]);

                await dbService.query(
                    `INSERT INTO mc_entity_snapshots (cycle_id, registry_id, balance, nonce, is_contract, code_hash)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [cycleId, contract.id, balance.toString(), nonce, code !== '0x', ethers.keccak256(code)]
                );

                if (contract.monitor_events && block) {
                    const logs = await provider.getLogs({
                        address: contract.address,
                        fromBlock: block.number - 10,
                        toBlock: block.number
                    });

                    // Process logs with enhanced decoding
                    const processedTxs = new Set<string>();

                    for (const log of logs) {
                        // Save original event log
                        await dbService.query(
                            `INSERT INTO mc_event_logs (cycle_id, registry_id, block_number, tx_hash, topic0, data)
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [cycleId, contract.id, log.blockNumber, log.transactionHash, log.topics[0], log.data]
                        );

                        // Process full transaction (only once per tx)
                        if (!processedTxs.has(log.transactionHash)) {
                            processedTxs.add(log.transactionHash);
                            try {
                                await transactionProcessor.processTransaction(
                                    provider,
                                    log.transactionHash,
                                    cycleId,
                                    this.chainId
                                );
                            } catch (txError: any) {
                                // Log transaction processing errors but continue
                                console.warn(`[ChainWorker ${this.chainId}] Failed to process tx ${log.transactionHash}: ${txError.message}`);
                            }
                        }

                        // Decode and save the event
                        try {
                            const decodedEvent = await decoderService.decodeEvent(log.topics, log.data);
                            if (decodedEvent) {
                                await dbService.query(
                                    `INSERT INTO mc_decoded_events (
                                        cycle_id, registry_id, tx_hash, block_number, log_index,
                                        event_name, event_signature, decoded_data, raw_topics, raw_data
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                    ON CONFLICT DO NOTHING`,
                                    [
                                        cycleId, contract.id, log.transactionHash, log.blockNumber, log.index,
                                        decodedEvent.name, log.topics[0],
                                        decodedEvent.decoded ? JSON.stringify(decodedEvent.decoded, (key, value) =>
                                            typeof value === 'bigint' ? value.toString() : value
                                        ) : null,
                                        JSON.stringify(log.topics), log.data
                                    ]
                                );
                            }
                        } catch (eventError: any) {
                            // Continue processing even if event decoding fails
                            console.warn(`[ChainWorker ${this.chainId}] Failed to decode event in tx ${log.transactionHash}: ${eventError.message}`);
                        }

                        // 4. Stream Event to Kafka
                        const eventTopic = `chain.${this.chainId}.events`;
                        const eventPayload = {
                            chainId: this.chainId,
                            contractAddress: contract.address,
                            blockNumber: log.blockNumber,
                            txHash: log.transactionHash,
                            logIndex: log.index,
                            topics: log.topics,
                            data: log.data
                        };

                        kafkaService.sendEvent(eventTopic, contract.address, eventPayload);
                    }
                }
            } catch (e: any) {
                console.warn(`[ChainWorker ${this.chainId}] Failed EVM entity ${contract.address}: ${e.message}`);
            }
        });

        await Promise.all(promises);
    }

    private async captureStarknetSnapshot(provider: RpcProvider) {
        const cycleId = dataRotator.getCurrentCycleId();
        if (!cycleId) return;

        // 1. Chain Data
        const block = await provider.getBlock('latest');

        if (block) {
            // Starknet blocks have timestamp approx
            await dbService.query(
                `INSERT INTO mc_chain_snapshots (cycle_id, chain_id, block_number, block_timestamp, gas_price, fee_history_json)
                 VALUES ($1, $2, $3, to_timestamp($4), $5, $6)`,
                [
                    cycleId,
                    this.chainId,
                    block.block_number,
                    block.timestamp,
                    0, // Gas price usually in 'eth_gasPrice' or 'l1_gas_price' depending on version
                    JSON.stringify({}) // No fee history standard equivalent
                ]
            );
        }

        // 2. Fetch Contracts
        const registry = await dbService.query('SELECT * FROM mc_registry WHERE chain_id = $1', [this.chainId]);

        // 3. Entity Snapshots
        const promises = registry.rows.map(async (contract) => {
            try {
                // Starknet Nonce & Class Hash
                // For balance, we assume the contract IS a token or check ETH balance?
                // Starknet 'native' balance is usually checking ETH ERC20 contract: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
                // But for generic contract monitoring, let's just do Nonce + ClassHash

                const nonceValue = await provider.getNonceForAddress(contract.address).catch(() => '0');
                const classHash = await provider.getClassHashAt(contract.address).catch(() => '0x');

                // Balance Hack: Check ETH balance if it's a wallet, otherwise 0
                // Real impl would need Multicall to ETH contract. For now 0.
                const balance = '0';

                await dbService.query(
                    `INSERT INTO mc_entity_snapshots (cycle_id, registry_id, balance, nonce, is_contract, code_hash)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        cycleId,
                        contract.id,
                        balance,
                        parseInt(nonceValue, 16) || 0, // Nonce is hex
                        classHash !== '0x',
                        classHash
                    ]
                );

                // Logs not implemented for Starknet yet in this snippet (different filter syntax)

            } catch (e: any) {
                console.warn(`[ChainWorker ${this.chainId}] Failed Starknet entity ${contract.address}: ${e.message}`);
            }
        });

        await Promise.all(promises);
    }
}
