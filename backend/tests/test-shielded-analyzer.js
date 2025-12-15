import { 
  analyzeWalletShieldedActivity,
  compareShieldedVsTransparentUsers,
  analyzeProjectShieldedActivity,
  getWalletShieldedMetrics,
  getProjectShieldedAnalytics,
  calculateWalletShieldedPercentage,
  isShieldedAddress,
  getShieldedAddressType,
  SHIELDED_ADDRESS_PATTERNS,
  PRIVACY_BEHAVIORS,
  SHIELDED_ACTIVITY_TYPES
} from './src/services/shieldedAnalyzer.js';

import pool from './src/db/db.js';

// =====================================================
// SHIELDED ANALYZER TEST SUITE
// =====================================================

async function testShieldedAnalyzer() {
  console.log('🔒 Testing Shielded Transaction Analyzer...\n');
  
  try {
    // Test 1: Address Pattern Recognition
    await testAddressPatterns();
    
    // Test 2: Get test data
    const testData = await getTestData();
    if (!testData.wallet || !testData.project) {
      console.log('❌ No test data available. Please run populate-analytics-from-zcash-data.js first');
      return;
    }
    
    // Test 3: Analyze wallet shielded activity
    await testWalletShieldedAnalysis(testData.wallet.id);
    
    // Test 4: Get wallet shielded metrics
    await testWalletShieldedMetrics(testData.wallet.id);
    
    // Test 5: Calculate shielded percentage
    await testShieldedPercentage(testData.wallet.id);
    
    // Test 6: Project-wide shielded analytics
    await testProjectShieldedAnalytics(testData.project.id);
    
    // Test 7: Compare shielded vs transparent users
    await testShieldedVsTransparentComparison(testData.project.id);
    
    // Test 8: Batch analyze project
    await testProjectBatchAnalysis(testData.project.id);
    
    console.log('\n✅ All shielded analyzer tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// =====================================================
// INDIVIDUAL TEST FUNCTIONS
// =====================================================

async function testAddressPatterns() {
  console.log('📍 Testing address pattern recognition...');
  
  const testAddresses = [
    { address: 'zs1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab', type: 'sapling' },
    { address: 'zc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123', type: 'sprout' },
    { address: 'u1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', type: 'unified' },
    { address: 't1234567890abcdef1234567890abcdef12345678', type: null },
    { address: null, type: null }
  ];
  
  for (const test of testAddresses) {
    const isShielded = isShieldedAddress(test.address);
    const addressType = getShieldedAddressType(test.address);
    
    console.log(`  Address: ${test.address ? test.address.substring(0, 20) + '...' : 'null'}`);
    console.log(`  Is Shielded: ${isShielded}, Type: ${addressType}, Expected: ${test.type}`);
    
    if (test.type === null) {
      if (isShielded || addressType !== null) {
        console.log(`  ❌ Expected non-shielded, got shielded: ${isShielded}, type: ${addressType}`);
      } else {
        console.log(`  ✅ Correctly identified as non-shielded`);
      }
    } else {
      if (!isShielded || addressType !== test.type) {
        console.log(`  ❌ Expected ${test.type}, got ${addressType}`);
      } else {
        console.log(`  ✅ Correctly identified as ${test.type}`);
      }
    }
    console.log();
  }
}

async function testWalletShieldedAnalysis(walletId) {
  console.log(`📊 Testing wallet shielded analysis for wallet ${walletId}...`);
  
  try {
    // Use a historical date where we have transaction data
    const analysisDate = '2016-10-28'; // Date from our test data
    const metrics = await analyzeWalletShieldedActivity(walletId, analysisDate);
    
    if (metrics) {
      console.log('  ✅ Analysis completed successfully');
      console.log(`  📈 Privacy Score: ${metrics.privacy_score}/100`);
      console.log(`  🔒 Shielded Transactions: ${metrics.shielded_tx_count}`);
      console.log(`  ➡️  T→Z Transactions: ${metrics.transparent_to_shielded_count}`);
      console.log(`  ⬅️  Z→T Transactions: ${metrics.shielded_to_transparent_count}`);
      console.log(`  🔄 Internal Shielded: ${metrics.internal_shielded_count}`);
      console.log(`  💰 Shielded Volume: ${metrics.shielded_volume_zatoshi} zatoshi`);
      console.log(`  ⏱️  Avg Duration: ${metrics.avg_shielded_duration_hours?.toFixed(2) || 0} hours`);
    } else {
      console.log('  ℹ️  No shielded activity found for this date');
    }
  } catch (error) {
    console.log(`  ❌ Analysis failed: ${error.message}`);
  }
  
  console.log();
}

async function testWalletShieldedMetrics(walletId) {
  console.log(`📋 Testing wallet shielded metrics retrieval for wallet ${walletId}...`);
  
  try {
    const metrics = await getWalletShieldedMetrics(walletId, 30);
    
    console.log(`  ✅ Retrieved ${metrics.length} days of metrics`);
    
    if (metrics.length > 0) {
      const latest = metrics[0];
      console.log(`  📅 Latest Date: ${latest.analysis_date}`);
      console.log(`  📊 Privacy Score: ${latest.privacy_score}/100`);
      console.log(`  🔒 Shielded Transactions: ${latest.shielded_tx_count}`);
      
      // Calculate averages
      const avgPrivacyScore = metrics.reduce((sum, m) => sum + m.privacy_score, 0) / metrics.length;
      const totalShielded = metrics.reduce((sum, m) => sum + m.shielded_tx_count, 0);
      
      console.log(`  📈 30-day Avg Privacy Score: ${avgPrivacyScore.toFixed(2)}/100`);
      console.log(`  🔢 Total Shielded Transactions: ${totalShielded}`);
    }
  } catch (error) {
    console.log(`  ❌ Metrics retrieval failed: ${error.message}`);
  }
  
  console.log();
}

async function testShieldedPercentage(walletId) {
  console.log(`📊 Testing shielded percentage calculation for wallet ${walletId}...`);
  
  try {
    const percentage = await calculateWalletShieldedPercentage(walletId, 30);
    
    console.log(`  ✅ Calculation completed`);
    console.log(`  📈 Shielded Transaction Percentage: ${percentage}%`);
    
    if (percentage > 50) {
      console.log(`  🔒 High privacy user (>50% shielded)`);
    } else if (percentage > 20) {
      console.log(`  🔄 Mixed privacy user (20-50% shielded)`);
    } else if (percentage > 0) {
      console.log(`  👁️  Low privacy user (<20% shielded)`);
    } else {
      console.log(`  🌐 Transparent-only user (0% shielded)`);
    }
  } catch (error) {
    console.log(`  ❌ Percentage calculation failed: ${error.message}`);
  }
  
  console.log();
}

async function testProjectShieldedAnalytics(projectId) {
  console.log(`🏢 Testing project shielded analytics for project ${projectId}...`);
  
  try {
    const analytics = await getProjectShieldedAnalytics(projectId, 30);
    
    console.log(`  ✅ Retrieved ${analytics.length} days of project analytics`);
    
    if (analytics.length > 0) {
      const latest = analytics[0];
      console.log(`  📅 Latest Date: ${latest.date}`);
      console.log(`  👥 Active Shielded Wallets: ${latest.active_shielded_wallets}`);
      console.log(`  📊 Avg Privacy Score: ${parseFloat(latest.avg_privacy_score || 0).toFixed(2)}/100`);
      console.log(`  🔒 Total Shielded Transactions: ${latest.total_shielded_transactions}`);
      console.log(`  ➡️  Total Shielding: ${latest.total_shielding_transactions}`);
      console.log(`  ⬅️  Total Deshielding: ${latest.total_deshielding_transactions}`);
      console.log(`  💰 Total Shielded Volume: ${latest.total_shielded_volume} zatoshi`);
      
      // Calculate totals
      const totalShieldedWallets = analytics.reduce((sum, a) => Math.max(sum, a.active_shielded_wallets), 0);
      const totalTransactions = analytics.reduce((sum, a) => sum + parseInt(a.total_shielded_transactions), 0);
      
      console.log(`  📈 Peak Shielded Wallets: ${totalShieldedWallets}`);
      console.log(`  🔢 30-day Total Shielded Transactions: ${totalTransactions}`);
    }
  } catch (error) {
    console.log(`  ❌ Project analytics failed: ${error.message}`);
  }
  
  console.log();
}

async function testShieldedVsTransparentComparison(projectId) {
  console.log(`⚖️  Testing shielded vs transparent user comparison for project ${projectId}...`);
  
  try {
    const comparison = await compareShieldedVsTransparentUsers(projectId, 30);
    
    console.log(`  ✅ Comparison completed`);
    console.log(`  📊 Analysis Period: ${comparison.analysis_period.days} days`);
    console.log(`  🔒 Shielded Users: ${comparison.shielded_users.count}`);
    console.log(`  🌐 Transparent Users: ${comparison.transparent_users.count}`);
    
    // Shielded user metrics
    const sm = comparison.shielded_users.metrics;
    console.log(`  📈 Shielded User Metrics:`);
    console.log(`    - Avg Transactions: ${sm.avg_transactions_per_user}`);
    console.log(`    - Avg Volume: ${sm.avg_volume_per_user} zatoshi`);
    console.log(`    - Avg Active Days: ${sm.avg_active_days}`);
    console.log(`    - Avg Session Duration: ${sm.avg_session_duration_hours} hours`);
    
    // Transparent user metrics
    const tm = comparison.transparent_users.metrics;
    console.log(`  📊 Transparent User Metrics:`);
    console.log(`    - Avg Transactions: ${tm.avg_transactions_per_user}`);
    console.log(`    - Avg Volume: ${tm.avg_volume_per_user} zatoshi`);
    console.log(`    - Avg Active Days: ${tm.avg_active_days}`);
    console.log(`    - Avg Session Duration: ${tm.avg_session_duration_hours} hours`);
    
    // Retention comparison
    console.log(`  📈 Retention Comparison:`);
    console.log(`    Shielded: W1=${comparison.shielded_users.retention.week_1}%, W4=${comparison.shielded_users.retention.week_4}%`);
    console.log(`    Transparent: W1=${comparison.transparent_users.retention.week_1}%, W4=${comparison.transparent_users.retention.week_4}%`);
    
    // Insights
    if (comparison.comparison_insights.length > 0) {
      console.log(`  💡 Key Insights:`);
      comparison.comparison_insights.forEach(insight => {
        console.log(`    - ${insight.message} (${insight.impact} impact)`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Comparison failed: ${error.message}`);
  }
  
  console.log();
}

async function testProjectBatchAnalysis(projectId) {
  console.log(`🔄 Testing project batch shielded analysis for project ${projectId}...`);
  
  try {
    // Use a historical date where we have transaction data
    const analysisDate = '2016-10-28'; // Date from our test data
    const results = await analyzeProjectShieldedActivity(projectId, analysisDate);
    
    console.log(`  ✅ Batch analysis completed`);
    console.log(`  📊 Analyzed ${results.length} wallets`);
    
    if (results.length > 0) {
      // Calculate summary statistics
      const avgPrivacyScore = results.reduce((sum, r) => sum + r.privacy_score, 0) / results.length;
      const totalShielded = results.reduce((sum, r) => sum + r.shielded_tx_count, 0);
      const highPrivacyWallets = results.filter(r => r.privacy_score > 70).length;
      
      console.log(`  📈 Average Privacy Score: ${avgPrivacyScore.toFixed(2)}/100`);
      console.log(`  🔒 Total Shielded Transactions: ${totalShielded}`);
      console.log(`  🏆 High Privacy Wallets (>70): ${highPrivacyWallets}`);
      
      // Show distribution
      const scoreRanges = {
        'High (70-100)': results.filter(r => r.privacy_score >= 70).length,
        'Medium (30-69)': results.filter(r => r.privacy_score >= 30 && r.privacy_score < 70).length,
        'Low (1-29)': results.filter(r => r.privacy_score >= 1 && r.privacy_score < 30).length,
        'None (0)': results.filter(r => r.privacy_score === 0).length
      };
      
      console.log(`  📊 Privacy Score Distribution:`);
      Object.entries(scoreRanges).forEach(([range, count]) => {
        const percentage = ((count / results.length) * 100).toFixed(1);
        console.log(`    - ${range}: ${count} wallets (${percentage}%)`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Batch analysis failed: ${error.message}`);
  }
  
  console.log();
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getTestData() {
  try {
    // Get a project with wallets
    const projectResult = await pool.query(`
      SELECT p.id, p.name, COUNT(w.id) as wallet_count
      FROM projects p
      JOIN wallets w ON p.id = w.project_id
      GROUP BY p.id, p.name
      HAVING COUNT(w.id) > 0
      ORDER BY wallet_count DESC
      LIMIT 1
    `);
    
    if (projectResult.rows.length === 0) {
      return { project: null, wallet: null };
    }
    
    const project = projectResult.rows[0];
    
    // Get a wallet with transactions
    const walletResult = await pool.query(`
      SELECT w.id, w.address, w.type, COUNT(pt.id) as tx_count
      FROM wallets w
      LEFT JOIN processed_transactions pt ON w.id = pt.wallet_id
      WHERE w.project_id = $1
      GROUP BY w.id, w.address, w.type
      HAVING COUNT(pt.id) > 0
      ORDER BY tx_count DESC
      LIMIT 1
    `, [project.id]);
    
    const wallet = walletResult.rows.length > 0 ? walletResult.rows[0] : null;
    
    console.log(`📋 Test Data:`);
    console.log(`  Project: ${project.name} (${project.wallet_count} wallets)`);
    console.log(`  Test Wallet: ${wallet ? wallet.address : 'None'} (${wallet ? wallet.tx_count : 0} transactions)`);
    console.log();
    
    return { project, wallet };
    
  } catch (error) {
    console.error('Error getting test data:', error);
    return { project: null, wallet: null };
  }
}

// Run the tests
testShieldedAnalyzer().catch(console.error);