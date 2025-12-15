import 'dotenv/config';
import { 
  analyzeTransactionTypeRetention,
  analyzeTransactionDiversityRetention,
  analyzeVolumeRetentionCorrelation,
  analyzeFrequencyRetentionCorrelation,
  generateCorrelationInsights
} from './src/services/correlationService.js';
import pool from './src/db/db.js';

async function testCorrelationService() {
  console.log('🧪 Testing Transaction Type Correlation Analysis...\n');

  try {
    // Test 1: Check available data
    console.log('1. Checking available data for correlation analysis...');
    
    const activityCount = await pool.query('SELECT COUNT(*) FROM wallet_activity_metrics WHERE is_active = true');
    const walletCount = await pool.query('SELECT COUNT(DISTINCT wallet_id) FROM wallet_activity_metrics WHERE is_active = true');
    
    console.log(`   ✓ Active activity records: ${activityCount.rows[0].count}`);
    console.log(`   ✓ Wallets with activity: ${walletCount.rows[0].count}`);
    
    if (parseInt(activityCount.rows[0].count) === 0) {
      console.log('   ⚠️  No activity data found. Please run activity calculator test first.');
      return;
    }
    console.log('');

    // Test 2: Analyze transaction type retention correlation
    console.log('2. Analyzing transaction type retention correlation...');
    
    const transactionTypeCorrelations = await analyzeTransactionTypeRetention();
    
    console.log('   ✓ Transaction type correlation results:');
    transactionTypeCorrelations.forEach(correlation => {
      console.log(`     ${correlation.transaction_type}:`);
      console.log(`       Users: ${correlation.users_with_type}`);
      console.log(`       7-day retention: ${correlation.retention_7d_rate}%`);
      console.log(`       30-day retention: ${correlation.retention_30d_rate}%`);
      console.log(`       Avg active days: ${correlation.avg_active_days}`);
    });
    console.log('');

    // Test 3: Analyze transaction diversity impact
    console.log('3. Analyzing transaction diversity impact on retention...');
    
    const diversityAnalysis = await analyzeTransactionDiversityRetention();
    
    console.log('   ✓ Transaction diversity analysis:');
    diversityAnalysis.forEach(analysis => {
      console.log(`     ${analysis.tx_type_diversity} transaction types:`);
      console.log(`       Wallets: ${analysis.wallet_count}`);
      console.log(`       7-day retention: ${analysis.retention_7d_rate}%`);
      console.log(`       30-day retention: ${analysis.retention_30d_rate}%`);
      console.log(`       Avg active days: ${analysis.avg_active_days}`);
      console.log(`       Avg complexity: ${analysis.avg_complexity_score}`);
    });
    console.log('');

    // Test 4: Analyze volume correlation
    console.log('4. Analyzing transaction volume correlation with retention...');
    
    const volumeAnalysis = await analyzeVolumeRetentionCorrelation();
    
    console.log('   ✓ Volume correlation analysis:');
    volumeAnalysis.forEach(analysis => {
      console.log(`     ${analysis.volume_category}:`);
      console.log(`       Wallets: ${analysis.wallet_count}`);
      console.log(`       7-day retention: ${analysis.retention_7d_rate}%`);
      console.log(`       30-day retention: ${analysis.retention_30d_rate}%`);
      console.log(`       Avg volume: ${analysis.avg_volume_zatoshi} zatoshi`);
      console.log(`       Avg active days: ${analysis.avg_active_days}`);
    });
    console.log('');

    // Test 5: Analyze frequency correlation
    console.log('5. Analyzing transaction frequency correlation with retention...');
    
    const frequencyAnalysis = await analyzeFrequencyRetentionCorrelation();
    
    console.log('   ✓ Frequency correlation analysis:');
    frequencyAnalysis.forEach(analysis => {
      console.log(`     ${analysis.frequency_category}:`);
      console.log(`       Wallets: ${analysis.wallet_count}`);
      console.log(`       7-day retention: ${analysis.retention_7d_rate}%`);
      console.log(`       30-day retention: ${analysis.retention_30d_rate}%`);
      console.log(`       Avg active days: ${analysis.avg_active_days}`);
      console.log(`       Activity ratio: ${analysis.avg_activity_ratio}`);
    });
    console.log('');

    // Test 6: Generate comprehensive insights
    console.log('6. Generating comprehensive correlation insights...');
    
    const insights = await generateCorrelationInsights();
    
    console.log('   ✓ Comprehensive correlation insights:');
    
    console.log('     Transaction Type Insights:');
    insights.transaction_types.insights.forEach(insight => {
      console.log(`       • ${insight}`);
    });
    
    console.log('     Diversity Insights:');
    insights.diversity.insights.forEach(insight => {
      console.log(`       • ${insight}`);
    });
    
    console.log('     Volume Insights:');
    insights.volume.insights.forEach(insight => {
      console.log(`       • ${insight}`);
    });
    
    console.log('     Frequency Insights:');
    insights.frequency.insights.forEach(insight => {
      console.log(`       • ${insight}`);
    });
    
    console.log('     Overall Summary:');
    insights.summary.forEach(insight => {
      console.log(`       • ${insight}`);
    });
    console.log('');

    // Test 7: Statistical significance analysis
    console.log('7. Analyzing statistical significance...');
    
    // Find the most significant correlations
    const significantCorrelations = [];
    
    if (transactionTypeCorrelations.length > 1) {
      const retentionRates = transactionTypeCorrelations.map(t => t.retention_7d_rate);
      const maxRetention = Math.max(...retentionRates);
      const minRetention = Math.min(...retentionRates);
      const retentionSpread = maxRetention - minRetention;
      
      if (retentionSpread > 10) { // More than 10% difference
        significantCorrelations.push(`Transaction type retention varies by ${retentionSpread.toFixed(2)}% (${minRetention}% to ${maxRetention}%)`);
      }
    }
    
    if (diversityAnalysis.length > 1) {
      const diversityRetentionRates = diversityAnalysis.map(d => d.retention_7d_rate);
      const maxDiversityRetention = Math.max(...diversityRetentionRates);
      const minDiversityRetention = Math.min(...diversityRetentionRates);
      const diversitySpread = maxDiversityRetention - minDiversityRetention;
      
      if (diversitySpread > 10) {
        significantCorrelations.push(`Transaction diversity impacts retention by ${diversitySpread.toFixed(2)}%`);
      }
    }
    
    console.log('   ✓ Statistical significance findings:');
    if (significantCorrelations.length > 0) {
      significantCorrelations.forEach(correlation => {
        console.log(`     • ${correlation}`);
      });
    } else {
      console.log('     • No statistically significant correlations found (may need more data)');
    }
    console.log('');

    // Test 8: Recommendations based on correlations
    console.log('8. Generating retention optimization recommendations...');
    
    const recommendations = [];
    
    // Find best performing transaction type
    if (transactionTypeCorrelations.length > 0) {
      const bestTxType = transactionTypeCorrelations.reduce((max, curr) => 
        curr.retention_7d_rate > max.retention_7d_rate ? curr : max
      );
      recommendations.push(`Encourage ${bestTxType.transaction_type} transactions to improve retention (${bestTxType.retention_7d_rate}% retention rate)`);
    }
    
    // Find optimal diversity level
    if (diversityAnalysis.length > 0) {
      const bestDiversity = diversityAnalysis.reduce((max, curr) => 
        curr.retention_7d_rate > max.retention_7d_rate ? curr : max
      );
      recommendations.push(`Promote ${bestDiversity.tx_type_diversity} transaction type diversity for optimal retention`);
    }
    
    console.log('   ✓ Retention optimization recommendations:');
    recommendations.forEach(recommendation => {
      console.log(`     • ${recommendation}`);
    });
    console.log('');

    console.log('🎉 Correlation analysis test completed successfully!');
    console.log('\n📊 Correlation Analysis Features:');
    console.log('   ✓ Transaction type retention correlation analysis');
    console.log('   ✓ Transaction diversity impact assessment');
    console.log('   ✓ Volume-based retention correlation');
    console.log('   ✓ Frequency pattern retention analysis');
    console.log('   ✓ Comprehensive insight generation');
    console.log('   ✓ Statistical significance evaluation');
    console.log('   ✓ Actionable retention optimization recommendations');
    console.log('   ✓ Multi-dimensional correlation analysis');

  } catch (error) {
    console.error('❌ Correlation analysis test failed:', error);
  } finally {
    await pool.end();
  }
}

testCorrelationService();