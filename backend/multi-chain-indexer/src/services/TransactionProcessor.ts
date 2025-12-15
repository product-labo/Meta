import { ethers } from 'ethers';
import { dbService } from './DbService';
import { decoderService } from './DecoderService';

export class TransactionProcessor {
    
    /**
     * Process a transaction with full decoding and analysis
     */
    async processTransaction(
        provider: ethers.JsonRpcProvider,
        txHash: string,
        cycleId: number,
        chainId: number
    ): Promise<void> {
        try {
            // Get transaction and receipt
            const [tx, receipt] = await Promise.all([
                provider.getTransaction(txHash),
                provider.getTransactionReceipt(txHash)
            ]);

            if (!tx || !receipt) return;

            // Decode function call
            const decodedFunction = await decoderService.decodeFunction(tx.data);

            // Save transaction details
            await this.saveTransactionDetails(tx, receipt, decodedFunction, cycleId, chainId);

            // Process logs/events
            await this.processTransactionLogs(receipt.logs, cycleId, chainId, txHash);

            // Analyze for DeFi interactions
            if (decodedFunction && tx.to) {
                await this.analyzeDeFiInteraction(
                    decodedFunction,
                    tx.to,
                    tx.from,
                    txHash,
                    receipt.blockNumber,
                    cycleId,
                    chainId
                );
            }

        } catch (error) {
            console.error(`Failed to process transaction ${txHash}:`, error);
        }
    }

    /**
     * Save detailed transaction information
     */
    private async saveTransactionDetails(
        tx: ethers.TransactionResponse,
        receipt: ethers.TransactionReceipt,
        decodedFunction: any,
        cycleId: number,
        chainId: number
    ): Promise<void> {
        await dbService.query(
            `INSERT INTO mc_transaction_details (
                cycle_id, chain_id, tx_hash, block_number, tx_index,
                from_address, to_address, value, gas_price, gas_limit, gas_used,
                status, nonce, input_data, function_selector, function_name,
                decoded_input, error_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (tx_hash) DO NOTHING`,
            [
                cycleId,
                chainId,
                tx.hash,
                receipt.blockNumber,
                receipt.index,
                tx.from,
                tx.to,
                tx.value.toString(),
                tx.gasPrice?.toString() || '0',
                tx.gasLimit.toString(),
                receipt.gasUsed.toString(),
                receipt.status,
                tx.nonce,
                tx.data,
                decodedFunction?.selector || null,
                decodedFunction?.name || null,
                decodedFunction?.decoded ? JSON.stringify(decodedFunction.decoded, (key, value) => 
                    typeof value === 'bigint' ? value.toString() : value
                ) : null,
                receipt.status === 0 ? 'Transaction failed' : null
            ]
        );
    }

