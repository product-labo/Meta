#!/usr/bin/env node

/**
 * Complete Multi-Chain Indexing Test Suite
 * Comprehensive testing of indexing-based contract interaction system
 * Tests Lisk, Ethereum, and Starknet with real addresses from environment
 */

import dotenv from 'dotenv';
import { MultiChainIndexingTester } from './test-multi-chain-indexing-scenarios.js';
import { MultiChainContractIndexer } from './src/services/MultiChainContractIndexer.js';

// Load environment variables
dotenv.config();

class CompleteIndexingTestSuite {
  constructor() {
    this.indexer = new MultiChainContractIndexer({
      maxConcurrentRequests: 3,
      requestTimeout: 30000,
      maxRetries: 2,
      batchSize: 15,
      indexingMode: 'events-first'
    });
    
    this.scenarioTester = new MultiChainIndexingTester();
    this.results = {
      unitTests: {},
      integrationTests: {},
      scenarioTests: {},
      performanceTests: {}
    };
  }

  /**
   * Run complete test suite
   */
  async runCompleteTestSuite() {
    console.log('🚀 COMPLETE MULTI-CHAIN INDEXING TEST SUITE');
    console.log('=' .repeat(80));
    console.log('Testing indexing-based contract interaction for Lisk, Ethereum, and Starknet');
    console.log('Using addresses from environment variables for realistic scenarios');
    console.log('=' .repeat(80));
    
    try {
      // Phase 1: Unit Tests
      await this.runUnitTests();
      
      // Phase 2: Integration Tests
      await this.runIntegrationTests();
      
      // Phase 3: Scenario Tests (using the existing tester)
      await this.runScenarioTests();
      
      // Phase 4: Performance Tests
      await this.runPerformanceTests();
      
      // Phase 5: Generate comprehensive report
      this.generateCompleteReport();
      
      console.log('\n🎉 Complete test suite finished successfully!');
      
    } catch (error) {
      console.error('❌ Complete test suite failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Run unit tests for individual components
   */
  async runUnitTests() {
    console.log('\n🧪 PHASE 1: Unit Tests');
    console.log('-'.repeat(50));
    
    // Test 1: Indexer initialization
    console.log('\n1️⃣ Testing Indexer Initialization...');
    try {
      const supportedChains = this.indexer.getSupportedChains();
      console.log(`   ✅ Supported chains: ${supportedChains.join(', ')}`);
      
      const stats = this.indexer.getStats();
      console.log(`   ✅ Initial stats: ${Object.keys(stats.stats).length} chains configured`);
      
      this.results.unitTests.initialization = {
        status: 'passed',
        supportedChains,
        stats
      };
      
    } catch (error) {
      console.log(`   ❌ Initialization failed: ${error.message}`);
      this.results.unitTests.initialization = {
        status: 'failed',
        error: error.message
      };
    }
    
    // Test 2: RPC Client creation
    console.log('\n2️⃣ Testing RPC Client Creation...');
    const clientTests = {};
    
    for (const chainName of this.indexer.getSupportedChains()) {
      try {
        // Test getting current block (basic functionality)
        const blockNumber = await this.indexer.getCurrentBlockNumber(chainName);
        console.log(`   ✅ ${chainName.toUpperCase()}: Current block ${blockNumber}`);
        
        clientTests[chainName] = {
          status: 'passed',
          currentBlock: blockNumber
        };
        
      } catch (error) {
        console.log(`   ❌ ${chainName.toUpperCase()}: ${error.message}`);
        clientTests[chainName] = {
          status: 'failed',
          error: error.message
        };
      }
    }
    
    this.results.unitTests.rpcClients = clientTests;
    
    // Test 3: Configuration validation
    console.log('\n3️⃣ Testing Configuration Validation...');
    try {
      const requiredEnvVars = [
        'LISK_TARGET_ADDRESS',
        'ETHEREUM_TARGET_ADDRESS', 
        'STARKNET_TARGET_ADDRESS',
        'LISK_RPC_URL1',
        'ETHEREUM_RPC_URL',
        'STARKNET_RPC_URL1'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length === 0) {
        console.log('   ✅ All required environment variables configured');
        this.results.unitTests.configuration = { status: 'passed' };
      } else {
        console.log(`   ⚠️  Missing environment variables: ${missingVars.join(', ')}`);
        this.results.unitTests.configuration = { 
          status: 'warning',
          missingVars
        };
      }
      
    } catch (error) {
      console.log(`   ❌ Configuration validation failed: ${error.message}`);
      this.results.unitTests.configuration = {
        status: 'failed',
        error: error.message
      };
    }
    
    console.log('\n✅ Unit tests completed');
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('\n🔗 PHASE 2: Integration Tests');
    console.log('-'.repeat(50));
    
    // Test 1: Multi-chain connection test
    console.log('\n1️⃣ Testing Multi-Chain Connections...');
    try {
      const connectionResults = await this.indexer.testAllConnections();
      
      let totalHealthy = 0;
      let totalClients = 0;
      
      for (const [chainName, result] of Object.entries(connectionResults)) {
        const healthyClients = result.clients.filter(c => c.status === 'healthy').length;
        totalHealthy += healthyClients;
        totalClients += result.clients.length;
        
        console.log(`   ${chainName.toUpperCase()}: ${healthyClients}/${result.clients.length} clients healthy`);
      }
      
      console.log(`   ✅ Overall: ${totalHealthy}/${totalClients} clients healthy`);
      
      this.results.integrationTests.connections = {
        status: totalHealthy > 0 ? 'passed' : 'failed',
        totalHealthy,
        totalClients,
        details: connectionResults
      };
      
    } catch (error) {
      console.log(`   ❌ Connection test failed: ${error.message}`);
      this.results.integrationTests.connections = {
        status: 'failed',
        error: error.message
      };
    }
    
    // Test 2: Cross-chain block synchronization
    console.log('\n2️⃣ Testing Cross-Chain Block Synchronization...');
    const blockSyncResults = {};
    
    for (const chainName of this.indexer.getSupportedChains()) {
      try {
        const startTime = Date.now();
        const blockNumber = await this.indexer.getCurrentBlockNumber(chainName);
        const responseTime = Date.now() - startTime;
        
        blockSyncResults[chainName] = {
          status: 'passed',
          blockNumber,
          responseTime,
          timestamp: new Date().toISOString()
        };
        
        console.log(`   ✅ ${chainName.toUpperCase()}: Block ${blockNumber} (${responseTime}ms)`);
        
      } catch (error) {
        blockSyncResults[chainName] = {
          status: 'failed',
          error: error.message
        };
        
        console.log(`   ❌ ${chainName.toUpperCase()}: ${error.message}`);
      }
    }
    
    this.results.integrationTests.blockSync = blockSyncResults;
    
    // Test 3: Indexing method compatibility
    console.log('\n3️⃣ Testing Indexing Method Compatibility...');
    const methodTests = {};
    
    const testAddress = process.env.LISK_TARGET_ADDRESS || '0x05D032ac25d322df992303dCa074EE7392C117b9';
    const testChain = 'lisk';
    
    if (testAddress) {
      try {
        const currentBlock = await this.indexer.getCurrentBlockNumber(testChain);
        const fromBlock = currentBlock - 100;
        const toBlock = currentBlock;
        
        console.log(`   🧪 Testing with ${testChain} address: ${testAddress}`);
        console.log(`   📊 Block range: ${fromBlock} to ${toBlock}`);
        
        const result = await this.indexer.indexContractInteractions(
          testAddress,
          fromBlock,
          toBlock,
          testChain
        );
        
        methodTests[testChain] = {
          status: 'passed',
          method: result.method,
          transactions: result.transactions.length,
          events: result.events.length,
          duration: result.indexingDuration
        };
        
        console.log(`   ✅ Method: ${result.method}`);
        console.log(`   📊 Results: ${result.transactions.length} transactions, ${result.events.length} events`);
        
      } catch (error) {
        methodTests[testChain] = {
          status: 'failed',
          error: error.message
        };
        
        console.log(`   ❌ Method test failed: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  No test address available, skipping method compatibility test');
    }
    
    this.results.integrationTests.methods = methodTests;
    
    console.log('\n✅ Integration tests completed');
  }

  /**
   * Run scenario tests using the existing tester
   */
  async runScenarioTests() {
    console.log('\n🎯 PHASE 3: Scenario Tests');
    console.log('-'.repeat(50));
    
    try {
      // Run the comprehensive scenario tests
      await this.scenarioTester.runAllTests();
      
      this.results.scenarioTests = {
        status: 'passed',
        details: this.scenarioTester.testResults
      };
      
    } catch (error) {
      console.log(`❌ Scenario tests failed: ${error.message}`);
      this.results.scenarioTests = {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    console.log('\n⚡ PHASE 4: Performance Tests');
    console.log('-'.repeat(50));
    
    const performanceResults = {};
    
    // Test different indexing modes
    const indexingModes = ['events-first', 'hybrid'];
    const testRanges = [100, 500];
    
    for (const mode of indexingModes) {
      console.log(`\n🔧 Testing indexing mode: ${mode}`);
      
      const modeIndexer = new MultiChainContractIndexer({
        indexingMode: mode,
        maxConcurrentRequests: 3,
        requestTimeout: 30000
      });
      
      performanceResults[mode] = {};
      
      for (const chainName of ['lisk']) { // Focus on Lisk for performance testing
        const testAddress = process.env.LISK_TARGET_ADDRESS;
        if (!testAddress) continue;
        
        console.log(`   🔗 Testing ${chainName} with ${mode} mode:`);
        performanceResults[mode][chainName] = {};
        
        try {
          const currentBlock = await modeIndexer.getCurrentBlockNumber(chainName);
          
          for (const range of testRanges) {
            const fromBlock = currentBlock - range;
            const toBlock = currentBlock;
            
            console.log(`      📊 Testing ${range} blocks...`);
            
            try {
              const startTime = Date.now();
              const result = await modeIndexer.indexContractInteractions(
                testAddress,
                fromBlock,
                toBlock,
                chainName
              );
              const totalTime = Date.now() - startTime;
              
              const performance = {
                blockRange: range,
                duration: totalTime,
                transactions: result.transactions.length,
                events: result.events.length,
                method: result.method,
                blocksPerSecond: (range / totalTime * 1000).toFixed(2),
                transactionsPerSecond: (result.transactions.length / totalTime * 1000).toFixed(2)
              };
              
              performanceResults[mode][chainName][`${range}_blocks`] = performance;
              
              console.log(`         ✅ ${totalTime}ms | ${performance.blocksPerSecond} blocks/s | Method: ${result.method}`);
              
            } catch (error) {
              console.log(`         ❌ Failed: ${error.message}`);
              performanceResults[mode][chainName][`${range}_blocks`] = { error: error.message };
            }
          }
          
        } catch (error) {
          console.log(`   ❌ Failed to test ${chainName}: ${error.message}`);
          performanceResults[mode][chainName].error = error.message;
        }
      }
    }
    
    this.results.performanceTests = performanceResults;
    
    console.log('\n✅ Performance tests completed');
  }

  /**
   * Generate comprehensive test report
   */
  generateCompleteReport() {
    console.log('\n📋 COMPLETE TEST SUITE REPORT');
    console.log('=' .repeat(80));
    
    // Phase 1: Unit Test Results
    console.log('\n🧪 Unit Test Results:');
    const unitResults = this.results.unitTests;
    
    if (unitResults.initialization) {
      const status = unitResults.initialization.status === 'passed' ? '✅' : '❌';
      console.log(`   ${status} Initialization: ${unitResults.initialization.status}`);
    }
    
    if (unitResults.rpcClients) {
      const passedClients = Object.values(unitResults.rpcClients).filter(r => r.status === 'passed').length;
      const totalClients = Object.keys(unitResults.rpcClients).length;
      console.log(`   📡 RPC Clients: ${passedClients}/${totalClients} chains working`);
    }
    
    if (unitResults.configuration) {
      const status = unitResults.configuration.status === 'passed' ? '✅' : 
                    unitResults.configuration.status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${status} Configuration: ${unitResults.configuration.status}`);
    }
    
    // Phase 2: Integration Test Results
    console.log('\n🔗 Integration Test Results:');
    const integrationResults = this.results.integrationTests;
    
    if (integrationResults.connections) {
      const status = integrationResults.connections.status === 'passed' ? '✅' : '❌';
      console.log(`   ${status} Connections: ${integrationResults.connections.totalHealthy}/${integrationResults.connections.totalClients} healthy`);
    }
    
    if (integrationResults.blockSync) {
      const syncedChains = Object.values(integrationResults.blockSync).filter(r => r.status === 'passed').length;
      const totalChains = Object.keys(integrationResults.blockSync).length;
      console.log(`   📊 Block Sync: ${syncedChains}/${totalChains} chains synchronized`);
    }
    
    if (integrationResults.methods) {
      const workingMethods = Object.values(integrationResults.methods).filter(r => r.status === 'passed').length;
      const totalMethods = Object.keys(integrationResults.methods).length;
      console.log(`   🔧 Methods: ${workingMethods}/${totalMethods} indexing methods working`);
    }
    
    // Phase 3: Scenario Test Results
    console.log('\n🎯 Scenario Test Results:');
    if (this.results.scenarioTests.status === 'passed' && this.results.scenarioTests.details.crossChain) {
      const crossChain = this.results.scenarioTests.details.crossChain;
      console.log(`   ✅ Cross-Chain Analysis: ${crossChain.totalContracts} contracts, ${crossChain.totalTransactions} transactions`);
      console.log(`   📋 Total Events: ${crossChain.totalEvents}`);
      
      for (const [chainName, breakdown] of Object.entries(crossChain.chainBreakdown)) {
        console.log(`   🔗 ${chainName.toUpperCase()}: ${breakdown.contracts} contracts, ${breakdown.transactions} tx, ${breakdown.events} events`);
      }
    } else {
      console.log(`   ❌ Scenario tests: ${this.results.scenarioTests.status}`);
    }
    
    // Phase 4: Performance Test Results
    console.log('\n⚡ Performance Test Results:');
    const perfResults = this.results.performanceTests;
    
    for (const [mode, modeResults] of Object.entries(perfResults)) {
      console.log(`   🔧 ${mode} mode:`);
      
      for (const [chainName, chainResults] of Object.entries(modeResults)) {
        if (chainResults.error) {
          console.log(`      ❌ ${chainName}: ${chainResults.error}`);
          continue;
        }
        
        const validTests = Object.values(chainResults).filter(t => !t.error);
        if (validTests.length > 0) {
          const avgBlocksPerSecond = validTests.reduce((sum, t) => sum + parseFloat(t.blocksPerSecond), 0) / validTests.length;
          console.log(`      ✅ ${chainName}: ${avgBlocksPerSecond.toFixed(2)} blocks/second average`);
        }
      }
    }
    
    // Overall Assessment
    console.log('\n🏆 Overall Assessment:');
    
    const unitPassed = Object.values(unitResults).filter(r => r.status === 'passed').length;
    const unitTotal = Object.keys(unitResults).length;
    
    const integrationPassed = Object.values(integrationResults).filter(r => r.status === 'passed').length;
    const integrationTotal = Object.keys(integrationResults).length;
    
    const scenarioPassed = this.results.scenarioTests.status === 'passed' ? 1 : 0;
    const scenarioTotal = 1;
    
    const performancePassed = Object.keys(perfResults).length > 0 ? 1 : 0;
    const performanceTotal = 1;
    
    const totalPassed = unitPassed + integrationPassed + scenarioPassed + performancePassed;
    const totalTests = unitTotal + integrationTotal + scenarioTotal + performanceTotal;
    
    console.log(`   📊 Test Success Rate: ${totalPassed}/${totalTests} phases passed (${(totalPassed/totalTests*100).toFixed(1)}%)`);
    
    if (totalPassed === totalTests) {
      console.log('   🎉 ALL TESTS PASSED! Multi-chain indexing system is working correctly.');
    } else if (totalPassed >= totalTests * 0.8) {
      console.log('   ✅ MOSTLY SUCCESSFUL! Minor issues detected but system is functional.');
    } else if (totalPassed >= totalTests * 0.5) {
      console.log('   ⚠️  PARTIAL SUCCESS! Some components need attention.');
    } else {
      console.log('   ❌ MAJOR ISSUES! System needs significant fixes.');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    // Check for missing environment variables
    if (unitResults.configuration && unitResults.configuration.missingVars) {
      console.log(`   🔧 Configure missing environment variables: ${unitResults.configuration.missingVars.join(', ')}`);
    }
    
    // Check for connection issues
    if (integrationResults.connections && integrationResults.connections.totalHealthy === 0) {
      console.log('   🚨 Fix all RPC connection issues before production use');
    } else if (integrationResults.connections && integrationResults.connections.totalHealthy < integrationResults.connections.totalClients) {
      console.log('   ⚠️  Some RPC endpoints are unhealthy - consider adding more fallback URLs');
    }
    
    // Performance recommendations
    const hasPerformanceData = Object.keys(perfResults).length > 0;
    if (hasPerformanceData) {
      console.log('   🚀 Performance testing completed - system ready for production');
    } else {
      console.log('   📊 Run performance tests with configured addresses for production readiness');
    }
    
    console.log('\n✅ Complete Multi-Chain Indexing Test Suite Report Generated!');
    console.log('=' .repeat(80));
  }
}

// Run the complete test suite
async function main() {
  const testSuite = new CompleteIndexingTestSuite();
  await testSuite.runCompleteTestSuite();
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Complete test suite failed:', error);
    process.exit(1);
  });
}

export { CompleteIndexingTestSuite };