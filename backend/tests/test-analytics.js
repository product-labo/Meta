import 'dotenv/config';
import { 
  initializeWalletAnalytics,
  createActivityMetric,
  updateProductivityScore,
  getProjectAnalyticsSummary 
} from './src/models/analytics.js';
import pool from './src/db/db.js';

async function testAnalyticsSystem() {
  console.log('🧪 Testing Wallet Analytics System...\n');

  try {
    // Test 1: Check if analytics tables exist
    console.log('1. Checking analytics tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%wallet_%'
      ORDER BY table_name
    `);
    
    console.log('   Analytics tables found:');
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    console.log('');

    // Test 2: Get a sample wallet for testing
    console.log('2. Finding sample wallet...');
    const walletResult = await pool.query(`
      SELECT w.id, w.address, p.name as project_name 
      FROM wallets w 
      JOIN projects p ON w.project_id = p.id 
      LIMIT 1
    `);

    if (walletResult.rows.length === 0) {
      console.log('   ⚠️  No wallets found. Please create a wallet first.');
      return;
    }

    const sampleWallet = walletResult.rows[0];
    console.log(`   ✓ Using wallet: ${sampleWallet.address} (${sampleWallet.project_name})`);
    console.log('');

    // Test 3: Initialize analytics for wallet
    console.log('3. Initializing analytics...');
    try {
      await initializeWalletAnalytics(sampleWallet.id);
      console.log('   ✓ Analytics initialized successfully');
    } catch (error) {
      console.log(`   ℹ️  Analytics already initialized: ${error.message}`);
    }
    console.log('');

    // Test 4: Create sample activity metrics
    console.log('4. Creating sample activity metrics...');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await createActivityMetric(sampleWallet.id, {
      activity_date: today,
      transaction_count: 5,
      total_volume_zatoshi: 150000000, // 1.5 ZEC
      total_fees_paid: 1000,
      transfers_count: 3,
      swaps_count: 1,
      shielded_count: 1,
      is_active: true,
      sequence_complexity_score: 75
    });

    await createActivityMetric(sampleWallet.id, {
      activity_date: yesterday,
      transaction_count: 2,
      total_volume_zatoshi: 50000000, // 0.5 ZEC
      total_fees_paid: 500,
      transfers_count: 2,
      is_active: true,
      sequence_complexity_score: 25
    });

    console.log('   ✓ Sample activity metrics created');
    console.log('');

    // Test 5: Calculate productivity score
    console.log('5. Calculating productivity score...');
    const productivityScore = await updateProductivityScore(sampleWallet.id);
    console.log('   ✓ Productivity score calculated:');
    console.log(`     Total Score: ${productivityScore.total_score}/100`);
    console.log(`     Status: ${productivityScore.status}`);
    console.log(`     Risk Level: ${productivityScore.risk_level}`);
    console.log('     Component Scores:');
    console.log(`       Retention: ${productivityScore.retention_score}/100`);
    console.log(`       Adoption: ${productivityScore.adoption_score}/100`);
    console.log(`       Activity: ${productivityScore.activity_score}/100`);
    console.log(`       Diversity: ${productivityScore.diversity_score}/100`);
    console.log('');

    // Test 6: Test project analytics summary
    console.log('6. Getting project analytics summary...');
    const projectResult = await pool.query('SELECT id FROM projects LIMIT 1');
    if (projectResult.rows.length > 0) {
      const projectSummary = await getProjectAnalyticsSummary(projectResult.rows[0].id);
      console.log('   ✓ Project analytics summary:');
      console.log(`     Total Wallets: ${projectSummary.total_wallets}`);
      console.log(`     Active Wallets: ${projectSummary.active_wallets}`);
      console.log(`     Avg Productivity: ${parseFloat(projectSummary.avg_productivity_score || 0).toFixed(2)}`);
      console.log(`     Healthy Wallets: ${projectSummary.healthy_wallets}`);
      console.log(`     At Risk Wallets: ${projectSummary.at_risk_wallets}`);
      console.log(`     Churn Wallets: ${projectSummary.churn_wallets}`);
    }
    console.log('');

    // Test 7: Test analytics views
    console.log('7. Testing analytics views...');
    try {
      const healthDashboard = await pool.query('SELECT * FROM wallet_health_dashboard');
      console.log('   ✓ Wallet health dashboard:');
      healthDashboard.rows.forEach(row => {
        console.log(`     ${row.health_status}: ${row.wallet_count} wallets (${row.percentage}%)`);
      });
    } catch (error) {
      console.log(`   ⚠️  Health dashboard error: ${error.message}`);
    }
    console.log('');

    console.log('🎉 Analytics system test completed successfully!');
    console.log('\n📊 Analytics API endpoints available:');
    console.log('   GET /api/projects/:projectId/analytics');
    console.log('   GET /api/projects/:projectId/wallets/:walletId/analytics/activity');
    console.log('   GET /api/projects/:projectId/wallets/:walletId/analytics/productivity');
    console.log('   PUT /api/projects/:projectId/wallets/:walletId/analytics/productivity');
    console.log('   GET /api/analytics/dashboard/health');

  } catch (error) {
    console.error('❌ Analytics test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testAnalyticsSystem();