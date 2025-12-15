import {
  calculateConversionRates,
  calculateStageConversions,
  identifySignificantDropOffs,
  getCohortFunnelAnalysis,
  analyzeConversionTrends,
  generateConversionReport,
  DROP_OFF_THRESHOLDS,
  MIN_SAMPLE_SIZES
} from './src/services/conversionAnalysisService.js';

import pool from './src/db/db.js';

async function testConversionAnalysis() {
  console.log('🧪 Testing Conversion Analysis Service...\n');

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

    // Test 1: Display configuration
    console.log('⚙️  Test 1: Service Configuration');
    console.log('  Drop-off thresholds:');
    Object.entries(DROP_OFF_THRESHOLDS).forEach(([level, threshold]) => {
      console.log(`    ${level}: ${threshold}%`);
    });
    console.log('  Minimum sample sizes:');
    Object.entries(MIN_SAMPLE_SIZES).forEach(([analysis, size]) => {
      console.log(`    ${analysis}: ${size} wallets`);
    });
    console.log();

    // Test 2: Basic conversion rate calculation
    console.log('📈 Test 2: Basic Conversion Rates');
    try {
      const conversionRates = await calculateConversionRates(projectId);
      console.log('  Stage conversion rates:');
      conversionRates.forEach(stage => {
        console.log(`    ${stage.stage_name}: ${stage.achieved_wallets}/${stage.total_wallets} (${stage.conversion_rate}%)`);
        if (stage.avg_time_to_achieve_hours) {
          console.log(`      Avg time: ${Math.round(stage.avg_time_to_achieve_hours)}h`);
        }
      });
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 3: Stage-to-stage conversions
    console.log('🔄 Test 3: Stage-to-Stage Conversions');
    try {
      const stageConversions = await calculateStageConversions(projectId);
      console.log('  Conversion analysis:');
      stageConversions.forEach(conv => {
        const significance = conv.statistical_significance ? '✅' : '⚠️';
        console.log(`    ${conv.from_stage} → ${conv.to_stage}: ${conv.conversion_rate}% ${significance}`);
        console.log(`      Drop-off: ${conv.drop_off_rate}% (${conv.wallets_dropped} wallets lost)`);
        console.log(`      Sample size: ${conv.sample_size}`);
      });
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 4: Drop-off analysis
    console.log('📉 Test 4: Drop-off Analysis');
    try {
      const dropOffs = await identifySignificantDropOffs(projectId);
      console.log('  Significant drop-offs:');
      dropOffs.forEach(dropOff => {
        const severityIcon = dropOff.severity === 'high' ? '🔴' : 
                           dropOff.severity === 'medium' ? '🟡' : '🟢';
        console.log(`    ${severityIcon} ${dropOff.stage_transition}`);
        console.log(`      Drop-off rate: ${dropOff.drop_off_rate}%`);
        console.log(`      Wallets lost: ${dropOff.wallets_lost}`);
        console.log(`      Impact score: ${dropOff.impact_score}`);
        console.log(`      Priority: ${dropOff.priority}/3`);
        
        if (dropOff.recommendations.length > 0) {
          console.log(`      Recommendations:`);
          dropOff.recommendations.slice(0, 2).forEach(rec => {
            console.log(`        - ${rec}`);
          });
        }
      });
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 5: Cohort funnel analysis
    console.log('👥 Test 5: Cohort Funnel Analysis');
    try {
      const cohortAnalysis = await getCohortFunnelAnalysis(projectId);
      console.log('  Cohort-based funnel data:');
      
      const cohortCount = Object.keys(cohortAnalysis).length;
      if (cohortCount > 0) {
        console.log(`    Found ${cohortCount} cohorts with sufficient data`);
        
        // Show first cohort as example
        const firstCohort = Object.keys(cohortAnalysis)[0];
        const cohortData = cohortAnalysis[firstCohort];
        console.log(`    Example cohort (${firstCohort}):`);
        cohortData.forEach(stage => {
          console.log(`      ${stage.stage_name}: ${stage.achieved_wallets}/${stage.total_wallets} (${stage.conversion_rate}%)`);
        });
      } else {
        console.log('    ℹ️  No cohorts with sufficient sample size found');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 6: Conversion trends
    console.log('📊 Test 6: Conversion Trends');
    try {
      const trends = await analyzeConversionTrends(projectId, { lookbackDays: 30 });
      console.log('  Conversion trends over time:');
      
      const trendCount = Object.keys(trends).length;
      if (trendCount > 0) {
        console.log(`    Found ${trendCount} time periods with data`);
        
        // Show most recent period
        const periods = Object.keys(trends).sort().reverse();
        const recentPeriod = periods[0];
        const periodData = trends[recentPeriod];
        console.log(`    Most recent period (${recentPeriod}):`);
        periodData.forEach(stage => {
          console.log(`      ${stage.stage_name}: ${stage.conversion_rate}% (${stage.total_wallets} wallets)`);
        });
      } else {
        console.log('    ℹ️  No trend data with sufficient sample size found');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 7: Comprehensive conversion report
    console.log('📋 Test 7: Comprehensive Conversion Report');
    try {
      const report = await generateConversionReport(projectId);
      console.log('  Conversion report summary:');
      console.log(`    Funnel health score: ${report.funnel_health.score}/100 (${report.funnel_health.status})`);
      console.log(`    Average conversion rate: ${report.funnel_health.avg_conversion_rate}%`);
      
      console.log('  Priority actions:');
      report.recommendations.priority_actions.forEach((action, index) => {
        console.log(`    ${index + 1}. ${action.issue} (${action.severity})`);
        if (action.recommendations.length > 0) {
          console.log(`       → ${action.recommendations[0]}`);
        }
      });
      
      console.log('  Overall suggestions:');
      report.recommendations.overall_suggestions.slice(0, 3).forEach(suggestion => {
        console.log(`    - ${suggestion}`);
      });
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 8: Segmented analysis
    console.log('🔍 Test 8: Segmented Analysis');
    try {
      const segmentedConversions = await calculateStageConversions(projectId, { segmentBy: 'cohort' });
      console.log('  Segmented conversion analysis:');
      
      if (typeof segmentedConversions === 'object' && !Array.isArray(segmentedConversions)) {
        const segmentCount = Object.keys(segmentedConversions).length;
        console.log(`    Found ${segmentCount} segments`);
        
        // Show first segment as example
        const firstSegment = Object.keys(segmentedConversions)[0];
        if (firstSegment && segmentedConversions[firstSegment].length > 0) {
          console.log(`    Example segment (${firstSegment}):`);
          segmentedConversions[firstSegment].forEach(conv => {
            console.log(`      ${conv.from_stage} → ${conv.to_stage}: ${conv.conversion_rate}%`);
          });
        }
      } else {
        console.log('    ℹ️  Segmented analysis returned non-segmented data');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    console.log('✅ Conversion Analysis Service tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run tests
testConversionAnalysis();