    /**
     * Process transaction logs with decoding
     */
    private async processTransactionLogs(
        logs: readonly ethers.Log[],
        cycleId: number,
        chainId: number,
        txHash: string
    ): Promise<void> {
        for (const log of logs) {
            try {
                // Decode the event
                const decodedEvent = await decoderService.decodeEvent(log.topics, log.data);

                // Save decoded event
                await dbService.query(
                    `INSERT INTO mc_decoded_events (
                        cycle_id, registry_id, tx_hash, block_number, log_index,
                        event_name, event_signature, decoded_data, raw_topics, raw_data
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        cycleId,
                        null, // Will be set if we have this contract in registry
                        txHash,
                        log.blockNumber,
                        log.index,
                        decodedEvent?.name || 'unknown',
                        log.topics[0],
                        decodedEvent?.decoded ? JSON.stringify(decodedEvent.decoded, (key, value) => 
                            typeof value === 'bigint' ? value.toString() : value
                        ) : null,
                        JSON.stringify(log.topics),
                        log.data
                    ]
                );

                // Check if it's a token transfer
                try {
                    const tokenTransfer = decoderService.detectTokenTransfer(decodedEvent, log.address);
                    if (tokenTransfer) {
                        await this.saveTokenTransfer(
                            tokenTransfer,
                            log,
                            txHash,
                            cycleId,
                            chainId
                        );
                    }
                } catch (transferError: any) {
                    console.warn(`Failed to process token transfer: ${transferError.message}`);
                }

                // Check if it's an NFT transfer
                try {
                    if (decodedEvent?.name === 'Transfer' && this.isNftTransfer(decodedEvent)) {
                        await this.saveNftTransfer(
                            decodedEvent,
                            log,
                            txHash,
                            cycleId,
                            chainId
                        );
                    }
                } catch (nftError: any) {
                    console.warn(`Failed to process NFT transfer: ${nftError.message}`);
                }

            } catch (error) {
                console.error(`Failed to process log ${log.index}:`, error);
            }
        }
    }

    /**
     * Save token transfer data
     */
    private async saveTokenTransfer(
        transfer: any,
        log: ethers.Log,
        txHash: string,
        cycleId: number,
        chainId: number
    ): Promise<void> {
        // Get token info (you might want to cache this)
        const tokenInfo = await this.getTokenInfo(transfer.tokenAddress, chainId);

        const formattedAmount = tokenInfo.decimals 
            ? ethers.formatUnits(transfer.amount, tokenInfo.decimals)
            : transfer.amount;

        await dbService.query(
            `INSERT INTO mc_token_transfers (
                cycle_id, chain_id, tx_hash, block_number, log_index,
                token_address, token_name, token_symbol, token_decimals,
                from_address, to_address, amount_raw, amount_formatted,
                transfer_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                cycleId,
                chainId,
                txHash,
                log.blockNumber,
                log.index,
                transfer.tokenAddress,
                tokenInfo.name,
                tokenInfo.symbol,
                tokenInfo.decimals,
                transfer.from,
                transfer.to,
                transfer.amount,
                formattedAmount,
                transfer.from === ethers.ZeroAddress ? 'mint' : 
                transfer.to === ethers.ZeroAddress ? 'burn' : 'transfer'
            ]
        );
    }

    /**
     * Analyze and save DeFi interactions
     */
    private async analyzeDeFiInteraction(
        decodedFunction: any,
        contractAddress: string,
        userAddress: string,
        txHash: string,
        blockNumber: number,
        cycleId: number,
        chainId: number
    ): Promise<void> {
        const defiInteraction = decoderService.detectDefiInteraction(
            decodedFunction,
            contractAddress,
            userAddress
        );

        if (defiInteraction) {
            await dbService.query(
                `INSERT INTO mc_defi_interactions (
                    cycle_id, chain_id, tx_hash, block_number,
                    protocol_name, interaction_type, user_address, contract_address,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    cycleId,
                    chainId,
                    txHash,
                    blockNumber,
                    defiInteraction.protocol,
                    defiInteraction.type,
                    userAddress,
                    contractAddress,
                    JSON.stringify(defiInteraction.metadata, (key, value) => 
                        typeof value === 'bigint' ? value.toString() : value
                    )
                ]
            );
        }
    }

    /**
     * Save NFT transfer
     */
    private async saveNftTransfer(
        decodedEvent: any,
        log: ethers.Log,
        txHash: string,
        cycleId: number,
        chainId: number
    ): Promise<void> {
        const { from, to, tokenId } = decodedEvent.decoded;

        await dbService.query(
            `INSERT INTO mc_nft_transfers (
                cycle_id, chain_id, tx_hash, block_number, log_index,
                contract_address, token_id, from_address, to_address, transfer_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                cycleId,
                chainId,
                txHash,
                log.blockNumber,
                log.index,
                log.address,
                tokenId?.toString() || '0',
                from,
                to,
                from === ethers.ZeroAddress ? 'mint' : 
                to === ethers.ZeroAddress ? 'burn' : 'transfer'
            ]
        );
    }

    /**
     * Get token information
     */
    private async getTokenInfo(tokenAddress: string, chainId: number): Promise<{
        name: string;
        symbol: string;
        decimals: number;
    }> {
        // This would typically be cached or fetched from a token database
        // For now, return defaults
        return {
            name: 'Unknown Token',
            symbol: 'UNK',
            decimals: 18
        };
    }

    /**
     * Check if transfer is NFT (has tokenId parameter)
     */
    private isNftTransfer(decodedEvent: any): boolean {
        return decodedEvent?.decoded?.tokenId !== undefined;
    }

    /**
     * Update address analytics
     */
    async updateAddressAnalytics(
        address: string,
        chainId: number,
        cycleId: number,
        transactionCount: number,
        totalValueIn: string,
        totalValueOut: string
    ): Promise<void> {
        await dbService.query(
            `INSERT INTO mc_address_analytics (
                cycle_id, chain_id, address, address_type, transaction_count,
                total_value_in, total_value_out, risk_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (cycle_id, chain_id, address) 
            DO UPDATE SET 
                transaction_count = $5,
                total_value_in = $6,
                total_value_out = $7`,
            [
                cycleId,
                chainId,
                address,
                'unknown', // Would be determined by analysis
                transactionCount,
                totalValueIn,
                totalValueOut,
                50 // Default risk score
            ]
        );
    }
}

export const transactionProcessor = new TransactionProcessor();