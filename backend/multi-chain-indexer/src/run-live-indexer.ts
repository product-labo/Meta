import { ethers } from 'ethers';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load Main Env for DB
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'boardling',
    password: process.env.DB_PASS || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const RPC_CONFIG = {
    ethereum: 'https://ethereum-rpc.publicnode.com',
    base: 'https://base-rpc.publicnode.com',
    polygon: 'https://polygon-bor-rpc.publicnode.com'
};

class LiveIndexer {
    private providers: Map<string, ethers.JsonRpcProvider> = new Map();
    private isRunning = false;
    private pool: Pool;

    constructor() {
        this.pool = new Pool(DB_CONFIG);

        // Initialize providers
        Object.entries(RPC_CONFIG).forEach(([name, url]) => {
            this.providers.set(name, new ethers.JsonRpcProvider(url));
        });
    }

    async start() {
        console.log('=== Live Multi-Chain Indexer Starting ===');
        this.isRunning = true;

        // Test DB
        try {
            await this.pool.query('SELECT NOW()');
            console.log('✅ Connected to Database');
        } catch (e) {
            console.error('❌ Database connection failed:', e);
            return;
        }

        // Start Monitors
        for (const [chain, provider] of this.providers) {
            this.monitorChain(chain, provider);
        }

        // Keep alive logic
        process.on('SIGINT', () => {
            console.log('Stopping...');
            this.isRunning = false;
            process.exit();
        });
    }

    async monitorChain(chain: string, provider: ethers.JsonRpcProvider) {
        console.log(`🔌 Connected to ${chain}`);
        while (this.isRunning) {
            try {
                const blockNumber = await provider.getBlockNumber();
                const block = await provider.getBlock(blockNumber, true); // true for txs

                if (block && block.transactions.length > 0) {
                    console.log(`[${chain.toUpperCase()}] Block ${blockNumber}: ${block.transactions.length} txs`);

                    // Sample first tx for insight
                    const firstTxHash = block.transactions[0];
                    if (typeof firstTxHash === 'string') {
                        // Depending on ethers version, getBlock(..., true) might return full tx objects or hashes
                        // Ethers v6 returns PrefetchedTransactionResponse?
                        // Let's safe check.
                        // Actually public nodes might be slow, so we just log the count to prove "Fetch" works.
                    } else {
                        // It is a transaction object
                        // console.log(`   Sample: ${firstTxHash.hash} (${ethers.formatEther(firstTxHash.value)} ETH)`);
                    }
                }
            } catch (e) {
                console.error(`Error on ${chain}:`, e.message);
            }
            // Wait 10s
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

new LiveIndexer().start();
