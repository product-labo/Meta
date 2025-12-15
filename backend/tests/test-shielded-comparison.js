import { 
  compareShieldedVsTransparentUsers,
  classifyUsersByPrivacyUsage,
  calculateDetailedMetrics,
  analyzeRetentionByUserType,
  analyzeEngagementPatterns,
  calculateShieldedCorrelations,
  USER_TYPES,
  COMPARISON_METRICS
} from './src/services/shieldedComparison.js';

import pool from './src/db/db.js';

// =====================================================
// SHIELDED VS TRANSPARENT COMPARISON TEST SUITE
// =====================================================

async function testShieldedComparison() {
  console.log('⚖️  Testing Shielded vs Transparent User Comparison...\n');
  
  try {
    // Test 1: Get test data
    const testData = await getTestData();
    if (!testData.project) {
      console.log('❌ No test data available. Please run populate-analytics-from-zcash-data.js first');
      return;
    }
    
    // Test 2: User classification by privacy usage
    await testUserClassification(testData.project.id);
    
    // Test 3: Detailed metrics calculation
    await testDetailedMetrics(testData.project.id);
    
    // Test 4: Retention analysis by user type
    await testRetentionAnalysis(testData.project.id);
    
    // Test 5: Engagement pattern analysis
    await testEngagementAnalysis(testData.project.id);
    
    // Test 6: Correlation analysis
    await testCorrelationAnalysis(testData.project.id);
    
    // Test 7: Comprehensive comparison
    await testComprehensiveComparison(testData.project.id);
    
    console.log('\n✅ All shielded comparison tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// =====================================================
// INDIVIDUAL TEST FUNCTIONS
// =====================================================

async function testUserClassification(projectId) {
  console.log(`👥 Testing user classification for project ${projectId}...`);
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate - 60 * 24 * 60 * 60 * 1000); // 60 days
    
    const classification = await classifyUsersByPrivacyUsage(projectId, startDate, endDate);
    
    console.log('  ✅ User classification completed');
    console.log(`  📊 Total Users: ${classification.total_users}`);
    
    Object.values(USER_TYPES).forEach(type => {
      const dist = classification.distribution[type];
      console.log(`  ${getTypeEmoji(type)} ${type}: ${dist.count} users (${dist.percentage}%)`);
    });
    
    // Show sample users from each category
    Object.values(USER_TYPES).forEach(type => {
      const users = classification[type];
      if (users.length > 0) {
        const sample = users[0];
        console.log(`    Sample ${type}: ${sample.shielded_percentage}% shielded, ${sample.total_transactions} txs`);
      }
    });
    
  } catch (error) {
    console.log(`  ❌ User classification failed: ${error.message}`);
  }
  
  console.log();
}

async function testDetailedMetrics(projectId) {
  console.log(`📊 Testing detailed metrics calculation for project ${projectId}...`);
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate - 60 * 24 * 60 * 60 * 1000);
    
    // First get classification
    const classification = await classifyUsersByPrivacyUsage(projectId, startDate, endDate);
    const metrics = await calculateDetailedMetrics(classification, startDate, endDate);
    
    console.log('  ✅ Detailed metrics calculation completed');
    
    Object.values(USER_TYPES).forEach(type => {
      const metric = metrics[type];
      if (metric.count > 0) {
        console.log(`  ${getTypeEmoji(type)} ${type} Metrics:`);
        console.log(`    - Users: ${metric.count}`);
        console.log(`    - Avg Transactions: ${metric.avg_transactions_per_user}`);
        console.log(`    - Avg Volume: ${metric.avg_volume_per_user} zatoshi`);
        console.log(`    - Avg Active Days: ${metric.avg_active_days}`);
        console.log(`    - Avg Shielded %: ${metric.avg_shielded_percentage.toFixed(1)}%`);
        console.log(`    - Shielded Ratio: ${metric.shielded_ratio}%`);
      }
    });
    
  } catch (error) {
    console.log(`  ❌ Detailed metrics calculation failed: ${error.message}`);
  }
  
  console.log();
}

