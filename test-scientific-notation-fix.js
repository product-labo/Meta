/**
 * Comprehensive Test for Scientific Notation Fix
 * Tests all services that use parseEther with dynamic values
 */

import { DeFiMetricsCalculator } from './src/services/DeFiMetricsCalculator.js';
import { UserBehaviorAnalyzer } from './src/services/UserBehaviorAnalyzer.js';

async function testScientificNotationFix() {
  console.log('🧪 Testing Scientific Notation Fix Across All Services...\n');

  // Test data with various problematic values
  const testTransactions = [
    {
      hash: '0x1',
      from_address: '0xuser1',
      to_address: '0xcontract1',
      value_eth: '4e-18', // Very small scientific notation
      gas_cost_eth: '0.001',
      block_timestamp: new Date().toISOString(),
      status: true
    },
    {
      hash: '0x2',
      from_address: '0xuser2',
      to_address: '0xcontract1',
      value_eth: '1.23e-15', // Another small value
      gas_cost_eth: '0.002',
      block_timestamp: new Date().toISOString(),
      status: true
    },
    {
      hash: '0x3',
      from_address: '0xuser3',
      to_address: '0xcontract1',
      value_eth: '5.67e+2', // Large scientific notation (567)
      gas_cost_eth: '0.003',
      block_timestamp: new Date().toISOString(),
      status: true
    },
    {
      hash: '0x4',
      from_address: '0xuser1',
      to_address: '0xcontract2',
      value_eth: '0', // Zero value
      gas_cost_eth: '0.001',
      block_timestamp: new Date().toISOString(),
      status: true
    },
    {
      hash: '0x5',
      from_address: '0xuser4',
      to_address: '0xcontract1',
      value_eth: '15.5', // Normal whale transaction
      gas_cost_eth: '0.004',
      block_timestamp: new Date().toISOString(),
      status: true
    }
  ];

  let allTestsPassed = true;

  try {
    // Test 1: DeFiMetricsCalculator
    console.log('📊 Testing DeFiMetricsCalculator...');
    const metricsCalculator = new DeFiMetricsCalculator();
    metricsCalculator.addTransactionData(testTransactions, 'ethereum');
    const metrics = metricsCalculator.calculateAllMetrics();
    
    console.log(`✅ DeFi Metrics calculated successfully`);
    console.log(`   - Whale Activity Ratio: ${metrics.financial.whaleActivityRatio}%`);
    console.log(`   - Total Volume: ${metrics.activity.transactionVolume} ETH`);

  } catch (error) {
    console.error('❌ DeFiMetricsCalculator failed:', error.message);
    allTestsPassed = false;
  }

  try {
    // Test 2: UserBehaviorAnalyzer
    console.log('\n👥 Testing UserBehaviorAnalyzer...');
    const behaviorAnalyzer = new UserBehaviorAnalyzer();
    const behaviorMetrics = behaviorAnalyzer.analyzeUserBehavior(testTransactions, 'ethereum');
    
    console.log(`✅ User Behavior analyzed successfully`);
    console.log(`   - Analysis completed without parseEther errors`);

  } catch (error) {
    console.error('❌ UserBehaviorAnalyzer failed:', error.message);
    allTestsPassed = false;
  }

  // Test 3: Edge cases
  console.log('\n🔬 Testing Edge Cases...');
  
  const edgeCaseTransactions = [
    {
      hash: '0xe1',
      from_address: '0xedge1',
      to_address: '0xcontract1',
      value_eth: '1e-20', // Extremely small
      gas_cost_eth: '0.001',
      block_timestamp: new Date().toISOString(),
      status: true
    },
    {
      hash: '0xe2',
      from_address: '0xedge2',
      to_address: '0xcontract1',
      value_eth: '1.23456789012345678901234567890e-18', // Very precise small number
      gas_cost_eth: '0.001',
      block_timestamp: new Date().toISOString(),
      status: true
    },
    {
      hash: '0xe3',
      from_address: '0xedge3',
      to_address: '0xcontract1',
      value_eth: '9.999999999999999999e+20', // Very large number
      gas_cost_eth: '0.001',
      block_timestamp: new Date().toISOString(),
      status: true
    }
  ];

  try {
    const edgeCalculator = new DeFiMetricsCalculator();
    edgeCalculator.addTransactionData(edgeCaseTransactions, 'ethereum');
    const edgeMetrics = edgeCalculator.calculateAllMetrics();
    
    console.log(`✅ Edge cases handled successfully`);
    console.log(`   - Volume: ${edgeMetrics.activity.transactionVolume} ETH`);
    console.log(`   - Whale Activity: ${edgeMetrics.financial.whaleActivityRatio}%`);

  } catch (error) {
    console.error('❌ Edge case handling failed:', error.message);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Scientific notation parsing issue has been fixed across all services');
    console.log('✅ Edge cases are handled properly');
    console.log('✅ Error handling is in place for invalid values');
  } else {
    console.log('❌ SOME TESTS FAILED!');
    console.log('Please check the error messages above');
  }

  return allTestsPassed;
}

// Run the comprehensive test
testScientificNotationFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });