/**
 * Test Suite Runner for Contract Interaction-Based Fetching
 * Runs all interaction-based tests and provides comprehensive results
 */

import { InteractionFetchingTester } from './test-contract-interaction-fetching.js';
import { LiskInteractionTester } from './test-lisk-interaction-optimization.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class InteractionTestSuite {
  constructor() {
    this.results = {
      overallTest: null,
      liskSpecificTest: null,
      startTime: Date.now(),
      endTime: null,
      totalTime: 0
    };
  }

  /**
   * Run the complete interaction test suite
   */
  async runFullSuite() {
    console.log('🧪 Contract Interaction-Based Fetching Test Suite');
    console.log('='.repeat(70));
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log('');
    
    try {
      // Display test configuration
      this.displayConfiguration();
      
      // Test 1: Comprehensive interaction vs block comparison
      await this.runOverallTest();
      
      // Test 2: Lisk-specific optimization test
      await this.runLiskSpecificTest();
      
      // Calculate total time
      this.results.endTime = Date.now();
      this.results.totalTime = this.results.endTime - this.results.startTime;
      
      // Print final summary
      this.printFinalSummary();
      
      console.log('🎉 Test suite completed successfully!');
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Display test configuration
   */
  displayConfiguration() {
    console.log('⚙️  Test Configuration');
    console.log('-'.repeat(50));
    
    const config = {
      contractAddress: process.env.CONTRACT_ADDRESS || 'Default USDC',
      contractChain: process.env.CONTRACT_CHAIN || 'lisk',
      blockRange: process.env.ANALYSIS_BLOCK_RANGE || '1000',
      analyzeChainOnly: process.env.ANALYZE_CHAIN_ONLY || 'false',
      liskRpcUrl: process.env.LISK_RPC_URL1 || 'https://rpc.api.lisk.com',
      starknetRpcUrl: process.env.STARKNET_RPC_URL1 || 'https://rpc.starknet.lava.build'
    };
    
    console.log(`   📋 Contract Address: ${config.contractAddress}`);
    console.log(`   ⛓️  Target Chain: ${config.contractChain}`);
    console.log(`   📦 Block Range: ${config.blockRange}`);
    console.log(`   🔒 Chain Isolation: ${config.analyzeChainOnly}`);
    console.log(`   🔗 Lisk RPC: ${config.liskRpcUrl}`);
    console.log(`   🔗 Starknet RPC: ${config.starknetRpcUrl}`);
    console.log('');
  }

  /**
   * Run comprehensive interaction vs block test
   */
  async runOverallTest() {
    console.log('🎯 Running Comprehensive Interaction vs Block Test');
    console.log('='.repeat(70));
    
    try {
      const tester = new InteractionFetchingTester();
      await tester.runComprehensiveTest();
      
      this.results.overallTest = {
        success: true,
        results: tester.results
      };
      
      console.log('✅ Comprehensive test completed successfully');
      
    } catch (error) {
      this.results.overallTest = {
        success: false,
        error: error.message
      };
      
      console.error('❌ Comprehensive test failed:', error.message);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Run Lisk-specific optimization test
   */
  async runLiskSpecificTest() {
    console.log('🔗 Running Lisk-Specific Optimization Test');
    console.log('='.repeat(70));
    
    try {
      const tester = new LiskInteractionTester();
      await tester.runTests();
      
      this.results.liskSpecificTest = {
        success: true,
        results: tester.testResults
      };
      
      console.log('✅ Lisk-specific test completed successfully');
      
    } catch (error) {
      this.results.liskSpecificTest = {
        success: false,
        error: error.message
      };
      
      console.error('❌ Lisk-specific test failed:', error.message);
      // Don't throw here - continue with summary even if Lisk test fails
    }
    
    console.log('');
  }

  /**
   * Print final comprehensive summary
   */
  printFinalSummary() {
    console.log('📊 Final Test Suite Summary');
    console.log('='.repeat(70));
    
    const overall = this.results.overallTest;
    const lisk = this.results.liskSpecificTest;
    
    console.log(`⏱️  Total execution time: ${(this.results.totalTime / 1000).toFixed(2)} seconds`);
    console.log('');
    
    // Overall test results
    console.log(`🎯 Comprehensive Interaction Test: ${overall?.success ? '✅ PASS' : '❌ FAIL'}`);
    if (overall?.success && overall.results) {
      const results = overall.results;
      console.log(`   📊 Performance improvement: ${results.performance?.speedImprovement?.toFixed(2) || 'N/A'}%`);
      console.log(`   📈 Data richness: ${results.comparison?.dataRichness || 'N/A'}%`);
      console.log(`   🎯 Fetch method: ${results.interactionBased?.fetchMethod || 'unknown'}`);
      
      if (results.interactionBased?.interactionSummary) {
        const summary = results.interactionBased.interactionSummary;
        console.log(`   📋 Events found: ${summary.totalEvents}`);
        console.log(`   🔗 Event transactions: ${summary.eventTransactions || 0}`);
      }
    }
    
    console.log('');
    
    // Lisk-specific test results
    console.log(`🔗 Lisk Optimization Test: ${lisk?.success ? '✅ PASS' : '❌ FAIL'}`);
    if (lisk?.success && lisk.results) {
      const results = lisk.results;
      console.log(`   🔌 Connection: ${results.connectionTest?.success ? '✅' : '❌'}`);
      console.log(`   🎯 Optimized fetch: ${results.optimizedFetchTest?.success ? '✅' : '❌'}`);
      console.log(`   ⚡ Performance: ${results.performanceMetrics?.totalTime || 'N/A'}ms`);
      console.log(`   📊 Tx/sec: ${results.performanceMetrics?.transactionsPerSecond?.toFixed(2) || 'N/A'}`);
    }
    
    console.log('');
    
    // Overall assessment
    console.log('🏆 Overall Assessment:');
    const overallSuccess = overall?.success && lisk?.success;
    const partialSuccess = overall?.success || lisk?.success;
    
    if (overallSuccess) {
      console.log('   ✅ All tests passed! Interaction-based fetching is working optimally.');
      
      // Check for specific optimizations
      if (overall?.results?.interactionBased?.fetchMethod === 'interaction-based') {
        console.log('   🎯 Event-based optimization is active!');
      }
      
      if (overall?.results?.performance?.speedImprovement > 10) {
        console.log('   🚀 Significant performance improvement detected!');
      }
      
    } else if (partialSuccess) {
      console.log('   ⚠️  Partial success - some tests passed, others failed.');
      console.log('   💡 Check network connectivity and RPC provider configuration.');
      
    } else {
      console.log('   ❌ All tests failed - check configuration and network connectivity.');
    }
    
    console.log('');
    
    // Recommendations
    console.log('💡 Recommendations:');
    
    if (overall?.success) {
      const perf = overall.results.performance;
      const comp = overall.results.comparison;
      
      if (perf?.speedImprovement < 0) {
        console.log('   - Consider optimizing rate limiting and batch processing');
      }
      
      if (comp?.dataRichness < 75) {
        console.log('   - Enhance event processing for richer data extraction');
      }
      
      if (overall.results.interactionBased?.fetchMethod !== 'interaction-based') {
        console.log('   - Optimize RPC providers for better interaction-based support');
      }
    }
    
    if (!lisk?.success) {
      console.log('   - Check Lisk RPC provider connectivity and configuration');
      console.log('   - Verify contract address exists on Lisk network');
    }
    
    if (overallSuccess) {
      console.log('   - Consider deploying interaction-based fetching to production');
      console.log('   - Monitor performance metrics in production environment');
    }
    
    console.log('');
    
    // Next steps
    console.log('🚀 Next Steps:');
    if (overallSuccess) {
      console.log('   1. Deploy enhanced analytics engine to production');
      console.log('   2. Update API routes to use ContractInteractionFetcher');
      console.log('   3. Monitor performance improvements in production');
      console.log('   4. Consider extending optimization to other chains');
    } else {
      console.log('   1. Fix failing tests and configuration issues');
      console.log('   2. Re-run test suite to verify fixes');
      console.log('   3. Consider fallback mechanisms for production deployment');
    }
    
    console.log('');
  }
}

// Run the test suite
async function main() {
  console.log('🚀 Starting Contract Interaction Test Suite...\n');
  
  const suite = new InteractionTestSuite();
  await suite.runFullSuite();
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test suite execution failed:', error);
    process.exit(1);
  });
}

export { InteractionTestSuite };