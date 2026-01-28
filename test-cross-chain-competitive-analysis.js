#!/usr/bin/env node

/**
 * Cross-Chain Competitive Analysis Test
 * Tests scenario where target is on one chain (Lisk) and competitors are on different chains (Ethereum, Starknet)
 * This represents real-world competitive analysis across different blockchain ecosystems
 */

import dotenv from 'dotenv';
import { MultiChainContractIndexer } from './src/services/MultiChainContractIndexer.js';

// Load environment variables
dotenv.config();

class CrossChainCompetitiveAnalyzer {
  constructor() {
    this.indexer = new MultiChainContractIndexer({
      maxConcurrentRequests: 3,
      requestTimeout: 30000,
      maxRetries: 2,
      batchSize: 15,
      indexingMode: 'events-first'
    });
    
    // Cross-chain competitive scenario
    this.competitiveScenario = {
      target: {
        chain: 'lisk',
        address: process.env.LISK_TARGET_ADDRESS || '0x05D032ac25d322df992303dCa074EE7392C117b9',
        name: 'Lisk DeFi Protocol',
        description: 'Target DeFi protocol on Lisk network',
        category: 'defi'
      },
      competitors: [
        {
          chain: 'ethereum',
          address: process.env.ETHEREUM_COMPETITOR_1 || '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
          name: 'SushiSwap Router (Ethereum)',
          description: 'Major DEX on Ethereum',
          category: 'defi'
        },
        {
          chain: 'ethereum', 
          address: process.env.ETHEREUM_COMPETITOR_2 || '0x1111111254fb6c44bac0bed2854e76f90643097d',
          name: '1inch V5 Router (Ethereum)',
          description: 'DEX aggregator on Ethereum',
          category: 'defi'
        },
        {
          chain: 'starknet',
          address: process.env.STARKNET_COMPETITOR_1 || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
          name: 'Starknet DeFi Protocol',
          description: 'DeFi protocol on Starknet',
          category: 'defi'
        },
        {
          chain: 'starknet',
          address: process.env.STARKNET_COMPETITOR_2 || '0x005a643907b9a4bc6a55e9069c4fd5fd1f5c79a22470690f75556c4736e34426',
          name: 'Starknet DEX',
          description: 'Decentralized exchange on Starknet',
          category: 'defi'
        }
      ]
    };
    
    this.analysisResults = {};
  }

  /**
   * Run complete cross-chain competitive analysis
   */
  async runCrossChainAnalysis() {
    console.log('🌐 CROSS-CHAIN COMPETITIVE ANALYSIS');
    console.log('=' .repeat(80));
    console.log('🎯 Target: Lisk DeFi Protocol');
    console.log('🏆 Competitors: Ethereum (SushiSwap, 1inch) + Starknet (DeFi protocols)');
    console.log('=' .repeat(80));
    
    try {
      // Phase 1: Multi-chain connectivity test
      await this.testMultiChainConnectivity();
      
      // Phase 2: Analyze target contract (Lisk)
      await this.analyzeTargetContract();
      
      // Phase 3: Analyze competitors (Ethereum + Starknet)
      await this.analyzeCompetitorContracts();
      
      // Phase 4: Cross-chain performance comparison
      await this.performCrossChainComparison();
      
      // Phase 5: Generate competitive insights
      this.generateCompetitiveInsights();
      
      console.log('\n🎉 Cross-chain competitive analysis completed successfully!');
      
    } catch (error) {
      console.error('❌ Cross-chain analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test connectivity to all required chains
   */
  async testMultiChainConnectivity() {
    console.log('\n📡 Phase 1: Multi-Chain Connectivity Test');
    console.log('-'.repeat(60));
    
    const requiredChains = ['lisk', 'ethereum', 'starknet'];
    const connectivityResults = {};
    
    for (const chainName of requiredChains) {
      console.log(`\n🔗 Testing ${chainName.toUpperCase()} connectivity...`);
      
      try {
        const startTime = Date.now();
        const blockNumber = await this.indexer.getCurrentBlockNumber(chainName);
        const responseTime = Date.now() - startTime;
        
        connectivityResults[chainName] = {
          status: 'connected',
          blockNumber,
          responseTime
        };
        
        console.log(`   ✅ Connected: Block ${blockNumber} (${responseTime}ms)`);
        
      } catch (error) {
        connectivityResults[chainName] = {
          status: 'failed',
          error: error.message
        };
        
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
    
    // Check if we have minimum required connectivity
    const connectedChains = Object.values(connectivityResults).filter(r => r.status === 'connected').length;
    
    if (connectedChains < 2) {
      throw new Error(`Insufficient connectivity: Only ${connectedChains}/3 chains connected`);
    }
    
    console.log(`\n✅ Connectivity check passed: ${connectedChains}/3 chains connected`);
    this.analysisResults.connectivity = connectivityResults;
  }

  /**
   * Analyze target contract on Lisk
   */
  async analyzeTargetContract() {
    console.log('\n🎯 Phase 2: Target Contract Analysis (Lisk)');
    console.log('-'.repeat(60));
    
    const target = this.competitiveScenario.target;
    const blockRange = parseInt(process.env.TEST_BLOCK_RANGE) || 1000;
    
    console.log(`\n📊 Analyzing Target Contract:`);
    console.log(`   🏷️  Name: ${target.name}`);
    console.log(`   🔗 Chain: ${target.chain.toUpperCase()}`);
    console.log(`   📍 Address: ${target.address}`);
    console.log(`   📝 Description: ${target.description}`);
    
    try {
      // Get current block for range calculation
      const currentBlock = await this.indexer.getCurrentBlockNumber(target.chain);
      const fromBlock = currentBlock - blockRange;
      const toBlock = currentBlock;
      
      console.log(`   📊 Block range: ${fromBlock} to ${toBlock} (${blockRange} blocks)`);
      
      // Perform indexing analysis
      const startTime = Date.now();
      const result = await this.indexer.indexContractInteractions(
        target.address,
        fromBlock,
        toBlock,
        target.chain
      );
      const analysisTime = Date.now() - startTime;
      
      // Calculate metrics
      const metrics = this.calculateContractMetrics(result, blockRange);
      
      this.analysisResults.target = {
        ...result,
        contractInfo: target,
        metrics,
        analysisTime,
        blockRange: { fromBlock, toBlock, total: blockRange }
      };
      
      console.log(`\n   ✅ Target Analysis Results:`);
      console.log(`      🔗 Transactions: ${result.transactions.length}`);
      console.log(`      📋 Events: ${result.events.length}`);
      console.log(`      🔧 Method: ${result.method}`);
      console.log(`      ⏱️  Duration: ${analysisTime}ms`);
      console.log(`      📈 Activity Rate: ${metrics.transactionsPerBlock.toFixed(4)} tx/block`);
      console.log(`      📊 Event Rate: ${metrics.eventsPerBlock.toFixed(4)} events/block`);
      
    } catch (error) {
      console.log(`   ❌ Target analysis failed: ${error.message}`);
      this.analysisResults.target = {
        error: error.message,
        contractInfo: target
      };
    }
  }

  /**
   * Analyze competitor contracts across Ethereum and Starknet
   */
  async analyzeCompetitorContracts() {
    console.log('\n🏆 Phase 3: Competitor Analysis (Cross-Chain)');
    console.log('-'.repeat(60));
    
    const competitors = this.competitiveScenario.competitors;
    const blockRange = parseInt(process.env.TEST_BLOCK_RANGE) || 1000;
    
    this.analysisResults.competitors = [];
    
    for (const [index, competitor] of competitors.entries()) {
      console.log(`\n🏆 Competitor ${index + 1}: ${competitor.name}`);
      console.log(`   🔗 Chain: ${competitor.chain.toUpperCase()}`);
      console.log(`   📍 Address: ${competitor.address}`);
      console.log(`   📝 Description: ${competitor.description}`);
      
      try {
        // Get current block for this chain
        const currentBlock = await this.indexer.getCurrentBlockNumber(competitor.chain);
        const fromBlock = currentBlock - blockRange;
        const toBlock = currentBlock;
        
        console.log(`   📊 Block range: ${fromBlock} to ${toBlock} (${blockRange} blocks)`);
        
        // Perform indexing analysis
        const startTime = Date.now();
        const result = await this.indexer.indexContractInteractions(
          competitor.address,
          fromBlock,
          toBlock,
          competitor.chain
        );
        const analysisTime = Date.now() - startTime;
        
        // Calculate metrics
        const metrics = this.calculateContractMetrics(result, blockRange);
        
        const competitorResult = {
          ...result,
          contractInfo: competitor,
          metrics,
          analysisTime,
          blockRange: { fromBlock, toBlock, total: blockRange }
        };
        
        this.analysisResults.competitors.push(competitorResult);
        
        console.log(`   ✅ Analysis Results:`);
        console.log(`      🔗 Transactions: ${result.transactions.length}`);
        console.log(`      📋 Events: ${result.events.length}`);
        console.log(`      🔧 Method: ${result.method}`);
        console.log(`      ⏱️  Duration: ${analysisTime}ms`);
        console.log(`      📈 Activity Rate: ${metrics.transactionsPerBlock.toFixed(4)} tx/block`);
        console.log(`      📊 Event Rate: ${metrics.eventsPerBlock.toFixed(4)} events/block`);
        
      } catch (error) {
        console.log(`   ❌ Analysis failed: ${error.message}`);
        this.analysisResults.competitors.push({
          error: error.message,
          contractInfo: competitor
        });
      }
    }
  }

  /**
   * Perform cross-chain performance comparison
   */
  async performCrossChainComparison() {
    console.log('\n⚡ Phase 4: Cross-Chain Performance Comparison');
    console.log('-'.repeat(60));
    
    const performanceResults = {
      byChain: {},
      overall: {
        totalContracts: 0,
        totalTransactions: 0,
        totalEvents: 0,
        avgAnalysisTime: 0
      }
    };
    
    // Analyze target performance
    if (this.analysisResults.target && !this.analysisResults.target.error) {
      const target = this.analysisResults.target;
      const chainName = target.contractInfo.chain;
      
      if (!performanceResults.byChain[chainName]) {
        performanceResults.byChain[chainName] = {
          contracts: 0,
          transactions: 0,
          events: 0,
          totalAnalysisTime: 0,
          methods: new Set()
        };
      }
      
      performanceResults.byChain[chainName].contracts++;
      performanceResults.byChain[chainName].transactions += target.transactions.length;
      performanceResults.byChain[chainName].events += target.events.length;
      performanceResults.byChain[chainName].totalAnalysisTime += target.analysisTime;
      performanceResults.byChain[chainName].methods.add(target.method);
    }
    
    // Analyze competitor performance
    for (const competitor of this.analysisResults.competitors) {
      if (competitor.error) continue;
      
      const chainName = competitor.contractInfo.chain;
      
      if (!performanceResults.byChain[chainName]) {
        performanceResults.byChain[chainName] = {
          contracts: 0,
          transactions: 0,
          events: 0,
          totalAnalysisTime: 0,
          methods: new Set()
        };
      }
      
      performanceResults.byChain[chainName].contracts++;
      performanceResults.byChain[chainName].transactions += competitor.transactions.length;
      performanceResults.byChain[chainName].events += competitor.events.length;
      performanceResults.byChain[chainName].totalAnalysisTime += competitor.analysisTime;
      performanceResults.byChain[chainName].methods.add(competitor.method);
    }
    
    // Calculate overall metrics
    for (const [chainName, chainData] of Object.entries(performanceResults.byChain)) {
      performanceResults.overall.totalContracts += chainData.contracts;
      performanceResults.overall.totalTransactions += chainData.transactions;
      performanceResults.overall.totalEvents += chainData.events;
      performanceResults.overall.avgAnalysisTime += chainData.totalAnalysisTime;
      
      // Calculate chain averages
      chainData.avgAnalysisTime = chainData.contracts > 0 ? 
        chainData.totalAnalysisTime / chainData.contracts : 0;
      chainData.avgTransactionsPerContract = chainData.contracts > 0 ? 
        chainData.transactions / chainData.contracts : 0;
      chainData.avgEventsPerContract = chainData.contracts > 0 ? 
        chainData.events / chainData.contracts : 0;
      chainData.methods = Array.from(chainData.methods);
      
      console.log(`\n🔗 ${chainName.toUpperCase()} Performance:`);
      console.log(`   📊 Contracts analyzed: ${chainData.contracts}`);
      console.log(`   🔗 Total transactions: ${chainData.transactions}`);
      console.log(`   📋 Total events: ${chainData.events}`);
      console.log(`   ⏱️  Average analysis time: ${chainData.avgAnalysisTime.toFixed(0)}ms`);
      console.log(`   📈 Avg transactions/contract: ${chainData.avgTransactionsPerContract.toFixed(2)}`);
      console.log(`   📊 Avg events/contract: ${chainData.avgEventsPerContract.toFixed(2)}`);
      console.log(`   🔧 Methods used: ${chainData.methods.join(', ')}`);
    }
    
    // Overall summary
    performanceResults.overall.avgAnalysisTime = performanceResults.overall.totalContracts > 0 ? 
      performanceResults.overall.avgAnalysisTime / performanceResults.overall.totalContracts : 0;
    
    console.log(`\n🌐 Overall Cross-Chain Performance:`);
    console.log(`   📊 Total contracts: ${performanceResults.overall.totalContracts}`);
    console.log(`   🔗 Total transactions: ${performanceResults.overall.totalTransactions}`);
    console.log(`   📋 Total events: ${performanceResults.overall.totalEvents}`);
    console.log(`   ⏱️  Average analysis time: ${performanceResults.overall.avgAnalysisTime.toFixed(0)}ms`);
    
    this.analysisResults.performance = performanceResults;
  }

  /**
   * Generate competitive insights and recommendations
   */
  generateCompetitiveInsights() {
    console.log('\n📈 Phase 5: Competitive Insights & Recommendations');
    console.log('-'.repeat(60));
    
    const insights = {
      marketPosition: {},
      technicalComparison: {},
      recommendations: []
    };
    
    // Market position analysis
    console.log('\n🎯 Market Position Analysis:');
    
    if (this.analysisResults.target && !this.analysisResults.target.error) {
      const target = this.analysisResults.target;
      const targetActivity = target.transactions.length;
      const targetEvents = target.events.length;
      
      console.log(`\n   📊 Target (${target.contractInfo.name} on ${target.contractInfo.chain.toUpperCase()}):`);
      console.log(`      🔗 Activity: ${targetActivity} transactions`);
      console.log(`      📋 Events: ${targetEvents} events`);
      console.log(`      📈 Activity Rate: ${target.metrics.transactionsPerBlock.toFixed(4)} tx/block`);
      
      // Compare with competitors
      const activeCompetitors = this.analysisResults.competitors.filter(c => !c.error);
      
      if (activeCompetitors.length > 0) {
        console.log(`\n   🏆 Competitor Comparison:`);
        
        let targetRank = 1;
        let totalCompetitorActivity = 0;
        
        for (const competitor of activeCompetitors) {
          const competitorActivity = competitor.transactions.length;
          totalCompetitorActivity += competitorActivity;
          
          if (competitorActivity > targetActivity) {
            targetRank++;
          }
          
          const performanceVsTarget = targetActivity > 0 ? 
            ((competitorActivity - targetActivity) / targetActivity * 100).toFixed(1) : 'N/A';
          
          console.log(`      🏆 ${competitor.contractInfo.name}:`);
          console.log(`         🔗 Activity: ${competitorActivity} transactions`);
          console.log(`         📋 Events: ${competitor.events.length} events`);
          console.log(`         📊 vs Target: ${performanceVsTarget}% ${competitorActivity > targetActivity ? 'higher' : 'lower'}`);
          console.log(`         🔗 Chain: ${competitor.contractInfo.chain.toUpperCase()}`);
        }
        
        const avgCompetitorActivity = totalCompetitorActivity / activeCompetitors.length;
        const marketShare = totalCompetitorActivity > 0 ? 
          (targetActivity / (targetActivity + totalCompetitorActivity) * 100).toFixed(1) : '100.0';
        
        console.log(`\n   📈 Market Position Summary:`);
        console.log(`      🏅 Target rank: #${targetRank} out of ${activeCompetitors.length + 1} protocols`);
        console.log(`      📊 Market share: ${marketShare}% of analyzed activity`);
        console.log(`      📈 vs Average competitor: ${avgCompetitorActivity > 0 ? 
          ((targetActivity - avgCompetitorActivity) / avgCompetitorActivity * 100).toFixed(1) : 'N/A'}%`);
        
        insights.marketPosition = {
          rank: targetRank,
          totalProtocols: activeCompetitors.length + 1,
          marketShare: parseFloat(marketShare),
          vsAverageCompetitor: avgCompetitorActivity > 0 ? 
            ((targetActivity - avgCompetitorActivity) / avgCompetitorActivity * 100) : 0
        };
      }
    }
    
    // Technical comparison
    console.log('\n🔧 Technical Performance Comparison:');
    
    if (this.analysisResults.performance) {
      const perf = this.analysisResults.performance.byChain;
      
      for (const [chainName, chainData] of Object.entries(perf)) {
        console.log(`\n   🔗 ${chainName.toUpperCase()} Chain:`);
        console.log(`      ⏱️  Analysis speed: ${chainData.avgAnalysisTime.toFixed(0)}ms average`);
        console.log(`      🔧 Indexing methods: ${chainData.methods.join(', ')}`);
        console.log(`      📊 Data richness: ${chainData.avgEventsPerContract.toFixed(2)} events/contract`);
        
        // Performance rating
        let performanceRating = 'Good';
        if (chainData.avgAnalysisTime < 500) performanceRating = 'Excellent';
        else if (chainData.avgAnalysisTime < 1000) performanceRating = 'Good';
        else if (chainData.avgAnalysisTime < 2000) performanceRating = 'Fair';
        else performanceRating = 'Slow';
        
        console.log(`      🏅 Performance rating: ${performanceRating}`);
      }
    }
    
    // Generate recommendations
    console.log('\n💡 Strategic Recommendations:');
    
    const recommendations = [];
    
    // Chain-specific recommendations
    if (this.analysisResults.target && !this.analysisResults.target.error) {
      const targetChain = this.analysisResults.target.contractInfo.chain;
      const targetActivity = this.analysisResults.target.transactions.length;
      
      if (targetActivity === 0) {
        recommendations.push('🚀 Increase marketing and user acquisition on Lisk to drive contract interactions');
        recommendations.push('📈 Consider incentive programs to bootstrap initial activity');
      }
      
      // Cross-chain expansion recommendations
      const ethereumCompetitors = this.analysisResults.competitors.filter(c => 
        c.contractInfo && c.contractInfo.chain === 'ethereum' && !c.error);
      const starknetCompetitors = this.analysisResults.competitors.filter(c => 
        c.contractInfo && c.contractInfo.chain === 'starknet' && !c.error);
      
      if (ethereumCompetitors.length > 0) {
        const ethereumActivity = ethereumCompetitors.reduce((sum, c) => sum + c.transactions.length, 0);
        if (ethereumActivity > targetActivity * 2) {
          recommendations.push('🌉 Consider expanding to Ethereum given higher activity levels');
          recommendations.push('💰 Ethereum shows strong DeFi activity - potential for higher TVL');
        }
      }
      
      if (starknetCompetitors.length > 0) {
        const starknetActivity = starknetCompetitors.reduce((sum, c) => sum + c.transactions.length, 0);
        if (starknetActivity > 0) {
          recommendations.push('⚡ Starknet offers lower fees - consider for cost-sensitive users');
          recommendations.push('🔮 Early mover advantage opportunity on Starknet ecosystem');
        }
      }
    }
    
    // Technical recommendations
    if (this.analysisResults.performance) {
      const liskPerf = this.analysisResults.performance.byChain.lisk;
      if (liskPerf && liskPerf.avgAnalysisTime > 1000) {
        recommendations.push('🔧 Optimize Lisk contract events for better indexing performance');
      }
      
      recommendations.push('📊 Implement cross-chain analytics dashboard for competitive monitoring');
      recommendations.push('🔄 Set up automated competitive analysis across all three chains');
    }
    
    // Display recommendations
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    insights.recommendations = recommendations;
    this.analysisResults.insights = insights;
    
    console.log('\n✅ Cross-chain competitive analysis complete!');
    console.log('=' .repeat(80));
  }

  /**
   * Calculate contract metrics
   * @private
   */
  calculateContractMetrics(result, blockRange) {
    return {
      transactionsPerBlock: result.transactions.length / blockRange,
      eventsPerBlock: result.events.length / blockRange,
      eventsPerTransaction: result.transactions.length > 0 ? 
        result.events.length / result.transactions.length : 0,
      activityScore: (result.transactions.length * 1) + (result.events.length * 0.5)
    };
  }
}

// Run the cross-chain competitive analysis
async function main() {
  const analyzer = new CrossChainCompetitiveAnalyzer();
  await analyzer.runCrossChainAnalysis();
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
    console.error('❌ Cross-chain competitive analysis failed:', error);
    process.exit(1);
  });
}

export { CrossChainCompetitiveAnalyzer };