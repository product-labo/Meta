#!/usr/bin/env node

import { LiskRpcClient } from './src/services/LiskRpcClient.js';

async function testOptimizedClient() {
  console.log('🧪 Testing Optimized Lisk RPC Client...\n');
  
  const client = new LiskRpcClient('https://rpc.api.lisk.com', {
    timeout: 30000,
    retries: 2
  });
  
  try {
    // Test basic connectivity
    console.log('📡 Testing basic connectivity...');
    const blockNumber = await client.getBlockNumber();
    console.log(`✅ Current block: ${blockNumber}\n`);
    
    // Test contract analysis with wider range
    const contractAddress = '0x05D032ac25d322df992303dCa074EE7392C117b9';
    const fromBlock = blockNumber - 10000; // Check last 10k blocks
    const toBlock = blockNumber;
    
    console.log(`🔍 Testing contract analysis for ${contractAddress}`);
    console.log(`📦 Block range: ${fromBlock} to ${toBlock} (${toBlock - fromBlock + 1} blocks)\n`);
    
    const startTime = Date.now();
    const result = await client.getTransactionsByAddress(contractAddress, fromBlock, toBlock);
    const endTime = Date.now();
    
    console.log(`\n⏱️  Analysis completed in ${endTime - startTime}ms`);
    console.log(`📊 Results:`);
    console.log(`   - Transactions: ${result.transactions.length}`);
    console.log(`   - Events: ${result.events.length}`);
    console.log(`   - Summary:`, result.summary);
    
    if (result.transactions.length > 0) {
      console.log(`\n📋 Sample transaction:`);
      console.log(JSON.stringify(result.transactions[0], null, 2));
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testOptimizedClient().catch(console.error);