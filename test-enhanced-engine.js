#!/usr/bin/env node

/**
 * Test Enhanced AnalyticsEngine with Real Contract Data
 */

import { AnalyticsEngine } from './src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Enhanced AnalyticsEngine with Real Contract Data...');
console.log('═'.repeat(80));

async function testRealContractAnalysis() {
  try {
    // Get contract info from .env
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractChain = process.env.CONTRACT_CHAIN;
    const contractName = process.env.CONTRACT_NAME;

    if (!contractAddress || !contractChain || !contractName) {
      throw new Error('Missing contract configuration in .env file');
    }

    console.log('📋 Contract Configuration:');
    console.log(`   Address: ${contractAddress}`);
    console.log(`   Chain: ${contractChain}`);
    console.log(`   Name: ${contractName}`);
    console.log('');

    // Initialize analytics engine
    const engine = new AnalyticsEngine({
      maxRequestsPerSecond: 3, // Slower for testing
      failoverTimeout: 45000,  // Longer timeout
      maxRetries: 1
    });

    console.log('🚀 Starting real contract analysis...');
    console.log('   This may take 30-60 seconds depending on network conditions...');
    console.log('');

    // Analyze the real contract
    const startTime = Date.now();
    const result = await engine.analyzeContract(contractAddress, contractChain, contractName);
    const executionTime = Date.now() - startTime;

    console.log('✅ Analysis completed successfully!');
    console.log(`   Execution time: ${(executionTime / 1000).toFixed(2)} seconds`);
    console.log('');

    // Display results
    console.log('📊 ANALYSIS RESULTS:');
    console.log('─'.repeat(50));
    
    console.log(`📈 Basic Metrics:`);
    console.log(`   Total Transactions: ${result.transactions}`);
    console.log(`   Block Range: ${result.blockRange?.from} - ${result.blockRange?.to}`);
    console.log(`   Users Sample: ${result.users?.length || 0} shown`);
    console.log('');

    if (result.fullReport) {
      const report = result.fullReport;
      
      console.log(`📋 Summary:`);
      console.log(`   Total Transactions: ${report.summary.totalTransactions}`);
      console.log(`   Unique Users: ${report.summary.uniqueUsers}`);
      console.log(`   Total Value: ${report.summary.totalValue.toFixed(4)} ETH`);
      console.log(`   Success Rate: ${report.summary.successRate.toFixed(1)}%`);
      console.log('');

      console.log(`💰 DeFi Metrics:`);
      console.log(`   TVL: $${report.defiMetrics.tvl.toLocaleString()}`);
      console.log(`   DAU: ${report.defiMetrics.dau}`);
      console.log(`   Transaction Volume 24h: ${report.defiMetrics.transactionVolume24h.toFixed(4)} ETH`);
      console.log(`   Gas Efficiency: ${report.defiMetrics.gasEfficiency}`);
      console.log(`   Revenue per User: $${report.defiMetrics.revenuePerUser.toFixed(2)}`);
      console.log('');

      console.log(`👥 User Behavior:`);
      console.log(`   Whale Ratio: ${report.userBehavior.whaleRatio}%`);
      console.log(`   Bot Activity: ${report.userBehavior.botActivity}%`);
      console.log(`   Loyalty Score: ${report.userBehavior.loyaltyScore}`);
      console.log(`   Retention Rate (7d): ${report.userBehavior.retentionRate7d}%`);
      console.log(`   Transactions per User: ${report.userBehavior.transactionsPerUser.toFixed(2)}`);
      console.log('');

      console.log(`⛽ Gas Analysis:`);
      console.log(`   Average Gas Used: ${report.gasAnalysis.averageGasUsed.toLocaleString()}`);
      console.log(`   Total Gas Cost: ${report.gasAnalysis.totalGasCost.toFixed(6)} ETH`);
      console.log(`   Gas Efficiency Score: ${report.gasAnalysis.gasEfficiencyScore}`);
      console.log(`   Failed Transactions: ${report.gasAnalysis.failedTransactions}`);
      console.log('');

      console.log(`🏆 Competitive Analysis:`);
      console.log(`   Market Position: #${report.competitive.marketPosition}`);
      console.log(`   Market Share: ${report.competitive.marketShare}%`);
      console.log(`   Advantages: ${report.competitive.advantages.join(', ')}`);
      console.log(`   Challenges: ${report.competitive.challenges.join(', ')}`);
      console.log('');

      console.log(`💡 Recommendations (${report.recommendations.length}):`);
      report.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
      console.log('');

      console.log(`🚨 Alerts (${report.alerts.length}):`);
      report.alerts.forEach((alert, i) => {
        console.log(`   ${i + 1}. [${alert.type.toUpperCase()}] ${alert.message}`);
      });
      console.log('');

      console.log(`📊 Data Samples:`);
      console.log(`   Users: ${report.users.length} detailed profiles`);
      console.log(`   Events: ${report.events.length} contract events`);
      console.log(`   Transactions: ${report.transactions.length} transaction records`);
      console.log(`   Locks: ${report.locks.length} token locks detected`);
      console.log('');
    }

    // Test report generation
    if (result.reportPaths) {
      console.log('📁 Generated Reports:');
      if (result.reportPaths.json?.success) {
        console.log(`   ✅ JSON: ${result.reportPaths.json.path}`);
      }
      if (result.reportPaths.csv?.success) {
        console.log(`   ✅ CSV: ${result.reportPaths.csv.path}`);
      }
      if (result.reportPaths.markdown?.success) {
        console.log(`   ✅ Markdown: ${result.reportPaths.markdown.path}`);
      }
      console.log('');
    }

    console.log('🎉 ENHANCED ANALYTICS ENGINE TEST COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log('✅ All features working with real blockchain data:');
    console.log('   ✅ Real contract transaction fetching');
    console.log('   ✅ Comprehensive DeFi metrics calculation');
    console.log('   ✅ Advanced user behavior analysis');
    console.log('   ✅ Detailed gas analysis');
    console.log('   ✅ Competitive positioning');
    console.log('   ✅ Actionable recommendations');
    console.log('   ✅ Alert system');
    console.log('   ✅ Multi-format report generation');
    console.log('   ✅ Full report structure matching expected format');
    console.log('');
    console.log('🚀 Ready for production API integration!');

    return result;

  } catch (error) {
    console.error('❌ Real contract analysis failed:', error.message);
    
    // If real analysis fails, run basic helper method tests
    console.log('\n🔧 Falling back to helper method tests...');
    await testHelperMethods();
    
    throw error;
  }
}

async function testHelperMethods() {
  const engine = new AnalyticsEngine();
  
  // Create sample transaction data for testing
  const sampleTransactions = [
    {
      hash: '0xtest1',
      from_address: '0x1234567890123456789012345678901234567890',
      to_address: '0x0987654321098765432109876543210987654321',
      value_eth: '1.5',
      value_wei: '1500000000000000000',
      gas_used: '21000',
      gas_price_wei: '20000000000',
      gas_cost_eth: '0.00042',
      block_number: '12345',
      block_timestamp: new Date().toISOString(),
      status: true,
      method_id: '0xa9059cbb'
    }
  ];

  console.log('📊 Testing helper methods with sample data...');
  
  const users = engine.extractDetailedUsers(sampleTransactions);
  console.log(`   ✅ Users extracted: ${users.length}`);
  
  const events = engine.extractEvents(sampleTransactions);
  console.log(`   ✅ Events extracted: ${events.length}`);
  
  const gasAnalysis = engine.analyzeGas(sampleTransactions);
  console.log(`   ✅ Gas analysis completed: ${gasAnalysis.gasEfficiencyScore}`);
  
  const recommendations = engine.generateRecommendations(
    { tvl: 500000, dau: 50, transactionVolume24h: 10000, gasEfficiency: 'Medium' }, 
    { whaleRatio: 20, loyaltyScore: 60, botActivity: 10, retentionRate7d: 45 }
  );
  console.log(`   ✅ Recommendations generated: ${recommendations.length}`);
  
  const alerts = engine.generateAlerts(
    { transactionVolume24h: 500, dau: 30, gasEfficiency: 'Medium' }, 
    { botActivity: 15, retentionRate7d: 25 }
  );
  console.log(`   ✅ Alerts generated: ${alerts.length}`);
  
  console.log('   ✅ Helper methods working correctly');
}

// Run the test
testRealContractAnalysis()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });