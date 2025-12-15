import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';

interface ProjectIndexingConfig {
    userId: string;
    projectId: string;
    contractAddress: string;
    chain: string;
    abi: string;
    startBlock?: number;
}

// Chain ID mapping
const CHAIN_IDS: { [key: string]: number } = {
    'ethereum': 1,
    'polygon': 137,
    'lisk': 4202,
    'bsc': 56,
    'arbitrum': 42161,
    'optimism': 10,
    'starknet': 0x534e5f4d41494e // Starknet mainnet
};

// RPC URLs for different chains
const RPC_URLS: { [key: string]: string } = {
    'ethereum': 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    'polygon': 'https://polygon-rpc.com',
    'lisk': 'https://rpc.sepolia-api.lisk.com',
    'bsc': 'https://bsc-dataseed.binance.org',
    'arbitrum': 'https://arb1.arbitrum.io/rpc',
    'optimism': 'https://mainnet.optimism.io'
};

export class IndexerService {
    private indexerPath: string;

    constructor() {
        this.indexerPath = path.join(process.cwd(), 'indexer', 'custom-contract-indexer');
    }

    /**
     * Start indexing for a user's project contract
     */
    async startProjectIndexing(config: ProjectIndexingConfig): Promise<void> {
        try {
            console.log(`🔍 Starting indexing for project ${config.projectId}`);
            
            // Create custom config for this project
            const indexerConfig = this.createIndexerConfig(config);
            
            // Write config file
            const configPath = path.join(this.indexerPath, `project-${config.projectId}-config.json`);
            writeFileSync(configPath, JSON.stringify(indexerConfig, null, 2));
            
            // Start the indexer process
            await this.runIndexer(configPath, config.userId, config.projectId);
            
            console.log(`✅ Indexing started for project ${config.projectId}`);
        } catch (error) {
            console.error(`❌ Failed to start indexing for project ${config.projectId}:`, error);
            throw error;
        }
    }

    /**
     * Create indexer configuration from project details
     */
    private createIndexerConfig(config: ProjectIndexingConfig) {
        const chainId = CHAIN_IDS[config.chain.toLowerCase()];
        const rpcUrl = RPC_URLS[config.chain.toLowerCase()];
        
        if (!chainId || !rpcUrl) {
            throw new Error(`Unsupported chain: ${config.chain}`);
        }

        // Parse ABI (handle both JSON string and array)
        let abi;
        try {
            abi = typeof config.abi === 'string' ? JSON.parse(config.abi) : config.abi;
        } catch (error) {
            throw new Error(`Invalid ABI format: ${error.message}`);
        }

        return {
            chains: {
                [chainId]: rpcUrl
            },
            contracts: [
                {
                    chainId: chainId,
                    address: config.contractAddress,
                    startBlock: config.startBlock || 'latest',
                    abi: abi,
                    metadata: {
                        userId: config.userId,
                        projectId: config.projectId,
                        chain: config.chain
                    }
                }
            ]
        };
    }

    /**
     * Run the indexer process
     */
    private async runIndexer(configPath: string, userId: string, projectId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const indexerProcess = spawn('node', ['run-custom-indexer.js', configPath], {
                cwd: this.indexerPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Log indexer output with user/project context
            indexerProcess.stdout.on('data', (data) => {
                console.log(`[Indexer:${projectId}] ${data.toString().trim()}`);
            });

            indexerProcess.stderr.on('data', (data) => {
                console.error(`[Indexer:${projectId}] ERROR: ${data.toString().trim()}`);
            });

            indexerProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Indexer completed for project ${projectId}`);
                    resolve();
                } else {
                    console.error(`❌ Indexer failed for project ${projectId} with code ${code}`);
                    reject(new Error(`Indexer process exited with code ${code}`));
                }
            });

            indexerProcess.on('error', (error) => {
                console.error(`❌ Failed to start indexer for project ${projectId}:`, error);
                reject(error);
            });

            // Don't wait for completion, let it run in background
            setTimeout(() => {
                console.log(`🚀 Indexer process started for project ${projectId}`);
                resolve();
            }, 2000);
        });
    }

    /**
     * Stop indexing for a specific project
     */
    async stopProjectIndexing(projectId: string): Promise<void> {
        // Implementation to stop specific indexer process
        // This would require tracking running processes by projectId
        console.log(`🛑 Stopping indexing for project ${projectId}`);
    }

    /**
     * Get indexing status for a project
     */
    async getIndexingStatus(projectId: string): Promise<any> {
        // Query the indexer database for this project's status
        // This would check the indexed_contracts table
        console.log(`📊 Getting indexing status for project ${projectId}`);
        return {
            projectId,
            status: 'running',
            lastIndexedBlock: 'unknown',
            transactionCount: 0,
            eventCount: 0
        };
    }
}

export const indexerService = new IndexerService();