async function testRetentionAnalysis(projectId) {
  console.log(`📈 Testing retention analysis for project ${projectId}...`);
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate - 60 * 24 * 60 * 60 * 1000);
    
    const classification = await classifyUsersByPrivacyUsage(projectId, startDate, endDate);
    const retentionAnalysis = await analyzeRetentionByUserType(classification, 30);
    
    console.log('  ✅ Retention analysis completed');
    
    Object.values(USER_TYPES).forEach(type => {
      const retention = retentionAnalysis[type];
      if (classification[type].length > 0) {
        console.log(`  ${getTypeEmoji(type)} ${type} Retention:`);
        console.log(`    - Week 1: ${retention.week_1}%`);
        console.log(`    - Week 2: ${retention.week_2}%`);
        console.log(`    - Week 3: ${retention.week_3}%`);
        console.log(`    - Week 4: ${retention.week_4}%`);
        console.log(`    - Average: ${retention.avg_retention}%`);
        console.log(`    - Trend: ${retention.retention_trend}`);
      }
    });
    
  } catch (error) {
    console.log(`  ❌ Retention analysis failed: ${error.message}`);
  }
  
  console.log();
}

async function testEngagementAnalysis(projectId) {
  console.log(`🎯 Testing engagement analysis for project ${projectId}...`);
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate - 60 * 24 * 60 * 60 * 1000);
    
    const classification = await classifyUsersByPrivacyUsage(projectId, startDate, endDate);
    const engagementAnalysis = await analyzeEngagementPatterns(classification, startDate, endDate);
    
    console.log('  ✅ Engagement analysis completed');
    
    Object.values(USER_TYPES).forEach(type => {
      const engagement = engagementAnalysis[type];
      if (classification[type].length > 0) {
        console.log(`  ${getTypeEmoji(type)} ${type} Engagement:`);
        console.log(`    - Avg Session Duration: ${engagement.avg_session_duration_hours} hours`);
        console.log(`    - Avg Transactions/Session: ${engagement.avg_transactions_per_session}`);
        console.log(`    - Days Between Transactions: ${engagement.avg_days_between_transactions}`);
        console.log(`    - Engagement Consistency: ${engagement.engagement_consistency}%`);
        console.log(`    - Peak Activity: ${engagement.peak_activity_pattern}`);
        console.log(`    - Total Sessions: ${engagement.total_sessions}`);
      }
    });
    
  } catch (error) {
    console.log(`  ❌ Engagement analysis failed: ${error.message}`);
  }
  
  console.log();
}

async function testCorrelationAnalysis(projectId) {
  console.log(`🔗 Testing correlation analysis for project ${projectId}...`);
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate - 60 * 24 * 60 * 60 * 1000);
    
    const correlationAnalysis = await calculateShieldedCorrelations(projectId, startDate, endDate);
    
    console.log('  ✅ Correlation analysis completed');
    console.log(`  📊 Sample Size: ${correlationAnalysis.sample_size}`);
    console.log(`  📈 Statistical Significance: ${correlationAnalysis.significance}`);
    
    if (correlationAnalysis.correlations) {
      console.log('  🔗 Correlations:');
      Object.entries(correlationAnalysis.correlations).forEach(([metric, corr]) => {
        if (corr.coefficient !== undefined) {
          console.log(`    - ${metric}: r=${corr.coefficient} (${corr.strength})`);
        }
      });
    }
    
    if (correlationAnalysis.insights && correlationAnalysis.insights.length > 0) {
      console.log('  💡 Correlation Insights:');
      correlationAnalysis.insights.forEach(insight => {
        console.log(`    • ${insight}`);
      });
    }
    
  } catch (error) {
    console.log(`  ❌ Correlation analysis failed: ${error.message}`);
  }
  
  console.log();
}

