#!/usr/bin/env node

/**
 * Multi-Chain Contract Indexing Scenarios Test
 * Tests indexing-based contract interaction for Lisk, Ethereum, and Starknet
 * Uses addresses from environment variables for different scenarios
 */

import dotenv from 'dotenv';
import { MultiChainContractIndexer } from './src/services/MultiChainContractIndexer.js';

// Load environment variables
dotenv.config();

class MultiChainIndexingTester {
  constructor() {
    this.indexer = new MultiChainContractIndexer({
      maxConcurrentRequests: 3,
      requestTimeout: 30000,
      maxRetries: 2,
      batchSize: 15,
      indexingMode: 'events-first'
    });
    
    // Test scenarios from environment variables
    this.scenarios = {
      lisk: {
        target: {
          address: process.env.LISK_TARGET_ADDRESS,
          name: 'Lisk Target Contract',
          description: 'Primary target contract on Lisk'
        },
        competitors: [
          {
            address: process.env.LISK_COMPETITOR_1,
            name: 'Lisk Competitor 1',
            description: 'First competitor contract on Lisk'
          },
          {
            address: process.env.LISK_COMPETITOR_2,
            name: 'Lisk Competitor 2', 
            description: 'Second competitor contract on Lisk'
          }
        ]
      },
      ethereum: {
        target: {
          address: process.env.ETHEREUM_TARGET_ADDRESS,
          name: 'Ethereum Target Contract',
          description: 'Primary target contract on Ethereum'
        },
        competitors: [
          {
            address: process.env.ETHEREUM_COMPETITOR_1,
            name: 'SushiSwap Router',
            description: 'SushiSwap V2 Router contract'
          },
          {
            address: process.env.ETHEREUM_COMPETITOR_2,
            name: '1inch V5 Router',
            description: '1inch V5 Aggregation Router'
          },
          {
            address: process.env.ETHEREUM_COMPETITOR_3,
            name: 'Uniswap V3 Router',
            description: 'Uniswap V3 Swap Router'
          },
          {
            address: process.env.ETHEREUM_COMPETITOR_4,
            name: '0x Exchange Proxy',
            description: '0x Protocol Exchange Proxy'
          }
        ]
      },
      starknet: {
        target: {
          address: process.env.STARKNET_TARGET_ADDRESS,
          name: 'Starknet Target Contract',
          description: 'Primary target contract on Starknet'
        },
        competitors: [
          {
            address: process.env.STARKNET_COMPETITOR_1,
            name: 'Starknet Competitor 1',
            description: 'First competitor contract on Starknet'
          },
          {
            address: process.env.STARKNET_COMPETITOR_2,
            name: 'Starknet Competitor 2',
            description: 'Second competitor contract on Starknet'
          }
        ]
      }
    };
    
    this.testResults = {};
  }

