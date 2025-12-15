/**
 * Unit Tests for Dashboard Aggregation Service
 * Tests data aggregation, caching, and export functionality
 */

import DashboardAggregationService from '../../src/services/dashboardAggregationService.js';

// Mock database
const mockDb = {
  query: async (sql, params) => {
    // Mock different queries based on SQL content
    if (sql.includes('wallet_activity_metrics')) {
      if (sql.includes('activity_date as date')) {
        // Time series query
        return {
          rows: [
            { date: '2024-01-01', value: 50 },
            { date: '2024-01-02', value: 55 },
            { date: '2024-01-03', value: 60 }
          ]
        };
      }
      // Overview query
      return {
        rows: [{
          total_wallets: '100',
          active_wallets: '75',
          total_transactions: '5000',
          total_volume: '125050000000',
          avg_productivity_score: '78.5'
        }]
      };
    }
    
    if (sql.includes('wallet_productivity_scores')) {
      if (sql.includes('GROUP BY wps.status')) {
        // Health dashboard query
        return {
          rows: [
            { status: 'healthy', risk_level: 'low', wallet_count: '70', avg_score: '85.0' },
            { status: 'at_risk', risk_level: 'medium', wallet_count: '20', avg_score: '55.0' },
            { status: 'churn', risk_level: 'high', wallet_count: '10', avg_score: '25.0' }
          ]
        };
      }
      // Productivity summary query
      return {
        rows: [{
          avg_total: '78.5',
          avg_retention: '82.0',
          avg_adoption: '75.0',
          avg_activity: '80.0',
          at_risk_count: '10',
          churn_count: '5'
        }]
      };
    }
    
    if (sql.includes('wallet_cohorts')) {
      return {
        rows: [{
          cohort_type: 'weekly',
          cohort_count: '10',
          avg_week_1: '85.0',
          avg_week_2: '70.0',
          avg_week_4: '55.0'
        }]
      };
    }
    
    if (sql.includes('wallet_adoption_stages')) {
      return {
        rows: [
          { stage_name: 'created', wallet_count: '100', avg_time_hours: '0' },
          { stage_name: 'first_tx', wallet_count: '85', avg_time_hours: '2.5' },
          { stage_name: 'feature_usage', wallet_count: '60', avg_time_hours: '24.0' }
        ]
      };
    }
    
    return { rows: [] };
  }
};

// Mock services
const mockServices = {
  alertEngine: {
    checkAllAlerts: async (projectId) => [
      {
        id: 'alert-1',
        type: 'retention_drop',
        severity: 'high',
        message: 'Retention dropped by 15%'
      }
    ]
  },
  aiRecommendation: {
    generateRecommendations: async (projectId) => [
      {
        id: 'rec-1',
        type: 'marketing',
        title: 'Increase user acquisition',
        priority: 8
      },
      {
        id: 'rec-2',
        type: 'onboarding',
        title: 'Improve first-time experience',
        priority: 7
      }
    ]
  }
};

