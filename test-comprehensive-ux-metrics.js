/**
 * Test Comprehensive UX Metrics Integration
 * Verifies that all UX and journey analysis services are properly integrated
 */

import { EnhancedAnalyticsEngine } from './src/services/EnhancedAnalyticsEngine.js';
import { UxBottleneckDetector } from './src/services/UxBottleneckDetector.js';
import { UserJourneyAnalyzer } from './src/services/UserJourneyAnalyzer.js';
import { UserLifecycleAnalyzer } from './src/services/UserLifecycleAnalyzer.js';

// Test data - normalized transactions (already in correct format)
const mockTransactions = [
  {
    hash: '0x1234567890abcdef1234567890abcdef12345678',
    wallet: '0xuser1',
    from_address: '0xuser1',
    to_address: '0xcontract1',
    functionName: 'deposit',
    value: '1000',
    value_eth: '1000',
    value_wei: '1000000000000000000000',
    gasUsed: '21000',
    gas_used: '21000',
    gasPrice: '20000000000',
    gas_price_wei: '20000000000',
    gas_cost_eth: '0.00042',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    block_timestamp: '2024-01-15T10:00:00Z',
    success: true,
    status: true,
    blockNumber: 1000,
    block_number: 1000,
    method_id: '0xb6b55f25',
    source: 'test'
  },
  {
    hash: '0x2234567890abcdef1234567890abcdef12345678',
    wallet: '0xuser1',
    from_address: '0xuser1',
    to_address: '0xcontract1',
    functionName: 'swap',
    value: '500',
    value_eth: '500',
    value_wei: '500000000000000000000',
    gasUsed: '45000',
    gas_used: '45000',
    gasPrice: '22000000000',
    gas_price_wei: '22000000000',
    gas_cost_eth: '0.00099',
    timestamp: new Date('2024-01-15T10:05:00Z'),
    block_timestamp: '2024-01-15T10:05:00Z',
    success: true,
    status: true,
    blockNumber: 1001,
    block_number: 1001,
    method_id: '0x128acb08',
    source: 'test'
  },
  {
    hash: '0x3234567890abcdef1234567890abcdef12345678',
    wallet: '0xuser1',
    from_address: '0xuser1',
    to_address: '0xcontract1',
    functionName: 'withdraw',
    value: '200',
    value_eth: '200',
    value_wei: '200000000000000000000',
    gasUsed: '35000',
    gas_used: '35000',
    gasPrice: '21000000000',
    gas_price_wei: '21000000000',
    gas_cost_eth: '0.000735',
    timestamp: new Date('2024-01-15T10:10:00Z'),
    block_timestamp: '2024-01-15T10:10:00Z',
    success: false,
    status: false,
    blockNumber: 1002,
    block_number: 1002,
    method_id: '0x2e1a7d4d',
    source: 'test'
  },
  {
    hash: '0x4234567890abcdef1234567890abcdef12345678',
    wallet: '0xuser2',
    from_address: '0xuser2',
    to_address: '0xcontract1',
    functionName: 'deposit',
    value: '2000',
    value_eth: '2000',
    value_wei: '2000000000000000000000',
    gasUsed: '21000',
    gas_used: '21000',
    gasPrice: '25000000000',
    gas_price_wei: '25000000000',
    gas_cost_eth: '0.000525',
    timestamp: new Date('2024-01-15T11:00:00Z'),
    block_timestamp: '2024-01-15T11:00:00Z',
    success: true,
    status: true,
    blockNumber: 1003,
    block_number: 1003,
    method_id: '0xb6b55f25',
    source: 'test'
  },
  {
    hash: '0x5234567890abcdef1234567890abcdef12345678',
    wallet: '0xuser2',
    from_address: '0xuser2',
    to_address: '0xcontract1',
    functionName: 'stake',
    value: '1500',
    value_eth: '1500',
    value_wei: '1500000000000000000000',
    gasUsed: '55000',
    gas_used: '55000',
    gasPrice: '23000000000',
    gas_price_wei: '23000000000',
    gas_cost_eth: '0.001265',
    timestamp: new Date('2024-01-15T11:15:00Z'),
    block_timestamp: '2024-01-15T11:15:00Z',
    success: true,
    status: true,
    blockNumber: 1004,
    block_number: 1004,
    method_id: '0xa694fc3a',
    source: 'test'
  },
  {
    hash: '0x6234567890abcdef1234567890abcdef12345678',
    wallet: '0xuser3',
    from_address: '0xuser3',
    to_address: '0xcontract1',
    functionName: 'deposit',
    value: '100',
    value_eth: '100',
    value_wei: '100000000000000000000',
    gasUsed: '21000',
    gas_used: '21000',
    gasPrice: '20000000000',
    gas_price_wei: '20000000000',
    gas_cost_eth: '0.00042',
    timestamp: new Date('2024-01-15T12:00:00Z'),
    block_timestamp: '2024-01-15T12:00:00Z',
    success: true,
    status: true,
    blockNumber: 1005,
    block_number: 1005,
    method_id: '0xb6b55f25',
    source: 'test'
  }
];

async function testUxBottleneckDetector() {
  console.log('\n🚧 Testing UX Bottleneck Detector...');
  
  const detector = new UxBottleneckDetector();
  const analysis = detector.analyzeUxBottlenecks(mockTransactions);
  
  console.log('   📊 UX Analysis Results:');
  console.log(`      Total sessions: ${analysis.summary.totalSessions}`);
  console.log(`      Average session duration: ${analysis.summary.averageSessionDuration.toFixed(2)} minutes`);
  console.log(`      Bottlenecks detected: ${analysis.bottlenecks.length}`);
  console.log(`      UX Grade: ${analysis.uxGrade.grade}`);
  console.log(`      Completion rate: ${(analysis.uxGrade.completionRate * 100).toFixed(1)}%`);
  console.log(`      Failure rate: ${(analysis.uxGrade.failureRate * 100).toFixed(1)}%`);
  
  // Test specific bottlenecks
  if (analysis.bottlenecks.length > 0) {
    console.log('   🚨 Detected bottlenecks:');
    analysis.bottlenecks.forEach((bottleneck, index) => {
      console.log(`      ${index + 1}. ${bottleneck.fromFunction} → ${bottleneck.toFunction}`);
      console.log(`         Abandonment rate: ${(bottleneck.abandonmentRate * 100).toFixed(1)}%`);
    });
  }
  
  return analysis;
}

async function testUserJourneyAnalyzer() {
  console.log('\n🛤️  Testing User Journey Analyzer...');
  
  const analyzer = new UserJourneyAnalyzer();
  const journeys = analyzer.analyzeJourneys(mockTransactions);
  
  console.log('   📊 Journey Analysis Results:');
  console.log(`      Total users: ${journeys.totalUsers}`);
  console.log(`      Average journey length: ${journeys.averageJourneyLength.toFixed(2)} transactions`);
  console.log(`      Common paths found: ${journeys.commonPaths.length}`);
  console.log(`      Entry points: ${journeys.entryPoints.length}`);
  console.log(`      Drop-off points: ${journeys.dropoffPoints.length}`);
  
  // Test entry points
  if (journeys.entryPoints.length > 0) {
    console.log('   🚪 Top entry points:');
    journeys.entryPoints.slice(0, 3).forEach((entry, index) => {
      console.log(`      ${index + 1}. ${entry.functionName}: ${entry.userCount} users (${entry.percentage.toFixed(1)}%)`);
    });
  }
  
  // Test common paths
  if (journeys.commonPaths.length > 0) {
    console.log('   🛤️  Common user paths:');
    journeys.commonPaths.slice(0, 3).forEach((path, index) => {
      console.log(`      ${index + 1}. ${path.sequence.join(' → ')}: ${path.userCount} users`);
    });
  }
  
  return journeys;
}

