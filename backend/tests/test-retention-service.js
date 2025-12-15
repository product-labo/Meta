import 'dotenv/config';
import { 
  calculateCohortRetention,
  calculateAllCohortRetention,
  getRetentionHeatmapData,
  analyzeRetentionTrends,
  compareNewVsReturningRetention,
  getRetentionStatistics,
  identifyRetentionAnomalies
} from './src/services/retentionService.js';
import { getAllCohorts } from './src/services/cohortService.js';
import pool from './src/db/db.js';

async function testRetentionService() {
  console.log('🧪 Testing Retention Calculation Engine...\n');

  try {
    // Test 1: Get available cohorts
    console.log('1. Getting available cohorts...');
    
    const weeklyCohorts = await getAllCohorts('weekly', 5);
    const monthlyCohorts = await getAllCohorts('monthly', 5);
    
    console.log(`   ✓ Found ${weeklyCohorts.length} weekly cohorts`);
    console.log(`   ✓ Found ${monthlyCohorts.length} monthly cohorts`);
    
    if (weeklyCohorts.length === 0) {
      console.log('   ⚠️  No cohorts found. Please run cohort service test first.');
      return;
    }
    console.log('');

    // Test 2: Create some sample activity data for retention calculation
    console.log('2. Creating sample activity data for retention testing...');
    
    const sampleCohort = weeklyCohorts[0];
    console.log(`   Using cohort: ${sampleCohort.cohort_type} ${sampleCohort.cohort_period}`);
    
    // Get wallets in this cohort
    const cohortWalletsResult = await pool.query(`
      SELECT wca.wallet_id 
      FROM wallet_cohort_assignments wca 
      WHERE wca.cohort_id = $1
      LIMIT 1
    `, [sampleCohort.id]);

    if (cohortWalletsResult.rows.length > 0) {
      const walletId = cohortWalletsResult.rows[0].wallet_id;
      
      // Create sample activity data for different weeks
      const cohortStart = new Date(sampleCohort.cohort_period);
      
      for (let week = 0; week < 4; week++) {
        const activityDate = new Date(cohortStart);
        activityDate.setDate(activityDate.getDate() + week * 7 + 2); // Mid-week activity
        
        const dateStr = activityDate.toISOString().split('T')[0];
        
        // Create activity for this week (simulate decreasing activity over time)
        const isActive = Math.random() > (week * 0.2); // 80%, 60%, 40%, 20% chance
        
        if (isActive) {
          await pool.query(`
            INSERT INTO wallet_activity_metrics (
              wallet_id, activity_date, transaction_count, is_active, is_returning
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (wallet_id, activity_date) 
            DO UPDATE SET 
              transaction_count = EXCLUDED.transaction_count,
              is_active = EXCLUDED.is_active,
              is_returning = EXCLUDED.is_returning
          `, [walletId, dateStr, Math.floor(Math.random() * 5) + 1, true, week > 0]);
        }
      }
      
      console.log(`   ✓ Created sample activity data for wallet ${walletId}`);
    }
    console.log('');

    // Test 3: Calculate retention for a specific cohort
    console.log('3. Calculating retention for specific cohort...');
    
    const retentionRates = await calculateCohortRetention(sampleCohort.id);
    
    if (retentionRates) {
      console.log('   ✓ Retention rates calculated:');
      console.log(`     Week 1: ${retentionRates.week_1}%`);
      console.log(`     Week 2: ${retentionRates.week_2}%`);
      console.log(`     Week 3: ${retentionRates.week_3}%`);
      console.log(`     Week 4: ${retentionRates.week_4}%`);
    } else {
      console.log('   ℹ️  No retention data calculated (cohort may be empty)');
    }
    console.log('');

    // Test 4: Calculate retention for all cohorts
    console.log('4. Calculating retention for all weekly cohorts...');
    
    const allRetentionResults = await calculateAllCohortRetention('weekly');
    
    console.log(`   ✓ Calculated retention for ${allRetentionResults.length} cohorts`);
    allRetentionResults.slice(0, 3).forEach((result, index) => {
      const rates = result.retentionRates;
      console.log(`     Cohort ${index + 1}: W1=${rates.week_1}%, W2=${rates.week_2}%, W3=${rates.week_3}%, W4=${rates.week_4}%`);
    });
    console.log('');

    // Test 5: Get retention heatmap data
    console.log('5. Getting retention heatmap data...');
    
    const heatmapData = await getRetentionHeatmapData('weekly', 10);
    
    console.log(`   ✓ Retrieved heatmap data for ${heatmapData.length} cohorts:`);
    heatmapData.slice(0, 3).forEach(cohort => {
      console.log(`     ${cohort.cohort_period}: ${cohort.new_users} users, W1=${cohort.week_1}%`);
    });
    console.log('');

    // Test 6: Analyze retention trends
    console.log('6. Analyzing retention trends...');
    
    const trendAnalysis = await analyzeRetentionTrends('weekly', 8);
    
    console.log('   ✓ Retention trend analysis:');
    if (trendAnalysis.analysis && typeof trendAnalysis.analysis === 'object') {
      console.log(`     Recent avg retention: ${trendAnalysis.analysis.recent_avg_retention}%`);
      console.log(`     Older avg retention: ${trendAnalysis.analysis.older_avg_retention}%`);
      console.log(`     Trend direction: ${trendAnalysis.analysis.trend_direction}`);
      console.log(`     Trend magnitude: ${trendAnalysis.analysis.trend_magnitude}%`);
      console.log(`     Periods analyzed: ${trendAnalysis.analysis.periods_analyzed}`);
    } else {
      console.log(`     ${trendAnalysis.analysis}`);
    }
    console.log('');

    // Test 7: Compare new vs returning wallet retention
    console.log('7. Comparing new vs returning wallet retention...');
    
    if (sampleCohort) {
      const comparison = await compareNewVsReturningRetention(sampleCohort.id);
      
      console.log('   ✓ New vs Returning comparison:');
      console.log(`     New wallets: ${comparison.new_wallets.wallet_count} wallets, ${parseFloat(comparison.new_wallets.avg_activity_rate || 0).toFixed(2)}% avg activity`);
      console.log(`     Returning wallets: ${comparison.returning_wallets.wallet_count} wallets, ${parseFloat(comparison.returning_wallets.avg_activity_rate || 0).toFixed(2)}% avg activity`);
    }
    console.log('');

    // Test 8: Get retention statistics
    console.log('8. Getting retention statistics...');
    
    const statistics = await getRetentionStatistics();
    
    console.log('   ✓ Retention statistics:');
    statistics.forEach(stat => {
      console.log(`     ${stat.cohort_type}:`);
      console.log(`       Total cohorts: ${stat.total_cohorts}`);
      console.log(`       Avg cohort size: ${parseFloat(stat.avg_cohort_size || 0).toFixed(1)}`);
      console.log(`       Avg Week 1 retention: ${parseFloat(stat.avg_week_1_retention || 0).toFixed(2)}%`);
      console.log(`       Avg Week 4 retention: ${parseFloat(stat.avg_week_4_retention || 0).toFixed(2)}%`);
    });
    console.log('');

    // Test 9: Identify retention anomalies
    console.log('9. Identifying retention anomalies...');
    
    const anomalies = await identifyRetentionAnomalies('weekly', 5);
    
    console.log(`   ✓ Found ${anomalies.length} retention anomalies (>5% change):`);
    anomalies.slice(0, 3).forEach(anomaly => {
      console.log(`     ${anomaly.cohort_period}: ${anomaly.retention_change > 0 ? '+' : ''}${anomaly.retention_change.toFixed(2)}% change`);
    });
    console.log('');

    // Test 10: Verify database state
    console.log('10. Verifying database state...');
    
    const updatedCohortsCount = await pool.query(`
      SELECT COUNT(*) FROM wallet_cohorts 
      WHERE retention_week_1 IS NOT NULL
    `);
    
    const activityMetricsCount = await pool.query(`
      SELECT COUNT(*) FROM wallet_activity_metrics
    `);
    
    console.log(`   ✓ Cohorts with retention data: ${updatedCohortsCount.rows[0].count}`);
    console.log(`   ✓ Total activity metrics: ${activityMetricsCount.rows[0].count}`);
    console.log('');

    console.log('🎉 Retention service test completed successfully!');
    console.log('\n📊 Retention Engine Features:');
    console.log('   ✓ Weekly retention rate calculation');
    console.log('   ✓ Multi-week retention tracking (1-4 weeks)');
    console.log('   ✓ Batch retention processing for all cohorts');
    console.log('   ✓ Retention heatmap data generation');
    console.log('   ✓ Retention trend analysis over time');
    console.log('   ✓ New vs returning wallet comparison');
    console.log('   ✓ Comprehensive retention statistics');
    console.log('   ✓ Retention anomaly detection');
    console.log('   ✓ Automatic cohort retention updates');

  } catch (error) {
    console.error('❌ Retention service test failed:', error);
  } finally {
    await pool.end();
  }
}

testRetentionService();