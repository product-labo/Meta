#!/usr/bin/env node

const { Pool } = require('pg');
const { ethers } = require('ethers');
require('dotenv').config();

class SimpleMultiChainIndexer {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT || 5432,
    });
    
    this.providers = new Map();
    this.isRunning = false;
    this.workers = new Map();
  }

  async initialize() {
    console.log('🚀 Multi-Chain Indexer Starting...');
    
    // Get active chains from database
    const chains = await this.pool.query(`
      SELECT id, name, chain_id, rpc_url 
      FROM mc_chains 
      WHERE is_active = true AND rpc_url IS NOT NULL
    `);

    console.log(`📊 Found ${chains.rowCount} active chains`);

    // Initialize providers for each chain
    for (const chain of chains.rows) {
      try {
        const provider = new ethers.JsonRpcProvider(chain.rpc_url);
        
        // Test connection
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        
        this.providers.set(chain.id, {
          provider,
          name: chain.name,
          chainId: chain.chain_id,
          rpcUrl: chain.rpc_url,
          currentBlock: blockNumber
        });
        
        console.log(`✅ ${chain.name} (${chain.chain_id}): Block ${blockNumber}`);
        
      } catch (error) {
        console.warn(`⚠️ ${chain.name}: Connection failed - ${error.message}`);
      }
    }

    console.log(`🌐 Initialized ${this.providers.size} chain providers`);
  }

  async startIndexing() {
    this.isRunning = true;
    console.log('\n🔄 Starting multi-chain indexing...');

    // Start a worker for each chain
    for (const [chainId, chainInfo] of this.providers) {
      this.startChainWorker(chainId, chainInfo);
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping multi-chain indexer...');
      this.isRunning = false;
      process.exit(0);
    });

    console.log('✅ All chain workers started');
    console.log('📊 Indexing in progress... Press Ctrl+C to stop\n');
  }

  async startChainWorker(chainId, chainInfo) {
    const workerName = `${chainInfo.name}-${chainId}`;
    
    console.log(`🔧 Starting worker: ${workerName}`);

    const worker = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(worker);
        return;
      }

      try {
        const currentBlock = await chainInfo.provider.getBlockNumber();
        
        // Simple block monitoring - just log new blocks
        if (currentBlock > chainInfo.currentBlock) {
          const newBlocks = currentBlock - chainInfo.currentBlock;
          console.log(`📦 ${chainInfo.name}: +${newBlocks} blocks (${currentBlock})`);
          
          // Update stored block number
          chainInfo.currentBlock = currentBlock;
          
          // Here you would add actual transaction/event processing
          await this.processNewBlocks(chainId, chainInfo, newBlocks);
        }

      } catch (error) {
        console.error(`❌ ${workerName}: ${error.message}`);
      }
    }, 5000); // Check every 5 seconds

    this.workers.set(chainId, worker);
  }

  async processNewBlocks(chainId, chainInfo, blockCount) {
    // Simplified block processing - just count activity
    try {
      const block = await chainInfo.provider.getBlock('latest');
      if (block && block.transactions.length > 0) {
        console.log(`   📝 ${chainInfo.name}: ${block.transactions.length} transactions in latest block`);
      }
    } catch (error) {
      // Skip processing errors
    }
  }

  async getStats() {
    const stats = {
      activeChains: this.providers.size,
      runningWorkers: this.workers.size,
      chains: {}
    };

    for (const [chainId, chainInfo] of this.providers) {
      stats.chains[chainInfo.name] = {
        chainId: chainInfo.chainId,
        currentBlock: chainInfo.currentBlock,
        rpc: new URL(chainInfo.rpcUrl).hostname
      };
    }

    return stats;
  }
}

async function main() {
  const indexer = new SimpleMultiChainIndexer();
  
  try {
    await indexer.initialize();
    await indexer.startIndexing();
    
    // Show stats every 30 seconds
    setInterval(async () => {
      const stats = await indexer.getStats();
      console.log('\n📊 Multi-Chain Stats:');
      console.log(`   Active Chains: ${stats.activeChains}`);
      console.log(`   Running Workers: ${stats.runningWorkers}`);
      
      for (const [name, info] of Object.entries(stats.chains)) {
        console.log(`   ${name}: Block ${info.currentBlock} (${info.rpc})`);
      }
      console.log('');
    }, 30000);
    
  } catch (error) {
    console.error('❌ Indexer failed to start:', error.message);
    process.exit(1);
  }
}

main();
