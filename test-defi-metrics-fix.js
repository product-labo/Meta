/**
 * Test DeFi Metrics Calculator Fix
 * Tests the fix for scientific notation parsing issue
 */

import { DeFiMetricsCalculator } from './src/services/DeFiMetricsCalculator.js';

async function testDeFiMetricsFix() {
  console.log('🧪 Testing DeFi Metrics Calculator Fix...\n');

  try {
    const calculator = new DeFiMetricsCalculator();

    // Test data with problematic scientific notation values
    const testTransactions = [
      {
        hash: '0x123',
        from_address: '0xuser1',
        to_address: '0xcontract1',
        value_eth: '4e-18', // This was causing the error
        gas_cost_eth: '0.001',
        block_timestamp: new Date().toISOString(),
        status: true
      },
      {
        hash: '0x124',
        from_address: '0xuser2',
        to_address: '0xcontract1',
        value_eth: '1.5', // Normal value
        gas_cost_eth: '0.002',
        block_timestamp: new Date().toISOString(),
        status: true
      },
      {
        hash: '0x125',
        from_address: '0xuser3',
        to_address: '0xcontract1',
        value_eth: '2.5e-10', // Another small scientific notation value
        gas_cost_eth: '0.0015',
        block_timestamp: new Date().toISOString(),
        status: true
      },
      {
        hash: '0x126',
        from_address: '0xuser4',
        to_address: '0xcontract1',
        value_eth: '15.0', // Whale transaction
        gas_cost_eth: '0.003',
        block_timestamp: new Date().toISOString(),
        status: true
      }
    ];

    console.log('📊 Adding test transaction data...');
    calculator.addTransactionData(testTransactions, 'ethereum');

    console.log('🔢 Calculating all metrics...');
    const metrics = calculator.calculateAllMetrics();

    console.log('✅ Metrics calculated successfully!');
    console.log('\n📈 Financial Metrics:');
    console.log(`- TVL: ${metrics.financial.tvl} ETH`);
    console.log(`- Net Flow: ${metrics.financial.netFlow} ETH`);
    console.log(`- Protocol Revenue: ${metrics.financial.protocolRevenue} ETH`);
    console.log(`- Whale Activity Ratio: ${metrics.financial.whaleActivityRatio}%`);

    console.log('\n📊 Activity Metrics:');
    console.log(`- Total Volume: ${metrics.activity.transactionVolume} ETH`);
    console.log(`- Average Transaction Size: ${metrics.activity.averageTransactionSize} ETH`);
    console.log(`- DAU: ${metrics.activity.dau}`);
    console.log(`- MAU: ${metrics.activity.mau}`);

    console.log('\n👥 User Lifecycle Metrics:');
    console.log(`- Activation Rate: ${metrics.userLifecycle.activationRate}%`);
    console.log(`- Retention Rate: ${metrics.userLifecycle.retentionRate}%`);

    console.log('\n⚡ Performance Metrics:');
    console.log(`- Success Rate: ${metrics.performance.functionSuccessRate}%`);
    console.log(`- Average Gas Cost: ${metrics.performance.averageGasCost} ETH`);

    console.log('\n🎯 Summary:');
    const summary = calculator.getMetricsSummary();
    console.log(JSON.stringify(summary, null, 2));

    console.log('\n✅ All tests passed! The scientific notation issue has been fixed.');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testDeFiMetricsFix()
  .then(success => {
    if (success) {
      console.log('\n🎉 DeFi Metrics Calculator fix verified successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Fix verification failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });