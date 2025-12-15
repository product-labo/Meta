import {
  calculatePercentiles,
  getPercentileRange,
  calculatePerformanceGap
} from './src/services/benchmarkService.js';

/**
 * Unit tests for Benchmark Service logic (no database required)
 * Tests pure functions: percentile calculations and gap analysis
 */

function testCalculatePercentiles() {
  console.log('📊 Test 1: Calculate Percentiles from Sample Data');
  
  // Test with standard dataset
  const sampleScores = [45, 52, 67, 73, 78, 82, 85, 88, 91, 95];
  const percentiles = calculatePercentiles(sampleScores);
  
  console.log('Sample scores:', sampleScores);
  console.log('Calculated percentiles:', percentiles);
  
  // Verify percentiles are in ascending order
  if (percentiles.p25 <= percentiles.p50 && 
      percentiles.p50 <= percentiles.p75 && 
      percentiles.p75 <= percentiles.p90) {
    console.log('✅ Percentiles are in correct ascending order');
  } else {
    throw new Error('Percentiles are not in ascending order');
  }
  
  // Verify percentiles are within data range
  const min = Math.min(...sampleScores);
  const max = Math.max(...sampleScores);
  if (percentiles.p25 >= min && percentiles.p90 <= max) {
    console.log('✅ Percentiles are within data range');
  } else {
    throw new Error('Percentiles are outside data range');
  }
  
  console.log('');
}

function testEdgeCases() {
  console.log('📊 Test 2: Edge Cases for Percentile Calculation');
  
  // Empty array
  const emptyPercentiles = calculatePercentiles([]);
  console.log('Empty array:', emptyPercentiles);
  if (emptyPercentiles.p25 === 0 && emptyPercentiles.p50 === 0 && 
      emptyPercentiles.p75 === 0 && emptyPercentiles.p90 === 0) {
    console.log('✅ Empty array returns zeros');
  } else {
    throw new Error('Empty array should return zeros');
  }
  
  // Single value
  const singlePercentiles = calculatePercentiles([50]);
  console.log('Single value [50]:', singlePercentiles);
  if (singlePercentiles.p25 === 50 && singlePercentiles.p50 === 50 && 
      singlePercentiles.p75 === 50 && singlePercentiles.p90 === 50) {
    console.log('✅ Single value returns that value for all percentiles');
  } else {
    throw new Error('Single value should return same value for all percentiles');
  }
  
  // Two values
  const twoPercentiles = calculatePercentiles([30, 70]);
  console.log('Two values [30, 70]:', twoPercentiles);
  if (twoPercentiles.p25 >= 30 && twoPercentiles.p90 <= 70) {
    console.log('✅ Two values produce interpolated percentiles');
  } else {
    throw new Error('Two values should produce interpolated percentiles');
  }
  
  // Large dataset
  const largeDataset = Array.from({ length: 1000 }, (_, i) => i + 1);
  const largePercentiles = calculatePercentiles(largeDataset);
  console.log('Large dataset (1-1000):', largePercentiles);
  if (largePercentiles.p50 >= 490 && largePercentiles.p50 <= 510) {
    console.log('✅ Large dataset produces accurate median');
  } else {
    throw new Error('Large dataset median is inaccurate');
  }
  
  console.log('');
}

function testPercentileRange() {
  console.log('📊 Test 3: Percentile Range Determination');
  
  const mockBenchmark = {
    percentile_25: 50,
    percentile_50: 70,
    percentile_75: 85,
    percentile_90: 95
  };
  
  const testCases = [
    { value: 40, expected: 'below_25' },
    { value: 60, expected: '25_50' },
    { value: 75, expected: '50_75' },
    { value: 90, expected: '75_90' },
    { value: 98, expected: 'above_90' }
  ];
  
  testCases.forEach(({ value, expected }) => {
    const range = getPercentileRange(value, mockBenchmark);
    console.log(`  Value ${value} → ${range} (expected: ${expected})`);
    if (range === expected) {
      console.log(`  ✅ Correct`);
    } else {
      throw new Error(`Expected ${expected} but got ${range}`);
    }
  });
  
  // Test with null benchmark
  const unknownRange = getPercentileRange(50, null);
  if (unknownRange === 'unknown') {
    console.log('  ✅ Null benchmark returns "unknown"');
  } else {
    throw new Error('Null benchmark should return "unknown"');
  }
  
  console.log('');
}

