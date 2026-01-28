#!/usr/bin/env node

/**
 * Multi-Chain RPC Client Test Suite
 * Tests Lisk, Ethereum, and Starknet RPC clients with various scenarios
 * Including target contracts and competitor analysis
 */

import dotenv from 'dotenv';
import { LiskRpcClient } from './src/services/LiskRpcClient_Optimized.js';
import { EthereumRpcClient } from './src/services/EthereumRpcClient.js';
import { StarknetRpcClient } from './src/services/StarknetRpcClient.js';

// Load environment variables
dotenv.config();

class MultiChainRpcTester {
  constructor() {
    this.results = {
      lisk: { passed: 0, failed: 0, tests: [] },
      ethereum: { passed: 0, failed: 0, tests: [] },
      starknet: { passed: 0, failed: 0, tests: [] }
    };
    
    this.testConfig = {
      blockRange: parseInt(process.env.TEST_BLOCK_RANGE) || 1000,
      timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
      maxRetries: parseInt(process.env.TEST_MAX_RETRIES) || 3
    };
  }

  /**
   * Initialize RPC clients for all chains
   */
  initializeClients() {
    console.log('🚀 Initializing Multi-Chain RPC Clients...\n');
    
    // Lisk clients with failover
    this.liskClients = [
      new LiskRpcClient(process.env.LISK_RPC_URL1, { timeout: this.testConfig.timeout }),
      new LiskRpcClient(process.env.LISK_RPC_URL2, { timeout: this.testConfig.timeout }),
      new LiskRpcClient(process.env.LISK_RPC_URL3, { timeout: this.testConfig.timeout }),
      new LiskRpcClient(process.env.LISK_RPC_URL4, { timeout: this.testConfig.timeout })
    ];
    
    // Ethereum clients with failover
    this.ethereumClients = [
      new EthereumRpcClient(process.env.ETHEREUM_RPC_URL, { timeout: this.testConfig.timeout }),
      new EthereumRpcClient(process.env.ETHEREUM_RPC_URL_FALLBACK, { timeout: this.testConfig.timeout })
    ];
    
    // Starknet clients with failover
    this.starknetClients = [
      new StarknetRpcClient(process.env.STARKNET_RPC_URL1),
      new StarknetRpcClient(process.env.STARKNET_RPC_URL2),
      new StarknetRpcClient(process.env.STARKNET_RPC_URL3)
    ];
    
    console.log(`✅ Initialized ${this.liskClients.length} Lisk clients`);
    console.log(`✅ Initialized ${this.ethereumClients.length} Ethereum clients`);
    console.log(`✅ Initialized ${this.starknetClients.length} Starknet clients\n`);
  }

  /**
   * Test basic RPC connectivity for all chains
   */
  async testConnectivity() {
    console.log('🔗 Testing RPC Connectivity...\n');
    
    // Test Lisk connectivity
    console.log('📡 Testing Lisk RPC endpoints:');
    for (let i = 0; i < this.liskClients.length; i++) {
      const client = this.liskClients[i];
      try {
        const blockNumber = await client.getBlockNumber();
        console.log(`   ✅ Lisk RPC ${i + 1}: Connected (Block: ${blockNumber})`);
        this.recordTest('lisk', `connectivity_rpc_${i + 1}`, true, `Block: ${blockNumber}`);
      } catch (error) {
        console.log(`   ❌ Lisk RPC ${i + 1}: Failed - ${error.message}`);
        this.recordTest('lisk', `connectivity_rpc_${i + 1}`, false, error.message);
      }
    }
    
    // Test Ethereum connectivity
    console.log('\n📡 Testing Ethereum RPC endpoints:');
    for (let i = 0; i < this.ethereumClients.length; i++) {
      const client = this.ethereumClients[i];
      try {
        const blockNumber = await client.getBlockNumber();
        console.log(`   ✅ Ethereum RPC ${i + 1}: Connected (Block: ${blockNumber})`);
        this.recordTest('ethereum', `connectivity_rpc_${i + 1}`, true, `Block: ${blockNumber}`);
      } catch (error) {
        console.log(`   ❌ Ethereum RPC ${i + 1}: Failed - ${error.message}`);
        this.recordTest('ethereum', `connectivity_rpc_${i + 1}`, false, error.message);
      }
    }
    
    // Test Starknet connectivity
    console.log('\n📡 Testing Starknet RPC endpoints:');
    for (let i = 0; i < this.starknetClients.length; i++) {
      const client = this.starknetClients[i];
      try {
        const blockNumber = await client.getBlockNumber();
        console.log(`   ✅ Starknet RPC ${i + 1}: Connected (Block: ${blockNumber})`);
        this.recordTest('starknet', `connectivity_rpc_${i + 1}`, true, `Block: ${blockNumber}`);
      } catch (error) {
        console.log(`   ❌ Starknet RPC ${i + 1}: Failed - ${error.message}`);
        this.recordTest('starknet', `connectivity_rpc_${i + 1}`, false, error.message);
      }
    }
    
    console.log('\n');
  }