  /**
   * Run all multi-chain indexing tests
   */
  async runAllTests() {
    console.log('🚀 Starting Multi-Chain Contract Indexing Scenarios Test');
    console.log('=' .repeat(80));
    
    try {
      // Test 1: Connection tests
      await this.testConnections();
      
      // Test 2: Current block numbers
      await this.testCurrentBlocks();
      
      // Test 3: Target vs Competitors scenarios
      await this.testTargetVsCompetitors();
      
      // Test 4: Cross-chain comparison
      await this.testCrossChainComparison();
      
      // Test 5: Performance benchmarks
      await this.testPerformanceBenchmarks();
      
      // Generate summary report
      this.generateSummaryReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test connections to all chains
   */
  async testConnections() {
    console.log('\n📡 Testing Multi-Chain Connections...');
    console.log('-'.repeat(50));
    
    try {
      const connectionResults = await this.indexer.testAllConnections();
      
      for (const [chainName, result] of Object.entries(connectionResults)) {
        console.log(`\n🔗 ${result.name} Chain:`);
        
        for (const client of result.clients) {
          const status = client.status === 'healthy' ? '✅' : '❌';
          console.log(`   ${status} ${client.rpcUrl}`);
          
          if (client.status === 'healthy') {
            console.log(`      Block: ${client.blockNumber}, Response: ${client.responseTime}`);
          } else {
            console.log(`      Error: ${client.error}`);
          }
        }
      }
      
      this.testResults.connections = connectionResults;
      console.log('\n✅ Connection tests completed');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      throw error;
    }
  }

  /**
   * Test current block numbers for all chains
   */
  async testCurrentBlocks() {
    console.log('\n📊 Testing Current Block Numbers...');
    console.log('-'.repeat(50));
    
    const blockResults = {};
    
    for (const chainName of this.indexer.getSupportedChains()) {
      try {
        const startTime = Date.now();
        const blockNumber = await this.indexer.getCurrentBlockNumber(chainName);
        const responseTime = Date.now() - startTime;
        
        blockResults[chainName] = {
          blockNumber,
          responseTime,
          status: 'success'
        };
        
        console.log(`✅ ${chainName.toUpperCase()}: Block ${blockNumber} (${responseTime}ms)`);
        
      } catch (error) {
        blockResults[chainName] = {
          error: error.message,
          status: 'failed'
        };
        
        console.log(`❌ ${chainName.toUpperCase()}: ${error.message}`);
      }
    }
    
    this.testResults.currentBlocks = blockResults;
    console.log('\n✅ Block number tests completed');
  }

  /**
   * Test target vs competitors scenarios
   */
  async testTargetVsCompetitors() {
    console.log('\n🎯 Testing Target vs Competitors Scenarios...');
    console.log('-'.repeat(50));
    
    const scenarioResults = {};
    const blockRange = parseInt(process.env.TEST_BLOCK_RANGE) || 1000;
    
    for (const [chainName, scenario] of Object.entries(this.scenarios)) {
      console.log(`\n🔗 ${chainName.toUpperCase()} Chain Analysis:`);
      scenarioResults[chainName] = {};
      
      // Get current block for range calculation
      try {
        const currentBlock = await this.indexer.getCurrentBlockNumber(chainName);
        const fromBlock = currentBlock - blockRange;
        const toBlock = currentBlock;
        
        console.log(`   📊 Analyzing blocks ${fromBlock} to ${toBlock} (${blockRange} blocks)`);
        
        // Test target contract
        if (scenario.target.address) {
          console.log(`\n   🎯 Target: ${scenario.target.name}`);
          console.log(`      Address: ${scenario.target.address}`);
          
          try {
            const targetResult = await this.indexer.indexContractInteractions(
              scenario.target.address,
              fromBlock,
              toBlock,
              chainName
            );
            
            scenarioResults[chainName].target = {
              ...targetResult,
              contractInfo: scenario.target
            };
            
            console.log(`      ✅ Indexed: ${targetResult.transactions.length} transactions, ${targetResult.events.length} events`);
            console.log(`      📊 Method: ${targetResult.method}`);
            console.log(`      ⏱️  Duration: ${targetResult.indexingDuration}ms`);
            
          } catch (error) {
            console.log(`      ❌ Failed: ${error.message}`);
            scenarioResults[chainName].target = { error: error.message };
          }
        } else {
          console.log(`   ⚠️  No target address configured for ${chainName}`);
        }
        
        // Test competitor contracts
        scenarioResults[chainName].competitors = [];
        
        for (const [index, competitor] of scenario.competitors.entries()) {
          if (!competitor.address) {
            console.log(`   ⚠️  No address configured for competitor ${index + 1}`);
            continue;
          }
          
          console.log(`\n   🏆 Competitor ${index + 1}: ${competitor.name}`);
          console.log(`      Address: ${competitor.address}`);
          
          try {
            const competitorResult = await this.indexer.indexContractInteractions(
              competitor.address,
              fromBlock,
              toBlock,
              chainName
            );
            
            scenarioResults[chainName].competitors.push({
              ...competitorResult,
              contractInfo: competitor
            });
            
            console.log(`      ✅ Indexed: ${competitorResult.transactions.length} transactions, ${competitorResult.events.length} events`);
            console.log(`      📊 Method: ${competitorResult.method}`);
            console.log(`      ⏱️  Duration: ${competitorResult.indexingDuration}ms`);
            
          } catch (error) {
            console.log(`      ❌ Failed: ${error.message}`);
            scenarioResults[chainName].competitors.push({ 
              error: error.message,
              contractInfo: competitor
            });
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to get current block for ${chainName}: ${error.message}`);
        scenarioResults[chainName].error = error.message;
      }
    }
    
    this.testResults.scenarios = scenarioResults;
    console.log('\n✅ Target vs Competitors tests completed');
  }

  /**
   * Test cross-chain comparison
   */
  async testCrossChainComparison() {
    console.log('\n🌐 Testing Cross-Chain Comparison...');
    console.log('-'.repeat(50));
    
    const comparisonResults = {
      totalContracts: 0,
      totalTransactions: 0,
      totalEvents: 0,
      chainBreakdown: {},
      performanceComparison: {}
    };
    
    for (const [chainName, results] of Object.entries(this.testResults.scenarios || {})) {
      if (results.error) continue;
      
      const chainStats = {
        contracts: 0,
        transactions: 0,
        events: 0,
        avgDuration: 0,
        methods: new Set()
      };
      
      // Process target
      if (results.target && !results.target.error) {
        chainStats.contracts++;
        chainStats.transactions += results.target.transactions.length;
        chainStats.events += results.target.events.length;
        chainStats.methods.add(results.target.method);
      }
      
      // Process competitors
      if (results.competitors) {
        for (const competitor of results.competitors) {
          if (!competitor.error) {
            chainStats.contracts++;
            chainStats.transactions += competitor.transactions.length;
            chainStats.events += competitor.events.length;
            chainStats.methods.add(competitor.method);
          }
        }
      }
      
      // Calculate averages
      if (chainStats.contracts > 0) {
        const durations = [];
        if (results.target && !results.target.error) durations.push(results.target.indexingDuration);
        if (results.competitors) {
          durations.push(...results.competitors.filter(c => !c.error).map(c => c.indexingDuration));
        }
        chainStats.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      }
      
      comparisonResults.totalContracts += chainStats.contracts;
      comparisonResults.totalTransactions += chainStats.transactions;
      comparisonResults.totalEvents += chainStats.events;
      comparisonResults.chainBreakdown[chainName] = {
        ...chainStats,
        methods: Array.from(chainStats.methods)
      };
      
      console.log(`\n🔗 ${chainName.toUpperCase()} Summary:`);
      console.log(`   📊 Contracts analyzed: ${chainStats.contracts}`);
      console.log(`   🔗 Total transactions: ${chainStats.transactions}`);
      console.log(`   📋 Total events: ${chainStats.events}`);
      console.log(`   ⏱️  Average duration: ${chainStats.avgDuration.toFixed(0)}ms`);
      console.log(`   🔧 Methods used: ${chainStats.methods.size > 0 ? Array.from(chainStats.methods).join(', ') : 'none'}`);
    }
    
    console.log(`\n🌐 Cross-Chain Totals:`);
    console.log(`   📊 Total contracts: ${comparisonResults.totalContracts}`);
    console.log(`   🔗 Total transactions: ${comparisonResults.totalTransactions}`);
    console.log(`   📋 Total events: ${comparisonResults.totalEvents}`);
    
    this.testResults.crossChain = comparisonResults;
    console.log('\n✅ Cross-chain comparison completed');
  }

  /**
   * Test performance benchmarks
   */
  async testPerformanceBenchmarks() {
    console.log('\n⚡ Testing Performance Benchmarks...');
    console.log('-'.repeat(50));
    
    const benchmarks = {};
    
    // Test different block ranges
    const testRanges = [100, 500, 1000];
    
    for (const chainName of this.indexer.getSupportedChains()) {
      const scenario = this.scenarios[chainName];
      if (!scenario?.target?.address) continue;
      
      console.log(`\n🔗 ${chainName.toUpperCase()} Performance Tests:`);
      benchmarks[chainName] = {};
      
      try {
        const currentBlock = await this.indexer.getCurrentBlockNumber(chainName);
        
        for (const range of testRanges) {
          const fromBlock = currentBlock - range;
          const toBlock = currentBlock;
          
          console.log(`   📊 Testing ${range} blocks...`);
          
          try {
            const startTime = Date.now();
            const result = await this.indexer.indexContractInteractions(
              scenario.target.address,
              fromBlock,
              toBlock,
              chainName
            );
            const totalTime = Date.now() - startTime;
            
            const blocksPerSecond = (range / totalTime * 1000).toFixed(2);
            const transactionsPerSecond = (result.transactions.length / totalTime * 1000).toFixed(2);
            
            benchmarks[chainName][`${range}_blocks`] = {
              blockRange: range,
              duration: totalTime,
              transactions: result.transactions.length,
              events: result.events.length,
              blocksPerSecond: parseFloat(blocksPerSecond),
              transactionsPerSecond: parseFloat(transactionsPerSecond),
              method: result.method
            };
            
            console.log(`      ✅ ${totalTime}ms | ${blocksPerSecond} blocks/s | ${transactionsPerSecond} tx/s`);
            
          } catch (error) {
            console.log(`      ❌ Failed: ${error.message}`);
            benchmarks[chainName][`${range}_blocks`] = { error: error.message };
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to get current block: ${error.message}`);
        benchmarks[chainName].error = error.message;
      }
    }
    
    this.testResults.benchmarks = benchmarks;
    console.log('\n✅ Performance benchmarks completed');
  }

  /**
   * Generate comprehensive summary report
   */
  generateSummaryReport() {
    console.log('\n📋 MULTI-CHAIN INDEXING TEST SUMMARY');
    console.log('=' .repeat(80));
    
    // Connection Summary
    console.log('\n🔗 Connection Status:');
    for (const [chainName, result] of Object.entries(this.testResults.connections || {})) {
      const healthyClients = result.clients.filter(c => c.status === 'healthy').length;
      const totalClients = result.clients.length;
      console.log(`   ${chainName.toUpperCase()}: ${healthyClients}/${totalClients} clients healthy`);
    }
    
    // Scenario Summary
    console.log('\n🎯 Scenario Results:');
    for (const [chainName, results] of Object.entries(this.testResults.scenarios || {})) {
      if (results.error) {
        console.log(`   ${chainName.toUpperCase()}: ❌ ${results.error}`);
        continue;
      }
      
      let successCount = 0;
      let totalContracts = 0;
      
      if (results.target) {
        totalContracts++;
        if (!results.target.error) successCount++;
      }
      
      if (results.competitors) {
        totalContracts += results.competitors.length;
        successCount += results.competitors.filter(c => !c.error).length;
      }
      
      console.log(`   ${chainName.toUpperCase()}: ${successCount}/${totalContracts} contracts indexed successfully`);
    }
    
    // Performance Summary
    console.log('\n⚡ Performance Summary:');
    for (const [chainName, benchmarks] of Object.entries(this.testResults.benchmarks || {})) {
      if (benchmarks.error) {
        console.log(`   ${chainName.toUpperCase()}: ❌ ${benchmarks.error}`);
        continue;
      }
      
      const validBenchmarks = Object.values(benchmarks).filter(b => !b.error);
      if (validBenchmarks.length > 0) {
        const avgBlocksPerSecond = validBenchmarks.reduce((sum, b) => sum + b.blocksPerSecond, 0) / validBenchmarks.length;
        console.log(`   ${chainName.toUpperCase()}: ${avgBlocksPerSecond.toFixed(2)} blocks/second average`);
      }
    }
    
    // Cross-Chain Summary
    if (this.testResults.crossChain) {
      console.log('\n🌐 Cross-Chain Totals:');
      console.log(`   📊 Contracts: ${this.testResults.crossChain.totalContracts}`);
      console.log(`   🔗 Transactions: ${this.testResults.crossChain.totalTransactions}`);
      console.log(`   📋 Events: ${this.testResults.crossChain.totalEvents}`);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    // Check for missing addresses
    const missingAddresses = [];
    for (const [chainName, scenario] of Object.entries(this.scenarios)) {
      if (!scenario.target.address) {
        missingAddresses.push(`${chainName.toUpperCase()}_TARGET_ADDRESS`);
      }
      scenario.competitors.forEach((comp, index) => {
        if (!comp.address) {
          missingAddresses.push(`${chainName.toUpperCase()}_COMPETITOR_${index + 1}`);
        }
      });
    }
    
    if (missingAddresses.length > 0) {
      console.log(`   ⚠️  Configure missing environment variables: ${missingAddresses.join(', ')}`);
    }
    
    // Check for connection issues
    const unhealthyChains = [];
    for (const [chainName, result] of Object.entries(this.testResults.connections || {})) {
      const healthyClients = result.clients.filter(c => c.status === 'healthy').length;
      if (healthyClients === 0) {
        unhealthyChains.push(chainName);
      }
    }
    
    if (unhealthyChains.length > 0) {
      console.log(`   🚨 Fix connection issues for: ${unhealthyChains.join(', ')}`);
    } else {
      console.log(`   ✅ All chains have healthy connections`);
    }
    
    // Performance recommendations
    const slowChains = [];
    for (const [chainName, benchmarks] of Object.entries(this.testResults.benchmarks || {})) {
      if (benchmarks.error) continue;
      
      const validBenchmarks = Object.values(benchmarks).filter(b => !b.error);
      if (validBenchmarks.length > 0) {
        const avgBlocksPerSecond = validBenchmarks.reduce((sum, b) => sum + b.blocksPerSecond, 0) / validBenchmarks.length;
        if (avgBlocksPerSecond < 10) {
          slowChains.push(chainName);
        }
      }
    }
    
    if (slowChains.length > 0) {
      console.log(`   🐌 Consider optimizing performance for: ${slowChains.join(', ')}`);
    } else {
      console.log(`   🚀 All chains show good performance`);
    }
    
    console.log('\n✅ Multi-Chain Indexing Test Suite Complete!');
    console.log('=' .repeat(80));
  }
}

// Run the test suite
async function main() {
  const tester = new MultiChainIndexingTester();
  await tester.runAllTests();
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
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { MultiChainIndexingTester };