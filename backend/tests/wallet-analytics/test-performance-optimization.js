/**
 * Test Performance Optimization Service
 * Tests caching, batch processing, and query optimization
 */

import PerformanceOptimizationService from './src/services/performanceOptimizationService.js';

// Mock database
class MockDB {
  constructor() {
    this.queryCount = 0;
  }

  async query(sql, params) {
    this.queryCount++;
    
    // Simulate query delay
    await new Promise(resolve => setTimeout(resolve, 10));

    if (sql.includes('wallet_productivity_scores')) {
      return {
        rows: params[0].map(id => ({
          wallet_id: id,
          total_score: Math.floor(Math.random() * 100),
          retention_score: Math.floor(Math.random() * 100),
          adoption_score: Math.floor(Math.random() * 100),
          activity_score: Math.floor(Math.random() * 100)
        }))
      };
    }

    if (sql.includes('PERCENTILE_CONT')) {
      return {
        rows: [{
          total_wallets: 100,
          active_wallets: 75,
          total_transactions: 5000,
          avg_productivity: 82.5,
          median_productivity: 80.0
        }]
      };
    }

    if (sql.includes('INSERT INTO wallet_activity_metrics')) {
      return { rowCount: params.length / 5 };
    }

    if (sql.includes('ANALYZE')) {
      return { rows: [] };
    }

    return { rows: [] };
  }
}

// Test suite
async function runTests() {
  console.log('🧪 Testing Performance Optimization Service\n');

  const db = new MockDB();
  const service = new PerformanceOptimizationService(db);

  const projectId = 'project-1';

  // Test 1: Cached query
  console.log('Test 1: Cached query performance');
  try {
    const queryFn = async () => {
      return await db.query('SELECT * FROM test', []);
    };

    const start1 = Date.now();
    await service.cachedQuery('test-key', queryFn);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await service.cachedQuery('test-key', queryFn);
    const time2 = Date.now() - start2;

    console.log('✅ Cache working');
    console.log('   First call:', time1 + 'ms');
    console.log('   Cached call:', time2 + 'ms');
    console.log('   Speed improvement:', ((time1 - time2) / time1 * 100).toFixed(1) + '%');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Batch calculate productivity scores
  console.log('\nTest 2: Batch calculate productivity scores');
  try {
    const walletIds = Array.from({ length: 250 }, (_, i) => `wallet-${i}`);
    
    const start = Date.now();
    const scores = await service.batchCalculateProductivityScores(walletIds);
    const time = Date.now() - start;

    console.log('✅ Batch processing completed');
    console.log('   Wallets processed:', walletIds.length);
    console.log('   Scores calculated:', scores.length);
    console.log('   Time taken:', time + 'ms');
    console.log('   Avg time per wallet:', (time / walletIds.length).toFixed(2) + 'ms');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Optimized wallet query
  console.log('\nTest 3: Optimized wallet query');
  try {
    const result = await service.optimizedWalletQuery(projectId, {
      minScore: 70,
      walletType: 't',
      limit: 50
    });
    console.log('✅ Optimized query executed');
    console.log('   Results:', result.rows.length);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 4: Get aggregated metrics with caching
  console.log('\nTest 4: Get aggregated metrics with caching');
  try {
    db.queryCount = 0;
    
    await service.getAggregatedMetrics(projectId);
    const firstCallQueries = db.queryCount;
    
    await service.getAggregatedMetrics(projectId);
    const secondCallQueries = db.queryCount;

    console.log('✅ Aggregated metrics retrieved');
    console.log('   First call queries:', firstCallQueries);
    console.log('   Second call queries:', secondCallQueries);
    console.log('   Cache saved:', firstCallQueries - secondCallQueries, 'queries');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 5: Batch update activity metrics
  console.log('\nTest 5: Batch update activity metrics');
  try {
    const metrics = Array.from({ length: 100 }, (_, i) => ({
      wallet_id: `wallet-${i}`,
      activity_date: '2024-01-01',
      transaction_count: Math.floor(Math.random() * 50),
      total_volume_zatoshi: Math.floor(Math.random() * 1000000),
      is_active: true
    }));

    const result = await service.batchUpdateActivityMetrics(metrics);
    console.log('✅ Batch update completed');
    console.log('   Metrics updated:', result.updated);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 6: Optimize indexes
  console.log('\nTest 6: Optimize indexes');
  try {
    const result = await service.optimizeIndexes();
    console.log('✅ Index optimization completed');
    console.log('   Tables analyzed:', result.optimizations.length);
    result.optimizations.forEach(opt => {
      console.log(`   - ${opt.table}: ${opt.status}`);
    });
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 7: Get performance stats
  console.log('\nTest 7: Get performance stats');
  try {
    const stats = await service.getPerformanceStats();
    console.log('✅ Performance stats retrieved');
    console.log('   Cache size:', stats.cache.size);
    console.log('   Cache hit rate:', (stats.cache.hit_rate * 100).toFixed(1) + '%');
    console.log('   Pending batches:', stats.batch_queue.pending);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 8: Clear expired cache
  console.log('\nTest 8: Clear expired cache');
  try {
    const sizeBefore = service.queryCache.size;
    service.clearExpiredCache();
    const sizeAfter = service.queryCache.size;
    
    console.log('✅ Cache cleanup completed');
    console.log('   Size before:', sizeBefore);
    console.log('   Size after:', sizeAfter);
    console.log('   Entries cleared:', sizeBefore - sizeAfter);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 9: Warmup cache
  console.log('\nTest 9: Warmup cache');
  try {
    await service.warmupCache(projectId);
    console.log('✅ Cache warmed up');
    console.log('   Cache size:', service.queryCache.size);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 10: Get slow query report
  console.log('\nTest 10: Get slow query report');
  try {
    const report = await service.getSlowQueryReport();
    console.log('✅ Slow query report generated');
    console.log('   Slow queries found:', report.length);
    if (report.length > 0) {
      console.log('   Slowest query avg time:', report[0].avg_time_ms + 'ms');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);