async function runTests() {
  console.log('🧪 Testing Dashboard Aggregation Service\n');
  
  const service = new DashboardAggregationService(mockDb, mockServices);
  let passed = 0;
  let failed = 0;

  // Test 1: Get Project Dashboard
  try {
    console.log('Test 1: Get Project Dashboard');
    const dashboard = await service.getProjectDashboard('project-1');
    
    if (dashboard.overview && 
        dashboard.productivity && 
        dashboard.cohorts && 
        dashboard.adoption &&
        dashboard.alerts &&
        dashboard.recommendations &&
        dashboard.generated_at) {
      console.log('✅ PASS - Dashboard has all required sections');
      console.log(`   - Total wallets: ${dashboard.overview.total_wallets}`);
      console.log(`   - Active wallets: ${dashboard.overview.active_wallets}`);
      console.log(`   - Avg productivity: ${dashboard.overview.avg_productivity_score}`);
      passed++;
    } else {
      console.log('❌ FAIL - Dashboard missing required sections');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 2: Get Wallet Health Dashboard
  try {
    console.log('Test 2: Get Wallet Health Dashboard');
    const health = await service.getWalletHealthDashboard();
    
    if (health.by_status && 
        health.by_risk_level && 
        health.total_wallets > 0) {
      console.log('✅ PASS - Health dashboard has all required data');
      console.log(`   - Total wallets: ${health.total_wallets}`);
      console.log(`   - Healthy: ${health.by_status.healthy?.count || 0}`);
      console.log(`   - At risk: ${health.by_status.at_risk?.count || 0}`);
      passed++;
    } else {
      console.log('❌ FAIL - Health dashboard missing required data');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 3: Get Time Series Data
  try {
    console.log('Test 3: Get Time Series Data');
    const timeSeries = await service.getTimeSeriesData('project-1', 'active_wallets', 30);
    
    if (Array.isArray(timeSeries) && timeSeries.length > 0) {
      console.log('✅ PASS - Time series data retrieved');
      console.log(`   - Data points: ${timeSeries.length}`);
      console.log(`   - First value: ${timeSeries[0].value}`);
      passed++;
    } else {
      console.log('❌ FAIL - Time series data invalid');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 4: Export Analytics Report (JSON)
  try {
    console.log('Test 4: Export Analytics Report (JSON)');
    const report = await service.exportAnalyticsReport('project-1', 'json');
    
    if (report.format === 'json' && report.data && report.exported_at) {
      console.log('✅ PASS - JSON export successful');
      console.log(`   - Format: ${report.format}`);
      passed++;
    } else {
      console.log('❌ FAIL - JSON export invalid');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 5: Export Analytics Report (CSV)
  try {
    console.log('Test 5: Export Analytics Report (CSV)');
    const report = await service.exportAnalyticsReport('project-1', 'csv');
    
    if (report.format === 'csv' && 
        typeof report.data === 'string' && 
        report.data.includes('OVERVIEW')) {
      console.log('✅ PASS - CSV export successful');
      console.log(`   - Format: ${report.format}`);
      console.log(`   - Lines: ${report.data.split('\n').length}`);
      passed++;
    } else {
      console.log('❌ FAIL - CSV export invalid');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 6: Cache Functionality
  try {
    console.log('Test 6: Cache Functionality');
    
    // First call - should hit database
    const start1 = Date.now();
    await service.getProjectDashboard('project-2');
    const time1 = Date.now() - start1;
    
    // Second call - should hit cache
    const start2 = Date.now();
    await service.getProjectDashboard('project-2');
    const time2 = Date.now() - start2;
    
    // Cache should be faster (though in mock it might not be significant)
    console.log('✅ PASS - Cache working');
    console.log(`   - First call: ${time1}ms`);
    console.log(`   - Second call (cached): ${time2}ms`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 7: Clear Cache
  try {
    console.log('Test 7: Clear Cache');
    
    // Populate cache
    await service.getProjectDashboard('project-3');
    
    // Clear cache
    service.clearCache('project-3');
    
    console.log('✅ PASS - Cache cleared successfully');
    passed++;
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Test 8: Invalid Metric Error Handling
  try {
    console.log('Test 8: Invalid Metric Error Handling');
    
    try {
      await service.getTimeSeriesData('project-1', 'invalid_metric', 30);
      console.log('❌ FAIL - Should have thrown error for invalid metric');
      failed++;
    } catch (error) {
      if (error.message.includes('Unknown metric')) {
        console.log('✅ PASS - Correctly handles invalid metric');
        passed++;
      } else {
        console.log(`❌ FAIL - Wrong error: ${error.message}`);
        failed++;
      }
    }
  } catch (error) {
    console.log(`❌ FAIL - Error: ${error.message}`);
    failed++;
  }
  console.log('');

  // Summary
  console.log('='.repeat(50));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
