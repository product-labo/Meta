import {
  calculateStageConversions,
  identifySignificantDropOffs,
  generateConversionReport
} from './src/services/conversionAnalysisService.js';

import { 
  initializeWalletAdoption,
  updateWalletAdoptionStages 
} from './src/services/adoptionStageService.js';

import { saveProcessedTransaction } from './src/models/analytics.js';
import pool from './src/db/db.js';

async function testConversionEndpoints() {
  console.log('🧪 Testing Conversion Analysis Endpoints...\n');

  try {
    // Get test project
    const projectResult = await pool.query(
      'SELECT DISTINCT project_id FROM wallets LIMIT 1'
    );

    if (projectResult.rows.length === 0) {
      console.log('❌ No projects found in database.');
      return;
    }

    const projectId = projectResult.rows[0].project_id;
    console.log(`📊 Testing with project: ${projectId}\n`);

    // Test 1: Create some test data for better analysis
    console.log('📈 Test 1: Create Test Data for Analysis');
    
    // Get existing wallets or create test scenario
    const walletsResult = await pool.query(
      'SELECT id, address FROM wallets WHERE project_id = $1 LIMIT 3',
      [projectId]
    );

    if (walletsResult.rows.length === 0) {
      console.log('  ℹ️  No wallets found for this project');
      return;
    }

    const testWallets = walletsResult.rows;
    console.log(`  Found ${testWallets.length} wallets for testing`);

    // Initialize adoption tracking for all wallets
    for (const wallet of testWallets) {
      try {
        await initializeWalletAdoption(wallet.id);
        console.log(`  ✅ Initialized adoption tracking for ${wallet.address}`);
      } catch (error) {
        console.log(`  ⚠️  ${wallet.address}: ${error.message}`);
      }
    }

    // Add some varied transaction data to create different adoption patterns
    const baseTime = new Date();
    const transactionScenarios = [
      // Wallet 1: Complete funnel progression
      {
        walletIndex: 0,
        transactions: [
          { type: 'transfer', hours: 1, value: 1000000 },
          { type: 'swap', hours: 2, value: 2000000 },
          { type: 'bridge', hours: 24, value: 3000000 },
          { type: 'transfer', hours: 48, value: 1500000 },
          { type: 'swap', hours: 72, value: 2500000 }
        ]
      },
      // Wallet 2: Drops off at feature_usage
      {
        walletIndex: 1,
        transactions: [
          { type: 'transfer', hours: 1, value: 500000 },
          { type: 'transfer', hours: 3, value: 750000 }
        ]
      },
      // Wallet 3: Drops off at first_tx (if we have a third wallet)
      {
        walletIndex: 2,
        transactions: []
      }
    ];

    for (const scenario of transactionScenarios) {
      if (scenario.walletIndex < testWallets.length) {
        const wallet = testWallets[scenario.walletIndex];
        
        for (let i = 0; i < scenario.transactions.length; i++) {
          const tx = scenario.transactions[i];
          const txData = {
            wallet_id: wallet.id,
            txid: `test_conversion_${wallet.id}_${i}`,
            block_height: 2000000 + i,
            block_timestamp: new Date(baseTime.getTime() + tx.hours * 60 * 60 * 1000),
            tx_type: tx.type,
            tx_subtype: 'outgoing',
            value_zatoshi: tx.value,
            fee_zatoshi: 10000,
            counterparty_address: `test_counterparty_${i}`,
            counterparty_type: tx.type === 'swap' ? 'defi' : 'wallet',
            feature_used: `${tx.type}_feature`,
            sequence_position: i + 1,
            time_since_previous_tx_minutes: i === 0 ? 0 : tx.hours * 60
          };

          try {
            await saveProcessedTransaction(txData);
            console.log(`  ✅ Added ${tx.type} transaction for ${wallet.address}`);
          } catch (error) {
            console.log(`  ⚠️  Transaction may already exist: ${error.message}`);
          }
        }

        // Update adoption stages
        try {
          const result = await updateWalletAdoptionStages(wallet.id);
          console.log(`  📊 ${wallet.address}: Updated ${result.updates.length} stages`);
        } catch (error) {
          console.log(`  ❌ Failed to update stages for ${wallet.address}: ${error.message}`);
        }
      }
    }
    console.log();

    // Test 2: Basic conversion analysis
    console.log('🔄 Test 2: Stage Conversion Analysis');
    try {
      const conversions = await calculateStageConversions(projectId);
      console.log('  Stage-to-stage conversions:');
      
      if (conversions.length > 0) {
        conversions.forEach(conv => {
          const significance = conv.statistical_significance ? '✅' : '⚠️';
          console.log(`    ${conv.from_stage} → ${conv.to_stage}: ${conv.conversion_rate}% ${significance}`);
          console.log(`      Drop-off: ${conv.drop_off_rate}% (${conv.wallets_dropped} wallets)`);
          console.log(`      Sample size: ${conv.sample_size}`);
        });
      } else {
        console.log('    ℹ️  No conversion data available (insufficient sample size)');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 3: Drop-off analysis
    console.log('📉 Test 3: Drop-off Analysis');
    try {
      const dropOffs = await identifySignificantDropOffs(projectId);
      console.log('  Drop-off analysis:');
      
      if (dropOffs.length > 0) {
        dropOffs.forEach(dropOff => {
          const severityIcon = dropOff.severity === 'high' ? '🔴' : 
                             dropOff.severity === 'medium' ? '🟡' : '🟢';
          console.log(`    ${severityIcon} ${dropOff.stage_transition}`);
          console.log(`      Drop-off rate: ${dropOff.drop_off_rate}%`);
          console.log(`      Impact score: ${dropOff.impact_score}`);
          console.log(`      Priority: ${dropOff.priority}/3`);
          
          if (dropOff.recommendations.length > 0) {
            console.log(`      Top recommendation: ${dropOff.recommendations[0]}`);
          }
        });
      } else {
        console.log('    ℹ️  No significant drop-offs identified');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 4: Comprehensive conversion report
    console.log('📋 Test 4: Comprehensive Conversion Report');
    try {
      const report = await generateConversionReport(projectId);
      console.log('  Conversion report:');
      console.log(`    Funnel health score: ${report.funnel_health.score}/100`);
      console.log(`    Health status: ${report.funnel_health.status}`);
      console.log(`    Average conversion rate: ${report.funnel_health.avg_conversion_rate}%`);
      
      if (report.recommendations.priority_actions.length > 0) {
        console.log('  Priority actions:');
        report.recommendations.priority_actions.forEach((action, index) => {
          console.log(`    ${index + 1}. ${action.issue} (${action.severity})`);
        });
      }
      
      if (report.recommendations.overall_suggestions.length > 0) {
        console.log('  Overall suggestions:');
        report.recommendations.overall_suggestions.slice(0, 2).forEach(suggestion => {
          console.log(`    - ${suggestion}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 5: Verify data consistency
    console.log('🔍 Test 5: Data Consistency Check');
    const consistencyResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT w.id) as total_wallets,
         COUNT(DISTINCT was.wallet_id) as wallets_with_stages,
         COUNT(DISTINCT pt.wallet_id) as wallets_with_transactions,
         AVG(CASE WHEN was.achieved_at IS NOT NULL THEN 1.0 ELSE 0.0 END) as avg_stage_completion
       FROM wallets w
       LEFT JOIN wallet_adoption_stages was ON w.id = was.wallet_id
       LEFT JOIN processed_transactions pt ON w.id = pt.wallet_id
       WHERE w.project_id = $1`,
      [projectId]
    );

    const consistency = consistencyResult.rows[0];
    console.log('  Data consistency:');
    console.log(`    Total wallets: ${consistency.total_wallets}`);
    console.log(`    Wallets with adoption stages: ${consistency.wallets_with_stages}`);
    console.log(`    Wallets with transactions: ${consistency.wallets_with_transactions}`);
    console.log(`    Average stage completion: ${Math.round(consistency.avg_stage_completion * 100)}%`);
    console.log();

    // Test 6: API endpoint simulation
    console.log('🌐 Test 6: API Endpoint Simulation');
    console.log('  Available endpoints:');
    console.log('    GET /api/projects/:projectId/analytics/conversion-analysis');
    console.log('    GET /api/projects/:projectId/analytics/conversion-report');
    console.log('    GET /api/projects/:projectId/analytics/cohort-conversions');
    console.log('    GET /api/projects/:projectId/analytics/conversion-trends');
    console.log();
    
    console.log('  Example query parameters:');
    console.log('    ?segmentBy=cohort&minSampleSize=5');
    console.log('    ?timeRange=2024-01-01,2024-12-31');
    console.log('    ?cohortType=weekly&limit=10');
    console.log('    ?timeGranularity=weekly&lookbackDays=90');
    console.log();

    console.log('✅ Conversion analysis endpoint tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run tests
testConversionEndpoints();