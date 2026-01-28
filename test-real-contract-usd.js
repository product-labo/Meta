/**
 * Test Gas USD Conversion with Real Contract
 * Tests USD conversion with a real contract that has transactions
 */

import { AnalyticsEngine } from './src/index.js';

async function testRealContractUSD() {
  console.log('🧪 Testing Gas USD Conversion with Real Contract...\n');

  try {
    const engine = new AnalyticsEngine();
    
    // Use USDC contract on Ethereum (has lots of transactions)
    const usdcContract = '0xA0b86a33E6441b8e8C7C7b0b8b8b8b8b8b8b8b8b'; // USDC proxy
    const chain = 'ethereum';
    
    console.log(`Analyzing USDC contract ${usdcContract} on ${chain}...`);
    console.log('This may take a moment as we fetch real transaction data...\n');
    
    const results = await engine.analyzeContract(usdcContract, chain, 'USDC Token', 50); // Smaller range for faster testing
    
    if (results.fullReport && results.fullReport.gasAnalysis) {
      const gasAnalysis = results.fullReport.gasAnalysis;
      
      console.log('📊 Gas Analysis Results with USD Conversion:');
      console.log(`   - Total Transactions: ${results.fullReport.summary?.totalTransactions || 0}`);
      console.log(`   - Average Gas Used: ${gasAnalysis.averageGasUsed?.toLocaleString() || 'N/A'}`);
      console.log(`   - Total Gas Cost (ETH): ${gasAnalysis.totalGasCost || 'N/A'}`);
      console.log(`   - Total Gas Cost (USD): $${gasAnalysis.totalGasCostUSD?.toLocaleString() || 'N/A'}`);
      console.log(`   - Average Gas Cost (USD): $${gasAnalysis.averageGasCostUSD?.toFixed(4) || 'N/A'}`);
      console.log(`   - Gas Efficiency Score: ${gasAnalysis.gasEfficiencyScore || 'N/A'}%`);
      console.log(`   - Failed Transactions: ${gasAnalysis.failedTransactions || 0}`);
      console.log(`   - Failure Rate: ${gasAnalysis.failureRate || 0}%`);
      
      // Check if USD conversion worked
      if (gasAnalysis.totalGasCostUSD && gasAnalysis.totalGasCostUSD > 0) {
        console.log('\n✅ USD conversion is working correctly!');
        
        // Show some sample transactions with USD costs
        const transactions = results.fullReport.transactions || [];
        if (transactions.length > 0) {
          console.log('\n📋 Sample Transactions with USD Gas Costs:');
          transactions.slice(0, 3).forEach((tx, index) => {
            const gasCostUSD = tx.gasCostEth ? (tx.gasCostEth * 3000).toFixed(4) : 'N/A'; // Approximate conversion
            console.log(`   ${index + 1}. Hash: ${tx.hash?.slice(0, 10)}...`);
            console.log(`      Gas Used: ${tx.gasUsed?.toLocaleString() || 'N/A'}`);
            console.log(`      Gas Cost: ${tx.gasCostEth || 'N/A'} ETH (~$${gasCostUSD})`);
          });
        }
        
        return {
          success: true,
          totalGasCostUSD: gasAnalysis.totalGasCostUSD,
          averageGasCostUSD: gasAnalysis.averageGasCostUSD,
          transactionCount: results.fullReport.summary?.totalTransactions || 0
        };
      } else {
        console.log('\n⚠️  USD conversion returned 0 or undefined');
        return { success: false, reason: 'No USD conversion data' };
      }
    } else {
      console.log('\n⚠️  No gas analysis data found in results');
      return { success: false, reason: 'No gas analysis data' };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testRealContractUSD()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Real contract USD conversion test passed!');
        console.log(`💰 Total gas cost: $${result.totalGasCostUSD?.toLocaleString()}`);
        console.log(`📊 Average gas cost: $${result.averageGasCostUSD?.toFixed(4)}`);
        console.log(`📈 Transactions analyzed: ${result.transactionCount}`);
        process.exit(0);
      } else {
        console.log(`\n💥 Test failed: ${result.reason || result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

export { testRealContractUSD };