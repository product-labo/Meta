import dotenv from 'dotenv';
import path from 'path';
import { ethers } from 'ethers';
import { dbService } from './services/DbService';

dotenv.config({ path: path.join(__dirname, '../.env') });

class SimpleIndexer {
    private providers: Map<string, ethers.JsonRpcProvider> = new Map();
    private isRunning = false;

    constructor() {
        // Initialize providers
        this.providers.set('ethereum', new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC));
        this.providers.set('base', new ethers.JsonRpcProvider(process.env.BASE_RPC));
        this.providers.set('polygon', new ethers.JsonRpcProvider(process.env.POLYGON_RPC));
    }

    async start() {
        console.log('=== Simple Multi-Chain Indexer Starting ===');
        this.isRunning = true;

        // Test database connection
        try {
            await dbService.query('SELECT NOW()');
            console.log('[DB] Database connected successfully');
        } catch (error) {
            console.error('[DB] Database connection failed:', error);
            return;
        }

        // Start indexing each chain
        for (const [chainName, provider] of this.providers) {
            this.indexChain(chainName, provider);
        }

        process.on('SIGINT', () => {
            console.log('\nStopping indexer...');
            this.isRunning = false;
            process.exit(0);
        });
    }

    private async indexChain(chainName: string, provider: ethers.JsonRpcProvider) {
        console.log(`[${chainName}] Starting indexer...`);

        while (this.isRunning) {
            try {
                const latestBlock = await provider.getBlockNumber();
                console.log(`[${chainName}] Latest block: ${latestBlock}`);

                // Get recent blocks (last 5)
                const startBlock = Math.max(0, latestBlock - 5);
                
                for (let blockNum = startBlock; blockNum <= latestBlock; blockNum++) {
                    await this.processBlock(chainName, provider, blockNum);
                }

            } catch (error) {
                console.error(`[${chainName}] Error:`, error);
            }

            // Wait 30 seconds before next cycle
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    private async processBlock(chainName: string, provider: ethers.JsonRpcProvider, blockNumber: number) {
        try {
            const block = await provider.getBlock(blockNumber, true);
            if (!block || !block.transactions.length) return;

            console.log(`[${chainName}] Block ${blockNumber}: ${block.transactions.length} transactions`);

            for (const txHash of block.transactions) {
                if (typeof txHash !== 'string') continue;
                
                const tx = await provider.getTransaction(txHash);
                const receipt = await provider.getTransactionReceipt(txHash);
                
                if (!tx || !receipt) continue;

                // Analyze transaction
                const analysis = this.analyzeTransaction(tx, receipt);
                
                console.log(`[${chainName}] TX Analysis:`, {
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: ethers.formatEther(tx.value || 0),
                    gasUsed: receipt.gasUsed?.toString(),
                    status: receipt.status,
                    contractInteraction: analysis.isContractInteraction,
                    functionCall: analysis.functionSignature,
                    events: analysis.eventCount
                });

                // Log contract interactions with more detail
                if (analysis.isContractInteraction) {
                    console.log(`[${chainName}] CONTRACT INTERACTION:`, {
                        contract: tx.to,
                        function: analysis.functionSignature,
                        inputData: tx.data.slice(0, 20) + '...',
                        events: receipt.logs.length,
                        gasUsed: receipt.gasUsed?.toString()
                    });

                    // Log events
                    receipt.logs.forEach((log, i) => {
                        console.log(`[${chainName}] Event ${i}:`, {
                            address: log.address,
                            topics: log.topics.slice(0, 2),
                            data: log.data.slice(0, 20) + '...'
                        });
                    });
                }
            }

        } catch (error) {
            console.error(`[${chainName}] Block ${blockNumber} processing error:`, error);
        }
    }

    private analyzeTransaction(tx: ethers.TransactionResponse, receipt: ethers.TransactionReceipt) {
        const isContractInteraction = tx.to && tx.data && tx.data !== '0x';
        let functionSignature = 'unknown';

        if (isContractInteraction && tx.data.length >= 10) {
            const selector = tx.data.slice(0, 10);
            functionSignature = this.getFunctionName(selector);
        }

        return {
            isContractInteraction,
            functionSignature,
            eventCount: receipt.logs.length,
            gasUsed: receipt.gasUsed?.toString(),
            status: receipt.status
        };
    }

    private getFunctionName(selector: string): string {
        const commonFunctions: { [key: string]: string } = {
            '0xa9059cbb': 'transfer(address,uint256)',
            '0x23b872dd': 'transferFrom(address,address,uint256)',
            '0x095ea7b3': 'approve(address,uint256)',
            '0x70a08231': 'balanceOf(address)',
            '0x18160ddd': 'totalSupply()',
            '0x06fdde03': 'name()',
            '0x95d89b41': 'symbol()',
            '0x313ce567': 'decimals()',
            '0x7ff36ab5': 'swapExactETHForTokens(...)',
            '0x38ed1739': 'swapExactTokensForTokens(...)',
            '0x02751cec': 'removeLiquidity(...)',
            '0xe8e33700': 'addLiquidity(...)'
        };

        return commonFunctions[selector] || `Unknown(${selector})`;
    }
}

// Start the indexer
const indexer = new SimpleIndexer();
indexer.start();