async function testComprehensiveComparison(projectId) {
  console.log(`🏆 Testing comprehensive comparison for project ${projectId}...`);
  
  try {
    const comparison = await compareShieldedVsTransparentUsers(projectId, 60);
    
    console.log('  ✅ Comprehensive comparison completed');
    console.log(`  📊 Analysis Period: ${comparison.analysis_period.days} days`);
    console.log(`  👥 Total Users Analyzed: ${comparison.user_classification.total_users}`);
    
    // Show key findings
    if (comparison.insights.key_findings.length > 0) {
      console.log('  🔍 Key Findings:');
      comparison.insights.key_findings.forEach(finding => {
        console.log(`    • ${finding}`);
      });
    }
    
    // Show privacy adoption insights
    if (comparison.insights.privacy_adoption_insights.length > 0) {
      console.log('  🔒 Privacy Adoption Insights:');
      comparison.insights.privacy_adoption_insights.forEach(insight => {
        console.log(`    • ${insight}`);
      });
    }
    
    // Show retention insights
    if (comparison.insights.retention_insights.length > 0) {
      console.log('  📈 Retention Insights:');
      comparison.insights.retention_insights.forEach(insight => {
        console.log(`    • ${insight}`);
      });
    }
    
    // Show engagement insights
    if (comparison.insights.engagement_insights.length > 0) {
      console.log('  🎯 Engagement Insights:');
      comparison.insights.engagement_insights.forEach(insight => {
        console.log(`    • ${insight}`);
      });
    }
    
    // Show recommendations
    if (comparison.insights.recommendations.length > 0) {
      console.log('  💡 Recommendations:');
      comparison.insights.recommendations.forEach(rec => {
        console.log(`    • ${rec}`);
      });
    }
    
    // Show user type comparison summary
    console.log('  📊 User Type Summary:');
    Object.values(USER_TYPES).forEach(type => {
      const dist = comparison.user_classification.distribution[type];
      const metrics = comparison.detailed_metrics[type];
      const retention = comparison.retention_analysis[type];
      
      if (dist.count > 0) {
        console.log(`    ${getTypeEmoji(type)} ${type}:`);
        console.log(`      Users: ${dist.count} (${dist.percentage}%)`);
        console.log(`      Avg Retention: ${retention.avg_retention}%`);
        console.log(`      Avg Transactions: ${metrics.avg_transactions_per_user}`);
        console.log(`      Avg Volume: ${metrics.avg_volume_per_user} zatoshi`);
      }
    });
    
  } catch (error) {
    console.log(`  ❌ Comprehensive comparison failed: ${error.message}`);
  }
  
  console.log();
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getTypeEmoji(userType) {
  switch (userType) {
    case USER_TYPES.SHIELDED_HEAVY: return '🔒';
    case USER_TYPES.SHIELDED_MODERATE: return '🔐';
    case USER_TYPES.SHIELDED_LIGHT: return '🔓';
    case USER_TYPES.TRANSPARENT_ONLY: return '🌐';
    default: return '👤';
  }
}

async function getTestData() {
  try {
    // Get a project with wallets and transactions
    const projectResult = await pool.query(`
      SELECT p.id, p.name, COUNT(DISTINCT w.id) as wallet_count
      FROM projects p
      JOIN wallets w ON p.id = w.project_id
      JOIN processed_transactions pt ON w.id = pt.wallet_id
      GROUP BY p.id, p.name
      HAVING COUNT(DISTINCT w.id) > 0 AND COUNT(pt.id) > 0
      ORDER BY wallet_count DESC
      LIMIT 1
    `);
    
    if (projectResult.rows.length === 0) {
      return { project: null };
    }
    
    const project = projectResult.rows[0];
    
    console.log(`📋 Test Data:`);
    console.log(`  Project: ${project.name} (${project.wallet_count} wallets)`);
    console.log();
    
    return { project };
    
  } catch (error) {
    console.error('Error getting test data:', error);
    return { project: null };
  }
}

// Run the tests
testShieldedComparison().catch(console.error);