#!/usr/bin/env node

/**
 * Focused Multi-Chain RPC Client Test
 * Quick test of Lisk, Ethereum, and Starknet RPC clients
 * Using addresses from environment variables
 */

import dotenv from 'dotenv';
import { LiskRpcClient } from './src/services/LiskRpcClient_Optimized.js';
import { EthereumRpcClient } from './src/services/EthereumRpcClient.js';
import { StarknetRpcClient } from './src/services/StarknetRpcClient.js';

// Load environment variables
dotenv.config();

async function testRpcClient(chainName, client, testAddress, testName) {
  console.log(`\n🔗 Testing ${chainName.toUpperCase()} - ${testName}`);
  console.log(`📍 Address: ${testAddress}`);
  console.log(`🌐 RPC: ${client.getRpcUrl()}`);
  
  try {
    // Test 1: Basic connectivity
    console.log('   📡 Testing connectivity...');
    const blockNumber = await client.getBlockNumber();
    console.log(`   ✅ Connected! Current block: ${blockNumber}`);
    
    // Test 2: Block retrieval
    console.log('   📦 Testing block retrieval...');
    const block = await client.getBlock(blockNumber);
    console.log(`   ✅ Block retrieved! Transactions: ${block.transactions?.length || 0}`);
    
    // Test 3: Transaction analysis (limited range for quick test)
    console.log('   📊 Testing transaction analysis...');
    const fromBlock = Math.max(1, blockNumber - 100); // Small range for quick test
    const toBlock = blockNumber;
    
    const startTime = Date.now();
    const result = await client.getTransactionsByAddress(testAddress, fromBlock, toBlock);
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Analysis complete!`);
    console.log(`      📦 Blocks analyzed: ${toBlock - fromBlock + 1}`);
    console.log(`      🔗 Transactions found: ${result.transactions?.length || 0}`);
    console.log(`      📋 Events found: ${result.events?.length || 0}`);
    console.log(`      ⏱️  Duration: ${duration}ms`);
    
    return {
      success: true,
      blockNumber,
      transactionCount: result.transactions?.length || 0,
      eventCount: result.events?.length || 0,
      duration
    };
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runFocusedTests() {
  console.log('🧪 FOCUSED MULTI-CHAIN RPC CLIENT TEST');
  console.log('=' .repeat(50));
  console.log(`📅 Started: ${new Date().toISOString()}\n`);
  
  const results = {};
  
  // Test Lisk RPC Clients
  console.log('🟦 LISK CHAIN TESTS');
  console.log('-' .repeat(30));
  
  const liskClient = new LiskRpcClient(process.env.LISK_RPC_URL1, { timeout: 30000 });
  
  // Test Lisk target
  if (process.env.LISK_TARGET_ADDRESS) {
    results.lisk_target = await testRpcClient(
      'lisk',
      liskClient,
      process.env.LISK_TARGET_ADDRESS,
      'Target Contract'
    );
  }
  
  // Test Lisk competitors
  if (process.env.LISK_COMPETITOR_1) {
    results.lisk_competitor_1 = await testRpcClient(
      'lisk',
      liskClient,
      process.env.LISK_COMPETITOR_1,
      'Competitor 1'
    );
  }
  
  if (process.env.LISK_COMPETITOR_2) {
    results.lisk_competitor_2 = await testRpcClient(
      'lisk',
      liskClient,
      process.env.LISK_COMPETITOR_2,
      'Competitor 2'
    );
  }
  
  // Test Ethereum RPC Clients
  console.log('\n🟨 ETHEREUM CHAIN TESTS');
  console.log('-' .repeat(30));
  
  const ethereumClient = new EthereumRpcClient(process.env.ETHEREUM_RPC_URL, { timeout: 30000 });
  
  // Test Ethereum target
  if (process.env.ETHEREUM_TARGET_ADDRESS) {
    results.ethereum_target = await testRpcClient(
      'ethereum',
      ethereumClient,
      process.env.ETHEREUM_TARGET_ADDRESS,
      'Target Contract'
    );
  }
  
  // Test Ethereum competitors
  const ethereumCompetitors = [
    { env: 'ETHEREUM_COMPETITOR_1', name: 'SushiSwap Router' },
    { env: 'ETHEREUM_COMPETITOR_2', name: '1inch Router' },
    { env: 'ETHEREUM_COMPETITOR_3', name: 'Uniswap V3 Router' },
    { env: 'ETHEREUM_COMPETITOR_4', name: '0x Exchange' }
  ];
  
  for (let i = 0; i < ethereumCompetitors.length; i++) {
    const competitor = ethereumCompetitors[i];
    if (process.env[competitor.env]) {
      results[`ethereum_competitor_${i + 1}`] = await testRpcClient(
        'ethereum',
        ethereumClient,
        process.env[competitor.env],
        competitor.name
      );
    }
  }
  
  // Test Starknet RPC Clients
  console.log('\n🟧 STARKNET CHAIN TESTS');
  console.log('-' .repeat(30));
  
  const starknetClient = new StarknetRpcClient(process.env.STARKNET_RPC_URL1);
  
  // Test Starknet target
  if (process.env.STARKNET_TARGET_ADDRESS) {
    results.starknet_target = await testRpcClient(
      'starknet',
      starknetClient,
      process.env.STARKNET_TARGET_ADDRESS,
      'Target Contract (ETH Token)'
    );
  }
  
  // Test Starknet competitors
  if (process.env.STARKNET_COMPETITOR_1) {
    results.starknet_competitor_1 = await testRpcClient(
      'starknet',
      starknetClient,
      process.env.STARKNET_COMPETITOR_1,
      'Competitor 1'
    );
  }
  
  if (process.env.STARKNET_COMPETITOR_2) {
    results.starknet_competitor_2 = await testRpcClient(
      'starknet',
      starknetClient,
      process.env.STARKNET_COMPETITOR_2,
      'Competitor 2'
    );
  }
  
  // Generate summary report
  console.log('\n📋 TEST SUMMARY REPORT');
  console.log('=' .repeat(50));
  
  let totalTests = 0;
  let passedTests = 0;
  let totalTransactions = 0;
  let totalEvents = 0;
  let totalDuration = 0;
  
  for (const [testName, result] of Object.entries(results)) {
    totalTests++;
    if (result.success) {
      passedTests++;
      totalTransactions += result.transactionCount || 0;
      totalEvents += result.eventCount || 0;
      totalDuration += result.duration || 0;
    }
    
    const status = result.success ? '✅' : '❌';
    const chain = testName.split('_')[0].toUpperCase();
    const type = testName.split('_').slice(1).join(' ').toUpperCase();
    
    console.log(`${status} ${chain} ${type}: ${result.success ? 
      `${result.transactionCount || 0} txs, ${result.eventCount || 0} events (${result.duration}ms)` : 
      result.error}`);
  }
  
  console.log('\n📊 OVERALL STATISTICS:');
  console.log(`   🧪 Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${totalTests - passedTests}`);
  console.log(`   📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log(`   🔗 Total Transactions Found: ${totalTransactions}`);
  console.log(`   📋 Total Events Found: ${totalEvents}`);
  console.log(`   ⏱️  Total Analysis Time: ${totalDuration}ms`);
  
  // Save results to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(1),
      totalTransactions,
      totalEvents,
      totalDuration
    },
    results
  };
  
  console.log('\n💾 Saving detailed report to: focused-rpc-test-report.json');
  
  // Write report to file
  import('fs').then(fs => {
    fs.writeFileSync('focused-rpc-test-report.json', JSON.stringify(report, null, 2));
    console.log('✅ Report saved successfully!');
  });
}

// Run the focused tests
runFocusedTests().catch(console.error);