  /**
   * Test target contract analysis scenarios
   */
  async testTargetContracts() {
    console.log('🎯 Testing Target Contract Analysis...\n');
    
    // Lisk target contract
    await this.testContractAnalysis(
      'lisk',
      this.liskClients[0],
      process.env.LISK_TARGET_ADDRESS,
      'target_contract'
    );
    
    // Ethereum target contract
    await this.testContractAnalysis(
      'ethereum',
      this.ethereumClients[0],
      process.env.ETHEREUM_TARGET_ADDRESS,
      'target_contract'
    );
    
    // Starknet target contract
    await this.testContractAnalysis(
      'starknet',
      this.starknetClients[0],
      process.env.STARKNET_TARGET_ADDRESS,
      'target_contract'
    );
  }

  /**
   * Test competitor contract analysis scenarios
   */
  async testCompetitorContracts() {
    console.log('🏆 Testing Competitor Contract Analysis...\n');
    
    // Lisk competitors
    const liskCompetitors = [
      process.env.LISK_COMPETITOR_1,
      process.env.LISK_COMPETITOR_2
    ];
    
    for (let i = 0; i < liskCompetitors.length; i++) {
      if (liskCompetitors[i]) {
        await this.testContractAnalysis(
          'lisk',
          this.liskClients[0],
          liskCompetitors[i],
          `competitor_${i + 1}`
        );
      }
    }
    
    // Ethereum competitors
    const ethereumCompetitors = [
      process.env.ETHEREUM_COMPETITOR_1,
      process.env.ETHEREUM_COMPETITOR_2,
      process.env.ETHEREUM_COMPETITOR_3,
      process.env.ETHEREUM_COMPETITOR_4
    ];
    
    for (let i = 0; i < ethereumCompetitors.length; i++) {
      if (ethereumCompetitors[i]) {
        await this.testContractAnalysis(
          'ethereum',
          this.ethereumClients[0],
          ethereumCompetitors[i],
          `competitor_${i + 1}`
        );
      }
    }
    
    // Starknet competitors
    const starknetCompetitors = [
      process.env.STARKNET_COMPETITOR_1,
      process.env.STARKNET_COMPETITOR_2
    ];
    
    for (let i = 0; i < starknetCompetitors.length; i++) {
      if (starknetCompetitors[i]) {
        await this.testContractAnalysis(
          'starknet',
          this.starknetClients[0],
          starknetCompetitors[i],
          `competitor_${i + 1}`
        );
      }
    }
  }

  /**
   * Test contract analysis for a specific address
   */
  async testContractAnalysis(chain, client, contractAddress, testType) {
    if (!contractAddress) {
      console.log(`   ⚠️  Skipping ${chain} ${testType}: No address configured`);
      return;
    }
    
    console.log(`📊 Testing ${chain.toUpperCase()} ${testType}: ${contractAddress}`);
    
    try {
      const currentBlock = await client.getBlockNumber();
      const fromBlock = Math.max(1, currentBlock - this.testConfig.blockRange);
      const toBlock = currentBlock;
      
      console.log(`   📦 Analyzing blocks ${fromBlock} to ${toBlock} (${toBlock - fromBlock + 1} blocks)`);
      
      const startTime = Date.now();
      const result = await client.getTransactionsByAddress(contractAddress, fromBlock, toBlock);
      const duration = Date.now() - startTime;
      
      const summary = {
        contractAddress,
        chain,
        blocksAnalyzed: toBlock - fromBlock + 1,
        transactionsFound: result.transactions?.length || 0,
        eventsFound: result.events?.length || 0,
        duration: `${duration}ms`,
        success: true
      };
      
      console.log(`   ✅ Analysis complete: ${summary.transactionsFound} transactions, ${summary.eventsFound} events (${duration}ms)`);
      this.recordTest(chain, `${testType}_analysis`, true, JSON.stringify(summary));
      
    } catch (error) {
      console.log(`   ❌ Analysis failed: ${error.message}`);
      this.recordTest(chain, `${testType}_analysis`, false, error.message);
    }
    
    console.log('');
  }

  /**
   * Test failover scenarios
   */
  async testFailoverScenarios() {
    console.log('🔄 Testing Failover Scenarios...\n');
    
    // Test Lisk failover
    console.log('📡 Testing Lisk RPC failover:');
    await this.testChainFailover('lisk', this.liskClients);
    
    // Test Ethereum failover
    console.log('📡 Testing Ethereum RPC failover:');
    await this.testChainFailover('ethereum', this.ethereumClients);
    
    // Test Starknet failover
    console.log('📡 Testing Starknet RPC failover:');
    await this.testChainFailover('starknet', this.starknetClients);
  }

  /**
   * Test failover for a specific chain
   */
  async testChainFailover(chain, clients) {
    let workingClients = 0;
    
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      try {
        const blockNumber = await client.getBlockNumber();
        console.log(`   ✅ ${chain.toUpperCase()} RPC ${i + 1}: Working (Block: ${blockNumber})`);
        workingClients++;
      } catch (error) {
        console.log(`   ❌ ${chain.toUpperCase()} RPC ${i + 1}: Failed - ${error.message}`);
      }
    }
    
