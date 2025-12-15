import { 
  initializeWalletAdoption,
  updateWalletAdoptionStages,
  getProjectAdoptionFunnel,
  getAdoptionConversionRates,
  getTimeToStageMetrics,
  identifyDropOffPoints,
  getWalletAdoptionStatus,
  ADOPTION_STAGES,
  STAGE_CRITERIA
} from './src/services/adoptionStageService.js';

import pool from './src/db/db.js';

async function testAdoptionStageService() {
  console.log('🧪 Testing Adoption Stage Service...\n');

  try {
    // Test 1: Display stage configuration
    console.log('📋 Adoption Stage Configuration:');
    ADOPTION_STAGES.forEach((stage, index) => {
      const criteria = STAGE_CRITERIA[stage];
      console.log(`  ${index + 1}. ${stage}: ${criteria.description}`);
      if (criteria.minTransactions) console.log(`     - Min transactions: ${criteria.minTransactions}`);
      if (criteria.minActiveDays) console.log(`     - Min active days: ${criteria.minActiveDays}`);
      if (criteria.minTimeSpanDays) console.log(`     - Min time span: ${criteria.minTimeSpanDays} days`);
      if (criteria.minTotalVolume) console.log(`     - Min volume: ${criteria.minTotalVolume} zatoshi`);
    });
    console.log();

    // Get test wallets from database
    const walletsResult = await pool.query(
      'SELECT id, address, project_id FROM wallets LIMIT 3'
    );

    if (walletsResult.rows.length === 0) {
      console.log('❌ No wallets found in database. Please add some wallets first.');
      return;
    }

    const testWallets = walletsResult.rows;
    console.log(`📊 Testing with ${testWallets.length} wallets:`);
    testWallets.forEach(wallet => {
      console.log(`  - ${wallet.address} (ID: ${wallet.id})`);
    });
    console.log();

    // Test 2: Initialize adoption tracking for wallets
    console.log('🚀 Test 2: Initialize Adoption Tracking');
    for (const wallet of testWallets) {
      try {
        const result = await initializeWalletAdoption(wallet.id);
        console.log(`  ✅ ${wallet.address}: ${result.message}`);
      } catch (error) {
        console.log(`  ❌ ${wallet.address}: ${error.message}`);
      }
    }
    console.log();

    // Test 3: Update adoption stages based on current activity
    console.log('📈 Test 3: Update Adoption Stages');
    for (const wallet of testWallets) {
      try {
        const result = await updateWalletAdoptionStages(wallet.id);
        console.log(`  📊 ${wallet.address}:`);
        if (result.updates.length > 0) {
          result.updates.forEach(update => {
            console.log(`    ✅ Achieved: ${update.stage} (${update.time_to_achieve_hours}h, ${Math.round(update.conversion_probability * 100)}% confidence)`);
          });
        } else {
          console.log(`    ℹ️  No new stages achieved`);
        }
      } catch (error) {
        console.log(`  ❌ ${wallet.address}: ${error.message}`);
      }
    }
    console.log();

    // Test 4: Get wallet adoption status
    console.log('📋 Test 4: Wallet Adoption Status');
    for (const wallet of testWallets) {
      try {
        const status = await getWalletAdoptionStatus(wallet.id);
        console.log(`  📊 ${wallet.address}:`);
        console.log(`    Current Stage: ${status.current_stage}`);
        console.log(`    Next Stage: ${status.next_stage || 'Complete'}`);
        console.log(`    Progress: ${Math.round(status.progress_percentage)}%`);
        console.log(`    Stages:`);
        status.stages.forEach(stage => {
          const achieved = stage.achieved_at ? '✅' : '⏳';
          const time = stage.time_to_achieve_hours ? ` (${stage.time_to_achieve_hours}h)` : '';
          console.log(`      ${achieved} ${stage.stage_name}${time}`);
        });
        console.log();
      } catch (error) {
        console.log(`  ❌ ${wallet.address}: ${error.message}`);
      }
    }

    // Test 5: Project-level funnel analysis
    if (testWallets.length > 0) {
      const projectId = testWallets[0].project_id;
      console.log(`📊 Test 5: Project Adoption Funnel (Project: ${projectId})`);
      
      try {
        const funnelData = await getProjectAdoptionFunnel(projectId);
        console.log('  Funnel Overview:');
        funnelData.forEach(stage => {
          console.log(`    ${stage.stage_name}: ${stage.achieved_wallets}/${stage.total_wallets} (${stage.conversion_rate}%)`);
          if (stage.avg_time_to_achieve_hours) {
            console.log(`      Avg time: ${Math.round(stage.avg_time_to_achieve_hours)}h`);
          }
        });
        console.log();

        // Test 6: Conversion rates between stages
        console.log('🔄 Test 6: Stage Conversion Rates');
        const conversions = await getAdoptionConversionRates(projectId);
        conversions.forEach(conv => {
          console.log(`    ${conv.from_stage} → ${conv.to_stage}: ${conv.conversion_rate}% (${conv.wallets_dropped} dropped)`);
        });
        console.log();

        // Test 7: Time-to-stage metrics
        console.log('⏱️  Test 7: Time-to-Stage Metrics');
        const timeMetrics = await getTimeToStageMetrics(projectId);
        timeMetrics.forEach(metric => {
          if (metric.achieved_count > 0) {
            console.log(`    ${metric.stage_name}: avg ${Math.round(metric.avg_hours)}h, median ${Math.round(metric.median_hours)}h`);
          }
        });
        console.log();

        // Test 8: Drop-off analysis
        console.log('📉 Test 8: Drop-off Analysis');
        const dropOffs = await identifyDropOffPoints(projectId);
        dropOffs.forEach(dropOff => {
          const severity = dropOff.severity === 'high' ? '🔴' : dropOff.severity === 'medium' ? '🟡' : '🟢';
          console.log(`    ${severity} ${dropOff.stage}: ${dropOff.drop_off_rate}% drop-off (${dropOff.wallets_lost} wallets lost)`);
        });
        console.log();

      } catch (error) {
        console.log(`  ❌ Project analysis failed: ${error.message}`);
      }
    }

    console.log('✅ Adoption Stage Service tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run tests
testAdoptionStageService();