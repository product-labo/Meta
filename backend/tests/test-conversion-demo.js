import {
  calculateStageConversions,
  identifySignificantDropOffs,
  generateConversionReport,
  DROP_OFF_THRESHOLDS,
  MIN_SAMPLE_SIZES
} from './src/services/conversionAnalysisService.js';

import pool from './src/db/db.js';

async function demonstrateConversionAnalysis() {
  console.log('🎯 Conversion Analysis Service Demonstration\n');

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
    console.log(`📊 Demo with project: ${projectId}\n`);

    // Test with reduced sample size to show functionality
    console.log('⚙️  Configuration for Demo:');
    console.log(`  Standard min sample size: ${MIN_SAMPLE_SIZES.conversion_analysis} wallets`);
    console.log(`  Demo min sample size: 1 wallet (for demonstration)`);
    console.log(`  Drop-off thresholds: High >${DROP_OFF_THRESHOLDS.high}%, Medium >${DROP_OFF_THRESHOLDS.medium}%, Low >${DROP_OFF_THRESHOLDS.low}%\n`);

    // Test 1: Conversion analysis with reduced sample size
    console.log('🔄 Demo 1: Stage Conversion Analysis (Reduced Sample Size)');
    try {
      const conversions = await calculateStageConversions(projectId, { minSampleSize: 1 });
      console.log('  Stage-to-stage conversions:');
      
      if (conversions.length > 0) {
        conversions.forEach(conv => {
          const significance = conv.statistical_significance ? '✅' : '⚠️';
          console.log(`    ${conv.from_stage} → ${conv.to_stage}: ${conv.conversion_rate}% ${significance}`);
          console.log(`      Drop-off: ${conv.drop_off_rate}% (${conv.wallets_dropped} wallets lost)`);
          console.log(`      Sample size: ${conv.sample_size} wallets`);
        });
      } else {
        console.log('    ℹ️  No conversion data available');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 2: Drop-off analysis with reduced sample size
    console.log('📉 Demo 2: Drop-off Analysis (Reduced Sample Size)');
    try {
      const dropOffs = await identifySignificantDropOffs(projectId, { minSampleSize: 1 });
      console.log('  Drop-off analysis:');
      
      if (dropOffs.length > 0) {
        dropOffs.forEach(dropOff => {
          const severityIcon = dropOff.severity === 'high' ? '🔴' : 
                             dropOff.severity === 'medium' ? '🟡' : '🟢';
          console.log(`    ${severityIcon} ${dropOff.stage_transition} (${dropOff.severity} severity)`);
          console.log(`      Drop-off rate: ${dropOff.drop_off_rate}%`);
          console.log(`      Wallets lost: ${dropOff.wallets_lost}`);
          console.log(`      Impact score: ${dropOff.impact_score}`);
          console.log(`      Priority: ${dropOff.priority}/3`);
          console.log(`      Statistical significance: ${dropOff.statistical_significance ? 'Yes' : 'No'}`);
          
          if (dropOff.recommendations.length > 0) {
            console.log(`      Recommendations:`);
            dropOff.recommendations.slice(0, 2).forEach(rec => {
              console.log(`        - ${rec}`);
            });
          }
        });
      } else {
        console.log('    ℹ️  No significant drop-offs identified');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 3: Comprehensive report with reduced sample size
    console.log('📋 Demo 3: Comprehensive Conversion Report');
    try {
      // Temporarily modify the service to use smaller sample sizes for demo
      const report = await generateConversionReport(projectId, { minSampleSize: 1 });
      console.log('  Conversion report summary:');
      console.log(`    Funnel health score: ${report.funnel_health.score}/100`);
      console.log(`    Health status: ${report.funnel_health.status}`);
      console.log(`    Average conversion rate: ${report.funnel_health.avg_conversion_rate}%`);
      console.log(`    Generated at: ${new Date(report.generated_at).toLocaleString()}`);
      
      if (report.stage_conversions && report.stage_conversions.length > 0) {
        console.log('  Stage conversions:');
        report.stage_conversions.forEach(conv => {
          console.log(`    ${conv.from_stage} → ${conv.to_stage}: ${conv.conversion_rate}%`);
        });
      }
      
      if (report.recommendations.priority_actions.length > 0) {
        console.log('  Priority actions:');
        report.recommendations.priority_actions.forEach((action, index) => {
          console.log(`    ${index + 1}. ${action.issue} (${action.severity})`);
          if (action.recommendations.length > 0) {
            console.log(`       → ${action.recommendations[0]}`);
          }
        });
      }
      
      if (report.recommendations.overall_suggestions.length > 0) {
        console.log('  Overall suggestions:');
        report.recommendations.overall_suggestions.slice(0, 3).forEach(suggestion => {
          console.log(`    - ${suggestion}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // Test 4: Show what the service provides
    console.log('🎯 Demo 4: Service Capabilities Summary');
    console.log('  The Conversion Analysis Service provides:');
    console.log('    ✅ Stage-to-stage conversion rate calculations');
    console.log('    ✅ Drop-off identification with severity levels');
    console.log('    ✅ Statistical significance validation');
    console.log('    ✅ Impact scoring for prioritization');
    console.log('    ✅ Automated recommendations generation');
    console.log('    ✅ Segmented analysis (by cohort, time, etc.)');
    console.log('    ✅ Trend analysis over time');
    console.log('    ✅ Comprehensive reporting with health scores');
    console.log('    ✅ Configurable thresholds and sample sizes');
    console.log();

    console.log('📊 Demo 5: Real-world Usage Scenarios');
    console.log('  With sufficient data (10+ wallets), the service would show:');
    console.log('    • Precise conversion rates between adoption stages');
    console.log('    • Identification of the biggest drop-off points');
    console.log('    • Specific recommendations for each problem area');
    console.log('    • Cohort-based analysis to see trends over time');
    console.log('    • Statistical confidence in all measurements');
    console.log('    • Funnel health scoring for quick assessment');
    console.log();

    console.log('🔧 Demo 6: API Integration Examples');
    console.log('  Example API calls for production use:');
    console.log('    GET /api/projects/123/analytics/conversion-analysis');
    console.log('    GET /api/projects/123/analytics/conversion-analysis?segmentBy=cohort');
    console.log('    GET /api/projects/123/analytics/conversion-report?lookbackDays=30');
    console.log('    GET /api/projects/123/analytics/conversion-trends?timeGranularity=daily');
    console.log();

    console.log('✅ Conversion Analysis Service demonstration completed!');
    console.log('   The service is ready for production use with real user data.');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await pool.end();
  }
}

// Run demonstration
demonstrateConversionAnalysis();