    const failoverSuccess = workingClients > 0;
    console.log(`   📊 Failover result: ${workingClients}/${clients.length} clients working`);
    this.recordTest(chain, 'failover_test', failoverSuccess, `${workingClients}/${clients.length} working`);
    console.log('');
  }

  /**
   * Test performance scenarios
   */
  async testPerformanceScenarios() {
    console.log('⚡ Testing Performance Scenarios...\n');
    
    // Test different block ranges
    const blockRanges = [100, 500, 1000];
    
    for (const range of blockRanges) {
      console.log(`📊 Testing ${range} block range performance:`);
      
      // Test Lisk performance
      await this.testPerformance('lisk', this.liskClients[0], process.env.LISK_TARGET_ADDRESS, range);
      
      // Test Ethereum performance
      await this.testPerformance('ethereum', this.ethereumClients[0], process.env.ETHEREUM_TARGET_ADDRESS, range);
      
      // Test Starknet performance (smaller range due to different architecture)
      const starknetRange = Math.min(range, 50);
      await this.testPerformance('starknet', this.starknetClients[0], process.env.STARKNET_TARGET_ADDRESS, starknetRange);
      
      console.log('');
    }
  }

  /**
   * Test performance for a specific scenario
   */
  async testPerformance(chain, client, contractAddress, blockRange) {
    if (!contractAddress) {
      console.log(`   ⚠️  Skipping ${chain} performance test: No address configured`);
      return;
    }
    
    try {
      const currentBlock = await client.getBlockNumber();
      const fromBlock = Math.max(1, currentBlock - blockRange);
      const toBlock = currentBlock;
      
      const startTime = Date.now();
      const result = await client.getTransactionsByAddress(contractAddress, fromBlock, toBlock);
      const duration = Date.now() - startTime;
      
      const performance = {
        chain,
        blockRange,
        duration,
        transactionsPerSecond: result.transactions ? (result.transactions.length / (duration / 1000)).toFixed(2) : 0,
        blocksPerSecond: (blockRange / (duration / 1000)).toFixed(2)
      };
      
      console.log(`   ⚡ ${chain.toUpperCase()}: ${duration}ms for ${blockRange} blocks (${performance.blocksPerSecond} blocks/s)`);
      this.recordTest(chain, `performance_${blockRange}_blocks`, true, JSON.stringify(performance));
      
    } catch (error) {
      console.log(`   ❌ ${chain.toUpperCase()} performance test failed: ${error.message}`);
      this.recordTest(chain, `performance_${blockRange}_blocks`, false, error.message);
    }
  }

  /**
   * Record test result
   */
  recordTest(chain, testName, passed, details) {
    this.results[chain].tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    if (passed) {
      this.results[chain].passed++;
    } else {
      this.results[chain].failed++;
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('📋 MULTI-CHAIN RPC TEST REPORT');
    console.log('=' .repeat(50));
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [chain, results] of Object.entries(this.results)) {
      console.log(`\n🔗 ${chain.toUpperCase()} CHAIN:`);
      console.log(`   ✅ Passed: ${results.passed}`);
      console.log(`   ❌ Failed: ${results.failed}`);
      console.log(`   📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
      
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      // Show failed tests
      const failedTests = results.tests.filter(test => !test.passed);
      if (failedTests.length > 0) {
        console.log(`   ⚠️  Failed Tests:`);
        failedTests.forEach(test => {
          console.log(`      - ${test.name}: ${test.details}`);
        });
      }
    }
    
    console.log(`\n📊 OVERALL SUMMARY:`);
    console.log(`   ✅ Total Passed: ${totalPassed}`);
    console.log(`   ❌ Total Failed: ${totalFailed}`);
    console.log(`   📈 Overall Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
    
    // Save detailed report
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPassed,
        totalFailed,
        successRate: ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
      },
      chains: this.results,
      configuration: this.testConfig
    };
    
    console.log(`\n💾 Detailed report saved to: multi-chain-rpc-test-report.json`);
    
    // Write report to file
    import('fs').then(fs => {
      fs.writeFileSync('multi-chain-rpc-test-report.json', JSON.stringify(detailedReport, null, 2));
    });
  }

  /**
   * Run all test scenarios
   */
  async runAllTests() {
    console.log('🧪 MULTI-CHAIN RPC CLIENT TEST SUITE');
    console.log('=' .repeat(50));
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log(`⚙️  Configuration: ${this.testConfig.blockRange} blocks, ${this.testConfig.timeout}ms timeout\n`);
    
    try {
      this.initializeClients();
      await this.testConnectivity();
      await this.testTargetContracts();
      await this.testCompetitorContracts();
      await this.testFailoverScenarios();
      await this.testPerformanceScenarios();
      
    } catch (error) {
      console.error(`❌ Test suite failed: ${error.message}`);
    } finally {
      this.generateReport();
    }
  }
}

// Run the test suite
const tester = new MultiChainRpcTester();
tester.runAllTests().catch(console.error);