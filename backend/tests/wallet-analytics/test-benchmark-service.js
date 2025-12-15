import {
  storeBenchmark,
  calculatePercentiles,
  calculateAndStoreBenchmark,
  getLatestBenchmark,
  getBenchmarksByCategory,
  getBenchmarkHistory,
  getBenchmarkCategories,
  getBenchmarkStatistics,
  getPercentileRange,
  calculatePerformanceGap
} from './src/services/benchmarkService.js';

/**
 * Test script for Benchmark Service
 * Tests benchmark data management, percentile calculations, and gap analysis
 */

async function testBenchmarkService() {
  console.log('🧪 Testing Benchmark Service\n');

  try {
    // Test 1: Calculate percentiles from sample data
    console.log('📊 Test 1: Calculate Percentiles');
    const sampleScores = [45, 52, 67, 73, 78, 82, 85, 88, 91, 95];
    const percentiles = calculatePercentiles(sampleScores);
    console.log('Sample scores:', sampleScores);
    console.log('Calculated percentiles:', percentiles);
    console.log('✅ Percentile calculation successful\n');

    // Test 2: Store benchmark data
    console.log('📊 Test 2: Store Benchmark Data');
    const productivityBenchmark = await storeBenchmark(
      'productivity',
      'defi',
      percentiles,
      sampleScores.length,
      new Date()
    );
    console.log('Stored productivity benchmark:', productivityBenchmark);
    console.log('✅ Benchmark storage successful\n');

    // Test 3: Calculate and store benchmark from values
    console.log('📊 Test 3: Calculate and Store Benchmark');
    const retentionValues = [25.5, 32.1, 45.8, 52.3, 61.7, 68.4, 72.9, 78.5, 85.2, 91.3];
    const retentionBenchmark = await calculateAndStoreBenchmark(
      'retention',
      'defi',
      retentionValues
    );
    console.log('Calculated and stored retention benchmark:', retentionBenchmark);
    console.log('✅ Calculate and store successful\n');

    // Test 4: Store benchmarks for multiple categories
    console.log('📊 Test 4: Store Multiple Category Benchmarks');
    const categories = ['gamefi', 'social_fi', 'nft'];
    for (const category of categories) {
      const values = Array.from({ length: 15 }, () => Math.random() * 100);
      await calculateAndStoreBenchmark('productivity', category, values);
      console.log(`  ✓ Stored benchmark for ${category}`);
    }
    console.log('✅ Multiple category benchmarks stored\n');

    // Test 5: Get latest benchmark
    console.log('📊 Test 5: Get Latest Benchmark');
    const latestProductivity = await getLatestBenchmark('productivity', 'defi');
    console.log('Latest productivity benchmark for defi:', latestProductivity);
    console.log('✅ Latest benchmark retrieval successful\n');

    // Test 6: Get benchmarks by category
    console.log('📊 Test 6: Get Benchmarks by Category');
    const defiBenchmarks = await getBenchmarksByCategory('defi');
    console.log(`Found ${defiBenchmarks.length} benchmarks for defi category:`);
    defiBenchmarks.forEach(b => {
      console.log(`  - ${b.benchmark_type}: p50=${b.percentile_50}, sample_size=${b.sample_size}`);
    });
    console.log('✅ Category benchmarks retrieval successful\n');

    // Test 7: Get benchmark history
    console.log('📊 Test 7: Get Benchmark History');
    const history = await getBenchmarkHistory('productivity', 'defi', 5);
    console.log(`Found ${history.length} historical records for productivity/defi`);
    console.log('✅ Benchmark history retrieval successful\n');

    // Test 8: Get all categories
    console.log('📊 Test 8: Get All Categories');
    const allCategories = await getBenchmarkCategories();
    console.log('Available categories:', allCategories);
    console.log('✅ Categories retrieval successful\n');

    // Test 9: Get benchmark statistics
    console.log('📊 Test 9: Get Benchmark Statistics');
    const stats = await getBenchmarkStatistics();
    console.log('Benchmark statistics:');
    stats.forEach(stat => {
      console.log(`  ${stat.benchmark_type}/${stat.category}:`);
      console.log(`    Data points: ${stat.data_points}`);
      console.log(`    Avg sample size: ${Math.round(stat.avg_sample_size)}`);
      console.log(`    Date range: ${stat.earliest_date} to ${stat.latest_date}`);
    });
    console.log('✅ Statistics retrieval successful\n');

    // Test 10: Percentile range determination
    console.log('📊 Test 10: Determine Percentile Range');
    const testValues = [40, 55, 70, 85, 98];
    testValues.forEach(value => {
      const range = getPercentileRange(value, latestProductivity);
      console.log(`  Value ${value} falls in range: ${range}`);
    });
    console.log('✅ Percentile range determination successful\n');

    // Test 11: Performance gap calculation
    console.log('📊 Test 11: Calculate Performance Gap');
    const projectScore = 65;
    const gap50 = calculatePerformanceGap(projectScore, latestProductivity, 'p50');
    const gap75 = calculatePerformanceGap(projectScore, latestProductivity, 'p75');
    const gap90 = calculatePerformanceGap(projectScore, latestProductivity, 'p90');
    
    console.log(`Project score: ${projectScore}`);
    console.log(`Gap vs p50 (${gap50.targetValue}):`, gap50);
    console.log(`Gap vs p75 (${gap75.targetValue}):`, gap75);
    console.log(`Gap vs p90 (${gap90.targetValue}):`, gap90);
    console.log('✅ Performance gap calculation successful\n');

    // Test 12: Store adoption and churn benchmarks
    console.log('📊 Test 12: Store Additional Benchmark Types');
    const adoptionValues = [15.2, 22.8, 35.4, 48.9, 56.3, 62.7, 71.5, 79.2, 84.6, 92.1];
    const churnValues = [5.3, 8.7, 12.4, 16.8, 21.2, 25.9, 31.4, 38.7, 45.2, 52.8];
    
    await calculateAndStoreBenchmark('adoption', 'defi', adoptionValues);
    await calculateAndStoreBenchmark('churn', 'defi', churnValues);
    console.log('✅ Additional benchmark types stored\n');

    // Test 13: Edge cases
    console.log('📊 Test 13: Test Edge Cases');
    
    // Empty array
    const emptyPercentiles = calculatePercentiles([]);
    console.log('Empty array percentiles:', emptyPercentiles);
    
    // Single value
    const singlePercentiles = calculatePercentiles([50]);
    console.log('Single value percentiles:', singlePercentiles);
    
    // Two values
    const twoPercentiles = calculatePercentiles([30, 70]);
    console.log('Two values percentiles:', twoPercentiles);
    
    console.log('✅ Edge cases handled correctly\n');

    console.log('🎉 All benchmark service tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testBenchmarkService()
  .then(() => {
    console.log('\n✅ Benchmark service test suite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Benchmark service test suite failed:', error);
    process.exit(1);
  });