async function testUserLifecycleAnalyzer() {
  console.log('\n📊 Testing User Lifecycle Analyzer...');
  
  const analyzer = new UserLifecycleAnalyzer();
  const lifecycle = analyzer.analyzeUserLifecycle(mockTransactions);
  
  console.log('   📊 Lifecycle Analysis Results:');
  console.log(`      Total wallets: ${lifecycle.totalWallets}`);
  console.log(`      Active users: ${lifecycle.summary.activeUsers}`);
  console.log(`      New users: ${lifecycle.summary.newUsers}`);
  console.log(`      Retention rate: ${lifecycle.summary.retentionRate.toFixed(1)}%`);
  
  // Test wallet classification
  console.log('   👥 Wallet Classification:');
  Object.entries(lifecycle.walletClassification.distribution).forEach(([type, data]) => {
    console.log(`      ${type}: ${data.count} wallets (${data.percentage.toFixed(1)}%)`);
  });
  
  // Test activation metrics
  console.log('   🚀 Activation Metrics:');
  console.log(`      Activation rate: ${lifecycle.activationMetrics.activationRate.toFixed(1)}%`);
  console.log(`      Average activation time: ${lifecycle.activationMetrics.averageActivationTime.toFixed(2)} days`);
  
  return lifecycle;
}

async function testEnhancedAnalyticsEngineIntegration() {
  console.log('\n🎯 Testing Enhanced Analytics Engine Integration...');
  
  // Mock the ContractInteractionFetcher to return our test data
  const engine = new EnhancedAnalyticsEngine();
  
  // Override the fetcher methods for testing
  engine.fetcher.getCurrentBlockNumber = async () => 1010;
  engine.fetcher.fetchContractInteractions = async () => ({
    transactions: mockTransactions,
    events: [],
    summary: {
      totalTransactions: mockTransactions.length,
      eventTransactions: 0,
      directTransactions: mockTransactions.length,
      totalEvents: 0
    },
    method: 'test'
  });
  
  // Override normalizer to return data as-is since it's already normalized
  engine.normalizer.normalizeTransactions = (transactions, chain) => transactions;
  
  try {
    const analysis = await engine.analyzeContract('0xcontract1', 'ethereum', 'TestContract');
    
    console.log('   📊 Integration Test Results:');
    console.log(`      Contract: ${analysis.contract}`);
    console.log(`      Chain: ${analysis.chain}`);
    console.log(`      Transactions: ${analysis.transactions}`);
    
    // Check UX Analysis
    if (analysis.uxAnalysis) {
      console.log('   🚧 UX Analysis Integration:');
      console.log(`      UX Grade: ${analysis.uxAnalysis.uxGrade.grade}`);
      console.log(`      Bottlenecks: ${analysis.uxAnalysis.bottlenecks.length}`);
      console.log(`      Session duration: ${analysis.uxAnalysis.sessionDurations.averageDuration.toFixed(2)} min`);
    } else {
      console.log('   ❌ UX Analysis not found in results');
    }
    
    // Check User Journeys
    if (analysis.userJourneys) {
      console.log('   🛤️  User Journeys Integration:');
      console.log(`      Total users: ${analysis.userJourneys.totalUsers}`);
      console.log(`      Common paths: ${analysis.userJourneys.commonPaths.length}`);
      console.log(`      Entry points: ${analysis.userJourneys.entryPoints.length}`);
    } else {
      console.log('   ❌ User Journeys not found in results');
    }
    
    // Check User Lifecycle
    if (analysis.userLifecycle) {
      console.log('   📊 User Lifecycle Integration:');
      console.log(`      Total wallets: ${analysis.userLifecycle.summary.activeUsers + analysis.userLifecycle.summary.newUsers}`);
      console.log(`      Retention rate: ${analysis.userLifecycle.summary.retentionRate.toFixed(1)}%`);
      console.log(`      Wallet types: ${Object.keys(analysis.userLifecycle.walletClassification.distribution).length}`);
    } else {
      console.log('   ❌ User Lifecycle not found in results');
    }
    
    return analysis;
  } catch (error) {
    console.error('   ❌ Integration test failed:', error.message);
    return null;
  }
}

