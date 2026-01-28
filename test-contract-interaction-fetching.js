/**
 * Test Contract Interaction-Based Fetching
 * Tests the new interaction-based data fetching approach vs block scanning
 */

import { ContractInteractionFetcher } from './src/services/ContractInteractionFetcher.js';
import { EnhancedAnalyticsEngine } from './src/services/EnhancedAnalyticsEngine.js';
import { SmartContractFetcher } from './src/services/SmartContractFetcher.js';
import { AnalyticsEngine } from './src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class InteractionFetchingTester {
  constructor() {
    this.results = {
      interactionBased: null,
      blockBased: null,
      comparison: null,
      performance: {
        interactionTime: 0,
        blockTime: 0,
        speedImprovement: 0
      }
    };
  }

  /**
   * Run comprehensive tests comparing interaction-based vs block-based fetching
   */
  async runComprehensiveTest() {
    console.log('🧪 Starting Contract Interaction Fetching Tests');
    console.log('=' .repeat(60));
    
    try {
      // Test configuration
      const testConfig = {
        contractAddress: process.env.CONTRACT_ADDRESS || '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI token
        chain: process.env.CONTRACT_CHAIN || 'lisk',
        blockRange: parseInt(process.env.ANALYSIS_BLOCK_RANGE) || 500, // Smaller range for testing
        contractName: 'Test Contract'
      };
      
      console.log(`📋 Test Configuration:`);
      console.log(`   Contract: ${testConfig.contractAddress}`);
      console.log(`   Chain: ${testConfig.chain}`);
      console.log(`   Block Range: ${testConfig.blockRange}`);
      console.log('');
      
      // Test 1: Interaction-based fetching
      await this.testInteractionBasedFetching(testConfig);
      
      // Test 2: Traditional block-based fetching
      await this.testBlockBasedFetching(testConfig);
      
      // Test 3: Compare results
      this.compareResults();
      
      // Test 4: Performance analysis
      this.analyzePerformance();
      
      // Test 5: Data quality comparison
      this.compareDataQuality();
      
      // Test 6: Provider statistics
      await this.testProviderStatistics();
      
      // Test 7: Error handling
      await this.testErrorHandling();
      
      // Test 8: Chain-specific features
      await this.testChainSpecificFeatures(testConfig);
      
      console.log('\n🎉 All tests completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Test interaction-based fetching
   */
  async testInteractionBasedFetching(config) {
    console.log('🎯 Test 1: Interaction-Based Fetching');
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    
    try {
      const enhancedEngine = new EnhancedAnalyticsEngine({
        maxRequestsPerSecond: 5,
        failoverTimeout: 30000,
        maxRetries: 2
      });
      
      console.log('   🚀 Starting enhanced analysis...');
      
      this.results.interactionBased = await enhancedEngine.analyzeContract(
        config.contractAddress,
        config.chain,
        config.contractName,
        config.blockRange
      );
      
      this.results.performance.interactionTime = Date.now() - startTime;
      
      console.log('   ✅ Interaction-based analysis completed');
      console.log(`   ⏱️  Time taken: ${this.results.performance.interactionTime}ms`);
      console.log(`   📊 Transactions found: ${this.results.interactionBased.transactions}`);
      console.log(`   👥 Users found: ${this.results.interactionBased.users?.length || 0}`);
      console.log(`   🎯 Fetch method: ${this.results.interactionBased.fetchMethod}`);
      
      if (this.results.interactionBased.interactionSummary) {
        const summary = this.results.interactionBased.interactionSummary;
        console.log(`   📋 Events: ${summary.totalEvents}`);
        console.log(`   🔗 Event transactions: ${summary.eventTransactions || 0}`);
        console.log(`   📤 Direct transactions: ${summary.directTransactions || 0}`);
      }
      
      await enhancedEngine.close();
      
    } catch (error) {
      console.error('   ❌ Interaction-based test failed:', error.message);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test traditional block-based fetching
   */
  async testBlockBasedFetching(config) {
    console.log('📦 Test 2: Block-Based Fetching');
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    
    try {
      const traditionalEngine = new AnalyticsEngine({
        maxRequestsPerSecond: 5,
        failoverTimeout: 30000,
        maxRetries: 2
      });
      
      console.log('   🚀 Starting traditional analysis...');
      
      this.results.blockBased = await traditionalEngine.analyzeContract(
        config.contractAddress,
        config.chain,
        config.contractName,
        config.blockRange
      );
      
      this.results.performance.blockTime = Date.now() - startTime;
      
      console.log('   ✅ Block-based analysis completed');
      console.log(`   ⏱️  Time taken: ${this.results.performance.blockTime}ms`);
      console.log(`   📊 Transactions found: ${this.results.blockBased.transactions}`);
      console.log(`   👥 Users found: ${this.results.blockBased.users?.length || 0}`);
      
    } catch (error) {
      console.error('   ❌ Block-based test failed:', error.message);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Compare results between methods
   */
  compareResults() {
    console.log('🔍 Test 3: Results Comparison');
    console.log('-'.repeat(40));
    
    const interaction = this.results.interactionBased;
    const block = this.results.blockBased;
    
    this.results.comparison = {
      transactionDifference: interaction.transactions - block.transactions,
      userDifference: (interaction.users?.length || 0) - (block.users?.length || 0),
      accuracyImprovement: this.calculateAccuracyImprovement(),
      dataRichness: this.calculateDataRichness()
    };
    
    console.log(`   📊 Transaction count:`);
    console.log(`      Interaction-based: ${interaction.transactions}`);
    console.log(`      Block-based: ${block.transactions}`);
    console.log(`      Difference: ${this.results.comparison.transactionDifference}`);
    
    console.log(`   👥 User count:`);
    console.log(`      Interaction-based: ${interaction.users?.length || 0}`);
    console.log(`      Block-based: ${block.users?.length || 0}`);
    console.log(`      Difference: ${this.results.comparison.userDifference}`);
    
    console.log(`   🎯 Fetch method: ${interaction.fetchMethod || 'unknown'}`);
    console.log(`   📈 Data richness improvement: ${this.results.comparison.dataRichness}%`);
    
    console.log('');
  }

  /**
   * Analyze performance differences
   */
  analyzePerformance() {
    console.log('⚡ Test 4: Performance Analysis');
    console.log('-'.repeat(40));
    
    const interactionTime = this.results.performance.interactionTime;
    const blockTime = this.results.performance.blockTime;
    
    this.results.performance.speedImprovement = blockTime > 0 ? 
      ((blockTime - interactionTime) / blockTime * 100) : 0;
    
    console.log(`   ⏱️  Interaction-based time: ${interactionTime}ms`);
    console.log(`   ⏱️  Block-based time: ${blockTime}ms`);
    console.log(`   🚀 Speed improvement: ${this.results.performance.speedImprovement.toFixed(2)}%`);
    
    if (this.results.performance.speedImprovement > 0) {
      console.log(`   ✅ Interaction-based fetching is faster!`);
    } else if (this.results.performance.speedImprovement < -10) {
      console.log(`   ⚠️  Interaction-based fetching is slower (might be due to optimization)`);
    } else {
      console.log(`   ℹ️  Performance is similar`);
    }
    
    console.log('');
  }

  /**
   * Compare data quality
   */
  compareDataQuality() {
    console.log('📈 Test 5: Data Quality Comparison');
    console.log('-'.repeat(40));
    
    const interaction = this.results.interactionBased;
    const block = this.results.blockBased;
    
    // Check for enhanced data in interaction-based results
    const hasInteractionSummary = !!interaction.interactionSummary;
    const hasEventData = interaction.interactionSummary?.totalEvents > 0;
    const hasEnhancedMetrics = interaction.fullReport?.interactions !== undefined;
    
    console.log(`   📊 Enhanced data features:`);
    console.log(`      Interaction summary: ${hasInteractionSummary ? '✅' : '❌'}`);
    console.log(`      Event data: ${hasEventData ? '✅' : '❌'}`);
    console.log(`      Enhanced metrics: ${hasEnhancedMetrics ? '✅' : '❌'}`);
    
    if (hasEventData) {
      console.log(`      Event count: ${interaction.interactionSummary.totalEvents}`);
      console.log(`      Event transactions: ${interaction.interactionSummary.eventTransactions || 0}`);
    }
    
    // Compare metrics quality
    const interactionMetrics = interaction.metrics || {};
    const blockMetrics = block.metrics || {};
    
    console.log(`   📋 Metrics comparison:`);
    console.log(`      Interaction metrics count: ${Object.keys(interactionMetrics).length}`);
    console.log(`      Block metrics count: ${Object.keys(blockMetrics).length}`);
    
    console.log('');
  }

  /**
   * Test provider statistics
   */
  async testProviderStatistics() {
    console.log('📊 Test 6: Provider Statistics');
    console.log('-'.repeat(40));
    
    try {
      const fetcher = new ContractInteractionFetcher();
      const stats = fetcher.getProviderStats();
      const chains = fetcher.getSupportedChains();
      
      console.log(`   🌐 Supported chains: ${chains.join(', ')}`);
      console.log(`   📊 Provider statistics:`);
      
      for (const [chain, providers] of Object.entries(stats)) {
        console.log(`      ${chain}:`);
        for (const [name, stat] of Object.entries(providers)) {
          console.log(`         ${name}: ${stat.successRate} success rate (${stat.requestCount} requests)`);
        }
      }
      
      await fetcher.close();
      
    } catch (error) {
      console.error('   ❌ Provider statistics test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('🛡️  Test 7: Error Handling');
    console.log('-'.repeat(40));
    
    try {
      const fetcher = new ContractInteractionFetcher();
      
      // Test invalid contract address
      console.log('   Testing invalid contract address...');
      try {
        await fetcher.fetchContractInteractions('invalid', 1000, 1100, 'lisk');
        console.log('   ⚠️  Expected error but got success');
      } catch (error) {
        console.log('   ✅ Correctly handled invalid contract address');
      }
      
      // Test invalid chain
      console.log('   Testing invalid chain...');
      try {
        await fetcher.fetchContractInteractions('0x1234567890123456789012345678901234567890', 1000, 1100, 'invalid_chain');
        console.log('   ⚠️  Expected error but got success');
      } catch (error) {
        console.log('   ✅ Correctly handled invalid chain');
      }
      
      // Test missing parameters
      console.log('   Testing missing parameters...');
      try {
        await fetcher.fetchContractInteractions(null, 1000, 1100, 'lisk');
        console.log('   ⚠️  Expected error but got success');
      } catch (error) {
        console.log('   ✅ Correctly handled missing parameters');
      }
      
      await fetcher.close();
      
    } catch (error) {
      console.error('   ❌ Error handling test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Test chain-specific features
   */
  async testChainSpecificFeatures(config) {
    console.log('⛓️  Test 8: Chain-Specific Features');
    console.log('-'.repeat(40));
    
    try {
      const fetcher = new ContractInteractionFetcher();
      
      // Test current block number
      console.log(`   Testing current block number for ${config.chain}...`);
      const currentBlock = await fetcher.getCurrentBlockNumber(config.chain);
      console.log(`   ✅ Current block: ${currentBlock}`);
      
      // Test contract events (if supported)
      if (config.chain !== 'starknet') {
        console.log(`   Testing contract events for ${config.chain}...`);
        try {
          const events = await fetcher.fetchContractEvents(
            config.contractAddress,
            [], // No specific topics
            Math.max(0, currentBlock - 100),
            currentBlock,
            config.chain
          );
          console.log(`   ✅ Found ${events.length} events`);
        } catch (error) {
          console.log(`   ⚠️  Event fetching not available: ${error.message}`);
        }
      }
      
      await fetcher.close();
      
    } catch (error) {
      console.error('   ❌ Chain-specific features test failed:', error.message);
    }
    
    console.log('');
  }

  /**
   * Calculate accuracy improvement
   */
  calculateAccuracyImprovement() {
    const interaction = this.results.interactionBased;
    const block = this.results.blockBased;
    
    // Simple heuristic: more transactions usually means better accuracy
    if (block.transactions === 0) return 100;
    
    const improvement = ((interaction.transactions - block.transactions) / block.transactions) * 100;
    return Math.max(0, improvement);
  }

  /**
   * Calculate data richness improvement
   */
  calculateDataRichness() {
    const interaction = this.results.interactionBased;
    
    let richness = 0;
    
    // Check for enhanced features
    if (interaction.interactionSummary) richness += 25;
    if (interaction.interactionSummary?.totalEvents > 0) richness += 25;
    if (interaction.fetchMethod === 'interaction-based') richness += 25;
    if (interaction.fullReport?.interactions) richness += 25;
    
    return richness;
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('📋 Test Summary');
    console.log('='.repeat(60));
    
    const interaction = this.results.interactionBased;
    const block = this.results.blockBased;
    const perf = this.results.performance;
    const comp = this.results.comparison;
    
    console.log(`🎯 Interaction-Based Results:`);
    console.log(`   Transactions: ${interaction.transactions}`);
    console.log(`   Users: ${interaction.users?.length || 0}`);
    console.log(`   Time: ${perf.interactionTime}ms`);
    console.log(`   Method: ${interaction.fetchMethod || 'unknown'}`);
    if (interaction.interactionSummary) {
      console.log(`   Events: ${interaction.interactionSummary.totalEvents}`);
    }
    
    console.log(`\n📦 Block-Based Results:`);
    console.log(`   Transactions: ${block.transactions}`);
    console.log(`   Users: ${block.users?.length || 0}`);
    console.log(`   Time: ${perf.blockTime}ms`);
    
    console.log(`\n📊 Comparison:`);
    console.log(`   Speed improvement: ${perf.speedImprovement.toFixed(2)}%`);
    console.log(`   Transaction difference: ${comp.transactionDifference}`);
    console.log(`   User difference: ${comp.userDifference}`);
    console.log(`   Data richness: ${comp.dataRichness}%`);
    
    console.log(`\n🏆 Conclusion:`);
    if (perf.speedImprovement > 10 && comp.dataRichness > 50) {
      console.log(`   ✅ Interaction-based fetching is superior!`);
    } else if (perf.speedImprovement > 0) {
      console.log(`   ✅ Interaction-based fetching shows improvement`);
    } else {
      console.log(`   ℹ️  Results are mixed - further optimization needed`);
    }
    
    console.log(`\n💡 Recommendations:`);
    if (interaction.fetchMethod !== 'interaction-based') {
      console.log(`   - Optimize RPC providers for better interaction-based support`);
    }
    if (comp.dataRichness < 75) {
      console.log(`   - Enhance event processing for richer data`);
    }
    if (perf.speedImprovement < 0) {
      console.log(`   - Review rate limiting and batch processing`);
    }
    
    console.log('');
  }
}

// Run the tests
async function main() {
  const tester = new InteractionFetchingTester();
  await tester.runComprehensiveTest();
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

export { InteractionFetchingTester };