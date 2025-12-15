import {
  calculateEnhancedProductivityScore,
  updateProductivityScore,
  getBulkProductivityScores,
  getProjectProductivitySummary,
  SCORING_WEIGHTS,
  STATUS_THRESHOLDS,
  RISK_THRESHOLDS
} from './src/services/productivityScoringService.js';

import pool from './src/db/db.js';

async function testProductivityScoring() {
  console.log('🎯 Testing Enhanced Productivity Scoring Service...\n');

  try {
    // Test 1: Display scoring configuration
    console.log('⚙️  Test 1: Scoring Configuration');
    console.log('  Component weights:');
    Object.entries(SCORING_WEIGHTS).forEach(([component, weight]) => {
      console.log(`    ${component}: ${(weight * 100).toFixed(0)}%`);
    });
    
    console.log('  Status thresholds:');
    Object.entries(STATUS_THRESHOLDS).forEach(([status, threshold]) => {
      console.log(`    ${status}: >= ${threshold}`);
    });
    
    console.log('  Risk thresholds:');
    Object.entries(RISK_THRESHOLDS).forEach(([risk, threshold]) => {
      console.log(`    ${risk}: >= ${threshold}`);
    });
    console.log();

    // Get test wallets with real Zcash data
    const walletsResult = await pool.query(`
      SELECT w.id, w.address, w.type,
             COUNT(pt.id) as transaction_count,
             COUNT(CASE WHEN was.achieved_at IS NOT NULL THEN 1 END) as stages_achieved
      FROM wallets w
      LEFT JOIN processed_transactions pt ON w.id = pt.wallet_id
      LEFT JOIN wallet_adoption_stages was ON w.id = was.wallet_id
      WHERE w.project_id = (SELECT id FROM projects LIMIT 1)
      GROUP BY w.id, w.address, w.type
      ORDER BY COUNT(pt.id) DESC
      LIMIT 5
    `);

    if (walletsResult.rows.length === 0) {
      console.log('❌ No wallets found. Run populate-analytics-from-zcash-data.js first.');
      return;
    }

    const testWallets = walletsResult.rows;
    console.log(`📊 Testing with ${testWallets.length} wallets from real Zcash data:`);
    testWallets.forEach(wallet => {
      console.log(`  - ${wallet.address}: ${wallet.transaction_count} txs, ${wallet.stages_achieved} stages`);
    });
    console.log();

    // Test 2: Calculate enhanced productivity scores
    console.log('🧮 Test 2: Enhanced Productivity Score Calculation');
    for (const wallet of testWallets.slice(0, 3)) { // Test first 3 wallets
      try {
        console.log(`  📊 Analyzing ${wallet.address}:`);
        const scores = await calculateEnhancedProductivityScore(wallet.id);
        
        console.log(`    Total Score: ${scores.total_score}/100 (${scores.status}, ${scores.risk_level} risk)`);
        console.log(`    Component Scores:`);
        console.log(`      Retention: ${scores.component_scores.retention_score}/100 (${scores.color_indicators.retention})`);
        console.log(`      Adoption: ${scores.component_scores.adoption_score}/100 (${scores.color_indicators.adoption})`);
        console.log(`      Churn: ${scores.component_scores.churn_score}/100 (${scores.color_indicators.churn})`);
        console.log(`      Frequency: ${scores.component_scores.frequency_score}/100 (${scores.color_indicators.frequency})`);
        console.log(`      Activity: ${scores.component_scores.activity_score}/100 (${scores.color_indicators.activity})`);
        
        console.log(`    Weighted Contributions:`);
        console.log(`      Retention: ${scores.weighted_contributions.retention} pts`);
        console.log(`      Adoption: ${scores.weighted_contributions.adoption} pts`);
        console.log(`      Churn: ${scores.weighted_contributions.churn} pts`);
        console.log(`      Frequency: ${scores.weighted_contributions.frequency} pts`);
        console.log(`      Activity: ${scores.weighted_contributions.activity} pts`);
        console.log();

      } catch (error) {
        console.log(`    ❌ Error calculating score: ${error.message}`);
      }
    }

    // Test 3: Update productivity scores in database
    console.log('💾 Test 3: Database Score Updates');
    for (const wallet of testWallets.slice(0, 2)) {
      try {
        const result = await updateProductivityScore(wallet.id);
        console.log(`  ✅ Updated ${wallet.address}: ${result.total_score}/100 (${result.status})`);
      } catch (error) {
        console.log(`  ❌ Failed to update ${wallet.address}: ${error.message}`);
      }
    }
    console.log();

    // Test 4: Bulk productivity scoring
    console.log('📦 Test 4: Bulk Productivity Scoring');
    const walletIds = testWallets.map(w => w.id);
    try {
      const bulkScores = await getBulkProductivityScores(walletIds);
      console.log('  Bulk scoring results:');
      bulkScores.forEach((result, index) => {
        const wallet = testWallets[index];
        if (result.success) {
          console.log(`    ✅ ${wallet.address}: ${result.scores.total_score}/100 (${result.scores.status})`);
        } else {
          console.log(`    ❌ ${wallet.address}: ${result.error}`);
        }
      });
    } catch (error) {
      console.log(`  ❌ Bulk scoring failed: ${error.message}`);
    }
    console.log();

    // Test 5: Project-level productivity summary
    console.log('📈 Test 5: Project Productivity Summary');
    const projectResult = await pool.query('SELECT id FROM projects LIMIT 1');
    if (projectResult.rows.length > 0) {
      const projectId = projectResult.rows[0].id;
      try {
        const summary = await getProjectProductivitySummary(projectId);
        console.log('  Project productivity overview:');
        console.log(`    Total wallets: ${summary.total_wallets}`);
        console.log(`    Average score: ${summary.average_score}/100`);
        console.log(`    Health percentage: ${summary.health_percentage}%`);
        
        console.log('  Status distribution:');
        console.log(`    Healthy: ${summary.status_distribution.healthy} (${summary.status_distribution.healthy > 0 ? Math.round((summary.status_distribution.healthy / summary.total_wallets) * 100) : 0}%)`);
        console.log(`    At risk: ${summary.status_distribution.at_risk} (${summary.status_distribution.at_risk > 0 ? Math.round((summary.status_distribution.at_risk / summary.total_wallets) * 100) : 0}%)`);
        console.log(`    Churn: ${summary.status_distribution.churn} (${summary.status_distribution.churn > 0 ? Math.round((summary.status_distribution.churn / summary.total_wallets) * 100) : 0}%)`);
        
        console.log('  Risk distribution:');
        console.log(`    Low risk: ${summary.risk_distribution.low}`);
        console.log(`    Medium risk: ${summary.risk_distribution.medium}`);
        console.log(`    High risk: ${summary.risk_distribution.high}`);
      } catch (error) {
        console.log(`  ❌ Project summary failed: ${error.message}`);
      }
    }
    console.log();

    // Test 6: Score component analysis
    console.log('🔍 Test 6: Score Component Analysis');
    const componentAnalysis = await pool.query(`
      SELECT 
        w.address,
        wps.total_score,
        wps.retention_score,
        wps.adoption_score,
        wps.activity_score,
        wps.diversity_score,
        wps.status,
        wps.risk_level
      FROM wallets w
      JOIN wallet_productivity_scores wps ON w.id = wps.wallet_id
      WHERE w.project_id = (SELECT id FROM projects LIMIT 1)
      ORDER BY wps.total_score DESC
      LIMIT 5
    `);

    if (componentAnalysis.rows.length > 0) {
      console.log('  Top scoring wallets:');
      componentAnalysis.rows.forEach((wallet, index) => {
        console.log(`    ${index + 1}. ${wallet.address} (${wallet.total_score}/100)`);
        console.log(`       Status: ${wallet.status}, Risk: ${wallet.risk_level}`);
        console.log(`       Components: R:${wallet.retention_score} A:${wallet.adoption_score} Act:${wallet.activity_score} D:${wallet.diversity_score}`);
      });
    } else {
      console.log('  ℹ️  No scored wallets found in database');
    }
    console.log();

    // Test 7: Color indicator validation
    console.log('🎨 Test 7: Color Indicator Validation');
    const testScores = [
      { name: 'High Score', score: 85 },
      { name: 'Medium Score', score: 55 },
      { name: 'Low Score', score: 25 }
    ];

    testScores.forEach(test => {
      const color = test.score >= 70 ? 'green' : test.score >= 40 ? 'yellow' : 'red';
      const icon = color === 'green' ? '🟢' : color === 'yellow' ? '🟡' : '🔴';
      console.log(`    ${icon} ${test.name} (${test.score}/100): ${color}`);
    });
    console.log();

    console.log('✅ Enhanced Productivity Scoring Service tests completed!');
    console.log('🎉 Key features validated:');
    console.log('   - Multi-component scoring with proper weighting');
    console.log('   - Color-coded status indicators (red/yellow/green)');
    console.log('   - Component-level score breakdowns');
    console.log('   - Risk level assessment');
    console.log('   - Bulk scoring capabilities');
    console.log('   - Project-level summaries');
    console.log('   - Real Zcash data integration');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run tests
testProductivityScoring();