async function testBusinessMetricsIntegrity() {
  console.log('\n💼 Testing Business Metrics Integrity...');
  
  // Test that metrics are business-centric and non-duplicate
  const detector = new UxBottleneckDetector();
  const journeyAnalyzer = new UserJourneyAnalyzer();
  const lifecycleAnalyzer = new UserLifecycleAnalyzer();
  
  const uxAnalysis = detector.analyzeUxBottlenecks(mockTransactions);
  const journeyAnalysis = journeyAnalyzer.analyzeJourneys(mockTransactions);
  const lifecycleAnalysis = lifecycleAnalyzer.analyzeUserLifecycle(mockTransactions);
  
  console.log('   📊 Business Metrics Validation:');
  
  // Check for business-relevant metrics
  const businessMetrics = {
    'UX Grade': uxAnalysis.uxGrade.grade,
    'Completion Rate': `${(uxAnalysis.uxGrade.completionRate * 100).toFixed(1)}%`,
    'User Retention': `${lifecycleAnalysis.summary.retentionRate.toFixed(1)}%`,
    'Average Journey Length': `${journeyAnalysis.averageJourneyLength.toFixed(2)} steps`,
    'Activation Rate': `${lifecycleAnalysis.activationMetrics.activationRate.toFixed(1)}%`,
    'Session Duration': `${uxAnalysis.sessionDurations.averageDuration.toFixed(2)} min`
  };
  
  Object.entries(businessMetrics).forEach(([metric, value]) => {
    console.log(`      ✅ ${metric}: ${value}`);
  });
  
  // Check for duplicate metrics (should be minimal overlap)
  const uxMetricKeys = Object.keys(uxAnalysis);
  const journeyMetricKeys = Object.keys(journeyAnalysis);
  const lifecycleMetricKeys = Object.keys(lifecycleAnalysis);
  
  const allKeys = [...uxMetricKeys, ...journeyMetricKeys, ...lifecycleMetricKeys];
  const uniqueKeys = new Set(allKeys);
  
  console.log(`   📊 Metric Uniqueness: ${uniqueKeys.size}/${allKeys.length} unique metrics`);
  
  if (uniqueKeys.size === allKeys.length) {
    console.log('   ✅ No duplicate metrics detected');
  } else {
    console.log('   ⚠️  Some metric overlap detected (expected for related analyses)');
  }
  
  return businessMetrics;
}

async function runComprehensiveUxTest() {
  console.log('🎯 Comprehensive UX Metrics Integration Test');
  console.log('='.repeat(50));
  
  try {
    // Test individual services
    const uxResults = await testUxBottleneckDetector();
    const journeyResults = await testUserJourneyAnalyzer();
    const lifecycleResults = await testUserLifecycleAnalyzer();
    
    // Test integration
    const integrationResults = await testEnhancedAnalyticsEngineIntegration();
    
    // Test business metrics integrity
    const businessMetrics = await testBusinessMetricsIntegrity();
    
    console.log('\n✅ Comprehensive UX Metrics Test Summary:');
    console.log('='.repeat(50));
    console.log(`   🚧 UX Bottleneck Detection: ${uxResults ? 'PASS' : 'FAIL'}`);
    console.log(`   🛤️  User Journey Analysis: ${journeyResults ? 'PASS' : 'FAIL'}`);
    console.log(`   📊 User Lifecycle Analysis: ${lifecycleResults ? 'PASS' : 'FAIL'}`);
    console.log(`   🎯 Analytics Engine Integration: ${integrationResults ? 'PASS' : 'FAIL'}`);
    console.log(`   💼 Business Metrics Integrity: ${businessMetrics ? 'PASS' : 'FAIL'}`);
    
    if (integrationResults && integrationResults.uxAnalysis && integrationResults.userJourneys && integrationResults.userLifecycle) {
      console.log('\n🎉 All UX metrics are properly integrated and business-centric!');
      console.log('   📊 Dashboard will now display comprehensive UX insights');
      console.log('   🎯 Analysis details page will show user journey patterns');
      console.log('   💼 Business stakeholders have actionable metrics');
    } else {
      console.log('\n⚠️  Some integration issues detected - check implementation');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
runComprehensiveUxTest();