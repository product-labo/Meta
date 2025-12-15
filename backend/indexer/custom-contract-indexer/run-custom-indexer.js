#!/usr/bin/env node

import UltimateCustomIndexer from './ultimate-indexer.js';

async function main() {
  const indexer = new UltimateCustomIndexer();
  
  console.log('🚀 Ultimate Custom Contract Indexer');
  console.log('===================================\n');

  await indexer.initDatabase();

  // Check if config file provided
  const configFile = process.argv[2] || 'ultimate-config.json';
  
  try {
    console.log(`📁 Loading config from: ${configFile}`);
    indexer.loadContractsFromConfig(configFile);
  } catch (error) {
    console.error(`❌ Failed to load config: ${error.message}`);
    console.log('Using example configuration...');
    
    // Fallback example
    indexer.addChain(4202, [
      'https://rpc.sepolia-api.lisk.com',
      'https://lisk-sepolia.drpc.org'
    ]);

    indexer.addContract(4202, '0x577d9A43D0fa564886379bdD9A56285769683C38', [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)"
    ], 1000000, {
      resolveProxy: true,
      trackBalances: true
    });
  }

  // Start indexing
  console.log('🔥 Starting ultimate indexing with all features...');
  await indexer.startIndexing();

  // Show comprehensive stats every 30 seconds
  setInterval(() => {
    console.log('\n📊 Ultimate Performance Stats:');
    console.log('================================');
    const stats = indexer.getStats();
    
    console.log(`Transactions: ${stats.totalTransactions}`);
    console.log(`Events: ${stats.totalEvents}`);
    console.log(`Blocks: ${stats.totalBlocks}`);
    console.log(`Signature Lookups: ${stats.signatureLookups}`);
    console.log(`Cache Hits: ${stats.cacheHits}`);
    console.log(`Cache Size: ${stats.signatureCacheSize}`);
    console.log(`Errors: ${stats.errors}`);
    
    console.log('\nRPC Performance:');
    for (const [chainId, rpcStats] of Object.entries(stats.rpcStats)) {
      console.log(`  Chain ${chainId}: ${rpcStats.currentURL} (${Object.values(rpcStats.responseTimes).join('ms, ')}ms)`);
    }
    
    if (Object.keys(stats.errors).length > 0) {
      console.log('\nError Summary:');
      for (const [error, count] of Object.entries(stats.errors)) {
        console.log(`  ${error}: ${count}`);
      }
    }
  }, 30000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    console.log('\nFinal Stats:');
    console.log(JSON.stringify(indexer.getStats(), null, 2));
    process.exit(0);
  });
}

main().catch(console.error);