function testPerformanceGap() {
  console.log('📊 Test 4: Performance Gap Calculation');
  
  const mockBenchmark = {
    percentile_25: 50,
    percentile_50: 70,
    percentile_75: 85,
    percentile_90: 95
  };
  
  // Test above target
  const aboveGap = calculatePerformanceGap(80, mockBenchmark, 'p50');
  console.log('Value 80 vs p50 (70):', aboveGap);
  if (aboveGap.status === 'above_target' && aboveGap.gap === 10) {
    console.log('✅ Above target calculation correct');
  } else {
    throw new Error('Above target calculation incorrect');
  }
  
  // Test below target
  const belowGap = calculatePerformanceGap(60, mockBenchmark, 'p75');
  console.log('Value 60 vs p75 (85):', belowGap);
  if (belowGap.status === 'below_target' && belowGap.gap === -25) {
    console.log('✅ Below target calculation correct');
  } else {
    throw new Error('Below target calculation incorrect');
  }
  
  // Test exact match
  const exactGap = calculatePerformanceGap(70, mockBenchmark, 'p50');
  console.log('Value 70 vs p50 (70):', exactGap);
  if (exactGap.gap === 0 && exactGap.percentage === 0) {
    console.log('✅ Exact match calculation correct');
  } else {
    throw new Error('Exact match calculation incorrect');
  }
  
  // Test percentage calculation
  const percentageGap = calculatePerformanceGap(84, mockBenchmark, 'p50');
  console.log('Value 84 vs p50 (70) - percentage:', percentageGap.percentage + '%');
  if (percentageGap.percentage === 20) {
    console.log('✅ Percentage calculation correct (20%)');
  } else {
    throw new Error(`Expected 20% but got ${percentageGap.percentage}%`);
  }
  
  // Test with null benchmark
  const noBenchmarkGap = calculatePerformanceGap(50, null, 'p50');
  if (noBenchmarkGap.status === 'no_benchmark') {
    console.log('✅ Null benchmark handled correctly');
  } else {
    throw new Error('Null benchmark should return no_benchmark status');
  }
  
  console.log('');
}

function testRealWorldScenarios() {
  console.log('📊 Test 5: Real-World Scenarios');
  
  // Scenario 1: DeFi project productivity scores
  console.log('\nScenario 1: DeFi Project Productivity Scores');
  const defiScores = [45, 52, 58, 63, 67, 71, 75, 79, 83, 87, 91, 95];
  const defiPercentiles = calculatePercentiles(defiScores);
  console.log('DeFi productivity percentiles:', defiPercentiles);
  
  const myProjectScore = 68;
  const myRange = getPercentileRange(myProjectScore, {
    percentile_25: defiPercentiles.p25,
    percentile_50: defiPercentiles.p50,
    percentile_75: defiPercentiles.p75,
    percentile_90: defiPercentiles.p90
  });
  console.log(`My project score (${myProjectScore}) is in range: ${myRange}`);
  console.log('✅ DeFi scenario processed');
  
  // Scenario 2: Retention rate comparison
  console.log('\nScenario 2: Retention Rate Comparison');
  const retentionRates = [25.5, 32.1, 38.7, 45.2, 51.8, 58.4, 64.9, 71.5, 78.1, 84.7];
  const retentionPercentiles = calculatePercentiles(retentionRates);
  console.log('Retention rate percentiles:', retentionPercentiles);
  
  const myRetention = 55;
  const retentionGap = calculatePerformanceGap(myRetention, {
    percentile_25: retentionPercentiles.p25,
    percentile_50: retentionPercentiles.p50,
    percentile_75: retentionPercentiles.p75,
    percentile_90: retentionPercentiles.p90
  }, 'p75');
  console.log(`My retention (${myRetention}%) vs p75 target:`, retentionGap);
  console.log('✅ Retention scenario processed');
  
  // Scenario 3: Multiple categories comparison
  console.log('\nScenario 3: Cross-Category Comparison');
  const categories = {
    defi: [65, 70, 75, 80, 85],
    gamefi: [55, 60, 65, 70, 75],
    socialfi: [60, 65, 70, 75, 80]
  };
  
  Object.entries(categories).forEach(([category, scores]) => {
    const percentiles = calculatePercentiles(scores);
    console.log(`${category}: p50=${percentiles.p50}, p75=${percentiles.p75}`);
  });
  console.log('✅ Multi-category comparison processed');
  
  console.log('');
}

function runAllTests() {
  console.log('🧪 Testing Benchmark Service Logic (Pure Functions)\n');
  
  try {
    testCalculatePercentiles();
    testEdgeCases();
    testPercentileRange();
    testPerformanceGap();
    testRealWorldScenarios();
    
    console.log('🎉 All benchmark logic tests passed!');
    console.log('\n✅ Benchmark service logic is working correctly');
    console.log('\nNote: Database-dependent functions (store, retrieve) require a running PostgreSQL instance.');
    console.log('The core calculation logic has been verified and is ready for use.');
    
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run all tests
const success = runAllTests();
process.exit(success ? 0 : 1);
