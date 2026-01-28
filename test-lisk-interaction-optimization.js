/**
 * Test Lisk RPC Client Interaction Optimization
 * Tests the optimized getTransactionsByAddress method in LiskRpcClient_Optimized.js
 */

import { LiskRpcClient } from './src/services/LiskRpcClient_Optimized.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class LiskInteractionTester {
  constructor() {
    this.client = null;
    this.testResults = {
      connectionTest: null,
      blockNumberTest: null,
      optimizedFetchTest: null,
      performanceMetrics: {
        startTime: 0,
        endTime: 0,
        totalTime: 0,
        transactionsPerSecond: 0
      }
    };
  }

  /**
   * Run comprehensive Lisk interaction tests
   */
  async runTests() {
    console.log('🔗 Starting Lisk RPC Client Interaction Tests');
    console.log('=' .repeat(60));
    
    try {
      // Initialize client
      await this.initializeClient();
      
      // Test 1: Connection test
      await this.testConnection();
      
      // Test 2: Block number test
      await this.testBlockNumber();
      
      // Test 3: Optimized transaction fetching
      await this.testOptimizedFetching();
      
      // Test 4: Performance analysis
      this.analyzePerformance();
      
      // Test 5: Data structure validation
      await this.validateDataStructure();
      
      // Test 6: Error handling
      await this.testErrorHandling();
      
      console.log('\n🎉 All Lisk interaction tests completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Lisk test suite failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Initialize Lisk RPC client
   */
  async initializeClient() {
    console.log('🚀 Test 0: Client Initialization');
    console.log('-'.repeat(40));
    
    const rpcUrl = process.env.LISK_RPC_URL1 || 'https://rpc.api.lisk.com';
    console.log(`   🔗 Connecting to: ${rpcUrl}`);
    
    this.client = new LiskRpcClient(rpcUrl, {
      timeout: 30000,
      retries: 2
    });
    
    console.log('   ✅ Client initialized successfully');
    console.log('');
  }

  /**
   * Test connection to Lisk RPC
   */
  async testConnection() {
    console.log('🔌 Test 1: Connection Test');
    console.log('-'.repeat(40));
    
    try {
      const startTime = Date.now();
      const blockNumber = await this.client.getBlockNumber();
      const connectionTime = Date.now() - startTime;
      
      this.testResults.connectionTest = {
        success: true,
        blockNumber,
        connectionTime
      };
      
      console.log(`   ✅ Connection successful`);
      console.log(`   📊 Current block: ${blockNumber}`);
      console.log(`   ⏱️  Connection time: ${connectionTime}ms`);
      
    } catch (error) {
      this.testResults.connectionTest = {
        success: false,
        error: error.message
      };
      
      console.error(`   ❌ Connection failed: ${error.message}`);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test block number retrieval
   */
  async testBlockNumber() {
    console.log('📦 Test 2: Block Number Test');
    console.log('-'.repeat(40));
    
    try {
      const blockNumber = await this.client.getBlockNumber();
      
      this.testResults.blockNumberTest = {
        success: true,
        blockNumber,
        isValid: blockNumber > 0 && Number.isInteger(blockNumber)
      };
      
      console.log(`   ✅ Block number retrieved: ${blockNumber}`);
      console.log(`   ✅ Block number is valid: ${this.testResults.blockNumberTest.isValid}`);
      
    } catch (error) {
      this.testResults.blockNumberTest = {
        success: false,
        error: error.message
      };
      
      console.error(`   ❌ Block number test failed: ${error.message}`);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test optimized transaction fetching
   */
  async testOptimizedFetching() {
    console.log('🎯 Test 3: Optimized Transaction Fetching');
    console.log('-'.repeat(40));
    
    try {
      // Use test contract or default USDC contract
      const contractAddress = process.env.CONTRACT_ADDRESS || '0x05D032ac25d322df992303dCa074EE7392C117b9'; // USDC on Lisk
      const blockRange = parseInt(process.env.ANALYSIS_BLOCK_RANGE) || 200; // Smaller range for testing
      
      console.log(`   📋 Test Configuration:`);
      console.log(`      Contract: ${contractAddress}`);
      console.log(`      Block range: ${blockRange}`);
      
      // Get current block
      const currentBlock = await this.client.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - blockRange);
      const toBlock = currentBlock;
      
      console.log(`      From block: ${fromBlock}`);
      console.log(`      To block: ${toBlock}`);
      console.log(`      Total blocks: ${toBlock - fromBlock + 1}`);
      
      // Start performance tracking
      this.testResults.performanceMetrics.startTime = Date.now();
      
      console.log(`   🚀 Starting optimized fetch...`);
      
      // Use the optimized method
      const result = await this.client.getTransactionsByAddress(contractAddress, fromBlock, toBlock);
      
      // End performance tracking
      this.testResults.performanceMetrics.endTime = Date.now();
      this.testResults.performanceMetrics.totalTime = 
        this.testResults.performanceMetrics.endTime - this.testResults.performanceMetrics.startTime;
      
      // Store results
      this.testResults.optimizedFetchTest = {
        success: true,
        result,
        contractAddress,
        blockRange: { from: fromBlock, to: toBlock },
        totalBlocks: toBlock - fromBlock + 1
      };
      
      console.log(`   ✅ Optimized fetch completed`);
      console.log(`   ⏱️  Total time: ${this.testResults.performanceMetrics.totalTime}ms`);
      
      // Analyze result structure
      if (result && typeof result === 'object') {
        if (result.transactions && result.events && result.summary) {
          console.log(`   🎯 Enhanced structure detected:`);
          console.log(`      📊 Transactions: ${result.transactions.length}`);
          console.log(`      📋 Events: ${result.events.length}`);
          console.log(`      📈 Summary: ${JSON.stringify(result.summary)}`);
          
          // Calculate performance metrics
          if (result.transactions.length > 0) {
            this.testResults.performanceMetrics.transactionsPerSecond = 
              (result.transactions.length / this.testResults.performanceMetrics.totalTime) * 1000;
          }
          
        } else if (Array.isArray(result)) {
          console.log(`   📦 Legacy structure detected:`);
          console.log(`      📊 Transactions: ${result.length}`);
          
          if (result.length > 0) {
            this.testResults.performanceMetrics.transactionsPerSecond = 
              (result.length / this.testResults.performanceMetrics.totalTime) * 1000;
          }
        } else {
          console.log(`   ⚠️  Unexpected result structure:`, typeof result);
        }
      } else {
        console.log(`   ⚠️  No result or invalid result type`);
      }
      
    } catch (error) {
      this.testResults.optimizedFetchTest = {
        success: false,
        error: error.message
      };
      
      console.error(`   ❌ Optimized fetch failed: ${error.message}`);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Analyze performance metrics
   */
  analyzePerformance() {
    console.log('⚡ Test 4: Performance Analysis');
    console.log('-'.repeat(40));
    
    const metrics = this.testResults.performanceMetrics;
    const fetchTest = this.testResults.optimizedFetchTest;
    
    console.log(`   ⏱️  Total execution time: ${metrics.totalTime}ms`);
    console.log(`   📊 Transactions per second: ${metrics.transactionsPerSecond.toFixed(2)}`);
    
    if (fetchTest.success && fetchTest.result) {
      const result = fetchTest.result;
      const totalBlocks = fetchTest.totalBlocks;
      
      // Calculate efficiency metrics
      const msPerBlock = metrics.totalTime / totalBlocks;
      const blocksPerSecond = (totalBlocks / metrics.totalTime) * 1000;
      
      console.log(`   📦 Blocks processed: ${totalBlocks}`);
      console.log(`   ⚡ Blocks per second: ${blocksPerSecond.toFixed(2)}`);
      console.log(`   ⏱️  Milliseconds per block: ${msPerBlock.toFixed(2)}`);
      
      // Analyze optimization effectiveness
      if (result.summary) {
        const summary = result.summary;
        console.log(`   🎯 Optimization metrics:`);
        console.log(`      Event transactions: ${summary.eventTransactions || 0}`);
        console.log(`      Direct transactions: ${summary.directTransactions || 0}`);
        console.log(`      Total events: ${summary.totalEvents || 0}`);
        
        // Calculate optimization ratio
        const eventRatio = summary.totalEvents > 0 ? 
          (summary.eventTransactions || 0) / summary.totalTransactions : 0;
        console.log(`      Event optimization ratio: ${(eventRatio * 100).toFixed(1)}%`);
        
        if (eventRatio > 0.5) {
          console.log(`   ✅ High event optimization - efficient fetching!`);
        } else if (eventRatio > 0.2) {
          console.log(`   ✅ Moderate event optimization`);
        } else {
          console.log(`   ⚠️  Low event optimization - mostly direct scanning`);
        }
      }
    }
    
    // Performance benchmarks
    if (metrics.totalTime < 10000) {
      console.log(`   🚀 Excellent performance (< 10s)`);
    } else if (metrics.totalTime < 30000) {
      console.log(`   ✅ Good performance (< 30s)`);
    } else {
      console.log(`   ⚠️  Slow performance (> 30s) - consider optimization`);
    }
    
    console.log('');
  }

  /**
   * Validate data structure
   */
  async validateDataStructure() {
    console.log('🔍 Test 5: Data Structure Validation');
    console.log('-'.repeat(40));
    
    const fetchTest = this.testResults.optimizedFetchTest;
    
    if (!fetchTest.success) {
      console.log('   ⚠️  Skipping validation - fetch test failed');
      return;
    }
    
    const result = fetchTest.result;
    let isValid = true;
    const validationErrors = [];
    
    try {
      // Check if result has enhanced structure
      if (result && typeof result === 'object' && result.transactions && result.events && result.summary) {
        console.log('   🎯 Validating enhanced structure...');
        
        // Validate transactions array
        if (!Array.isArray(result.transactions)) {
          validationErrors.push('Transactions is not an array');
          isValid = false;
        } else {
          console.log(`   ✅ Transactions array: ${result.transactions.length} items`);
          
          // Validate transaction structure
          if (result.transactions.length > 0) {
            const tx = result.transactions[0];
            const requiredFields = ['hash', 'from', 'to', 'blockNumber', 'status'];
            
            for (const field of requiredFields) {
              if (!(field in tx)) {
                validationErrors.push(`Transaction missing field: ${field}`);
                isValid = false;
              }
            }
            
            if (isValid) {
              console.log(`   ✅ Transaction structure valid`);
            }
          }
        }
        
        // Validate events array
        if (!Array.isArray(result.events)) {
          validationErrors.push('Events is not an array');
          isValid = false;
        } else {
          console.log(`   ✅ Events array: ${result.events.length} items`);
          
          // Validate event structure
          if (result.events.length > 0) {
            const event = result.events[0];
            const requiredFields = ['address', 'topics', 'data', 'blockNumber', 'transactionHash'];
            
            for (const field of requiredFields) {
              if (!(field in event)) {
                validationErrors.push(`Event missing field: ${field}`);
                isValid = false;
              }
            }
            
            if (isValid) {
              console.log(`   ✅ Event structure valid`);
            }
          }
        }
        
        // Validate summary
        if (!result.summary || typeof result.summary !== 'object') {
          validationErrors.push('Summary is missing or invalid');
          isValid = false;
        } else {
          const summary = result.summary;
          const requiredSummaryFields = ['totalTransactions', 'totalEvents', 'blocksScanned'];
          
          for (const field of requiredSummaryFields) {
            if (!(field in summary)) {
              validationErrors.push(`Summary missing field: ${field}`);
              isValid = false;
            }
          }
          
          if (isValid) {
            console.log(`   ✅ Summary structure valid`);
          }
        }
        
      } else if (Array.isArray(result)) {
        console.log('   📦 Validating legacy array structure...');
        console.log(`   ✅ Legacy array: ${result.length} transactions`);
        
        if (result.length > 0) {
          const tx = result[0];
          if (typeof tx === 'object' && tx.hash) {
            console.log(`   ✅ Legacy transaction structure valid`);
          } else {
            validationErrors.push('Invalid legacy transaction structure');
            isValid = false;
          }
        }
        
      } else {
        validationErrors.push('Unknown result structure');
        isValid = false;
      }
      
      if (isValid) {
        console.log('   ✅ Data structure validation passed');
      } else {
        console.log('   ❌ Data structure validation failed:');
        validationErrors.forEach(error => console.log(`      - ${error}`));
      }
      
    } catch (error) {
      console.error(`   ❌ Validation error: ${error.message}`);
      isValid = false;
    }
    
    console.log('');
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('🛡️  Test 6: Error Handling');
    console.log('-'.repeat(40));
    
    try {
      // Test invalid contract address
      console.log('   Testing invalid contract address...');
      try {
        await this.client.getTransactionsByAddress('invalid', 1000, 1100);
        console.log('   ⚠️  Expected error but got success');
      } catch (error) {
        console.log('   ✅ Correctly handled invalid contract address');
      }
      
      // Test invalid block range
      console.log('   Testing invalid block range...');
      try {
        await this.client.getTransactionsByAddress('0x1234567890123456789012345678901234567890', -1, -2);
        console.log('   ⚠️  Expected error but got success');
      } catch (error) {
        console.log('   ✅ Correctly handled invalid block range');
      }
      
      // Test timeout handling (with very short timeout)
      console.log('   Testing timeout handling...');
      const shortTimeoutClient = new LiskRpcClient(process.env.LISK_RPC_URL1 || 'https://rpc.api.lisk.com', {
        timeout: 1 // 1ms timeout - should fail
      });
      
      try {
        await shortTimeoutClient.getBlockNumber();
        console.log('   ⚠️  Expected timeout but got success');
      } catch (error) {
        if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
          console.log('   ✅ Correctly handled timeout');
        } else {
          console.log(`   ⚠️  Got error but not timeout: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('   ❌ Error handling test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('📋 Lisk Interaction Test Summary');
    console.log('='.repeat(60));
    
    const connection = this.testResults.connectionTest;
    const blockNum = this.testResults.blockNumberTest;
    const fetch = this.testResults.optimizedFetchTest;
    const perf = this.testResults.performanceMetrics;
    
    console.log(`🔌 Connection Test: ${connection?.success ? '✅ PASS' : '❌ FAIL'}`);
    if (connection?.success) {
      console.log(`   Block: ${connection.blockNumber}, Time: ${connection.connectionTime}ms`);
    }
    
    console.log(`📦 Block Number Test: ${blockNum?.success ? '✅ PASS' : '❌ FAIL'}`);
    if (blockNum?.success) {
      console.log(`   Block: ${blockNum.blockNumber}, Valid: ${blockNum.isValid}`);
    }
    
    console.log(`🎯 Optimized Fetch Test: ${fetch?.success ? '✅ PASS' : '❌ FAIL'}`);
    if (fetch?.success) {
      const result = fetch.result;
      if (result && result.summary) {
        console.log(`   Transactions: ${result.summary.totalTransactions}`);
        console.log(`   Events: ${result.summary.totalEvents}`);
        console.log(`   Method: ${result.summary.eventTransactions > 0 ? 'Event-optimized' : 'Block-scan'}`);
      } else if (Array.isArray(result)) {
        console.log(`   Transactions: ${result.length} (legacy format)`);
      }
    }
    
    console.log(`⚡ Performance Metrics:`);
    console.log(`   Total time: ${perf.totalTime}ms`);
    console.log(`   Transactions/sec: ${perf.transactionsPerSecond.toFixed(2)}`);
    
    console.log(`\n🏆 Overall Result:`);
    const allPassed = connection?.success && blockNum?.success && fetch?.success;
    if (allPassed) {
      console.log(`   ✅ All tests passed! Lisk interaction optimization is working.`);
      
      if (fetch?.result?.summary?.eventTransactions > 0) {
        console.log(`   🎯 Event-based optimization is active!`);
      } else {
        console.log(`   📦 Using block-scan method (no events found)`);
      }
      
      if (perf.totalTime < 10000) {
        console.log(`   🚀 Excellent performance!`);
      }
    } else {
      console.log(`   ❌ Some tests failed - check configuration and network connectivity`);
    }
    
    console.log('');
  }
}

// Run the tests
async function main() {
  const tester = new LiskInteractionTester();
  await tester.runTests();
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { LiskInteractionTester };