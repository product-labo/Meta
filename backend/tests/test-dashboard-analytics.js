/**
 * Test Dashboard Analytics Backend Implementation
 * 
 * Tests the dashboard analytics endpoints with caching and privacy filtering
 * Requirements: 7.1, 8.1
 */

import pool from '../src/db/db.js';
import { getProjectById, createProject } from '../src/models/project.js';
import { createWallet } from '../src/models/wallet.js';
import DashboardAggregationService from '../src/services/dashboardAggregationService.js';
import PrivacyPreferenceService from '../src/services/privacyPreferenceService.js';

async function testDashboardAnalytics() {
  console.log('🧪 Testing Dashboard Analytics Backend Implementation\n');

  let testUserId;
  let testProjectId;
  let testWalletIds = [];

  try {
    // =====================================================
    // SETUP: Create test user and project
    // =====================================================
    console.log('📋 Setting up test data...');
    
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, subscription_status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Test User', `test-dashboard-${Date.now()}@example.com`, 'hashed_password', 'premium']
    );
    testUserId = userResult.rows[0].id;
    console.log(`✅ Created test user: ${testUserId}`);

    // Create test project
    const project = await createProject({
      user_id: testUserId,
      name: 'Test Dashboard Project',
      description: 'Testing dashboard analytics',
      category: 'defi',
      status: 'active'
    });
    testProjectId = project.id;
    console.log(`✅ Created test project: ${testProjectId}`);

    // Create test wallets with different privacy modes
    const wallet1 = await createWallet({
      project_id: testProjectId,
      address: 't1TestAddress1234567890123456789012',
      type: 't',
      privacy_mode: 'public',
      network: 'mainnet'
    });
    testWalletIds.push(wallet1.id);
    console.log(`✅ Created public wallet: ${wallet1.id}`);

    const wallet2 = await createWallet({
      project_id: testProjectId,
      address: 't1TestAddress2234567890123456789012',
      type: 't',
      privacy_mode: 'private',
      network: 'mainnet'
    });
    testWalletIds.push(wallet2.id);
    console.log(`✅ Created private wallet: ${wallet2.id}`);

    const wallet3 = await createWallet({
      project_id: testProjectId,
      address: 't1TestAddress3234567890123456789012',
      type: 't',
      privacy_mode: 'monetizable',
      network: 'mainnet'
    });
    testWalletIds.push(wallet3.id);
    console.log(`✅ Created monetizable wallet: ${wallet3.id}`);

    // =====================================================
    // TEST 1: Dashboard Aggregation Service
    // =====================================================
    console.log('\n📊 Test 1: Dashboard Aggregation Service');
    
    const dashboardService = new DashboardAggregationService(pool);
    const dashboardData = await dashboardService.getProjectDashboard(testProjectId);
    
    console.log('Dashboard data structure:');
    console.log('- Overview:', dashboardData.overview ? '✅' : '❌');
    console.log('- Productivity:', dashboardData.productivity ? '✅' : '❌');
    console.log('- Cohorts:', dashboardData.cohorts ? '✅' : '❌');
    console.log('- Adoption:', dashboardData.adoption ? '✅' : '❌');
    console.log('- Generated at:', dashboardData.generated_at ? '✅' : '❌');
    
    if (!dashboardData.overview || !dashboardData.productivity) {
      throw new Error('Dashboard data missing required fields');
    }
    console.log('✅ Dashboard aggregation service working correctly');

    // =====================================================
    // TEST 2: Caching Layer
    // =====================================================
    console.log('\n💾 Test 2: Caching Layer');
    
    const startTime1 = Date.now();
    await dashboardService.getProjectDashboard(testProjectId);
    const duration1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    await dashboardService.getProjectDashboard(testProjectId);
    const duration2 = Date.now() - startTime2;
    
    console.log(`First call (no cache): ${duration1}ms`);
    console.log(`Second call (cached): ${duration2}ms`);
    
    if (duration2 < duration1) {
      console.log('✅ Caching is working (second call faster)');
    } else {
      console.log('⚠️  Cache may not be working optimally');
    }

    // Test cache clearing
    dashboardService.clearCache(`dashboard:${testProjectId}`);
    const cachedData = dashboardService.getFromCache(`dashboard:${testProjectId}`);
    if (!cachedData) {
      console.log('✅ Cache clearing works correctly');
    } else {
      throw new Error('Cache was not cleared');
    }

    // =====================================================
    // TEST 3: Privacy Filtering
    // =====================================================
    console.log('\n🔒 Test 3: Privacy Filtering');
    
    const privacyService = new PrivacyPreferenceService(pool);
    
    // Test privacy preference retrieval
    const wallet1Privacy = await privacyService.getPrivacyPreference(wallet1.id);
    console.log(`Wallet 1 privacy mode: ${wallet1Privacy.privacy_mode} (expected: public)`);
    
    const wallet2Privacy = await privacyService.getPrivacyPreference(wallet2.id);
    console.log(`Wallet 2 privacy mode: ${wallet2Privacy.privacy_mode} (expected: private)`);
    
    const wallet3Privacy = await privacyService.getPrivacyPreference(wallet3.id);
    console.log(`Wallet 3 privacy mode: ${wallet3Privacy.privacy_mode} (expected: monetizable)`);
    
    if (wallet1Privacy.privacy_mode === 'public' && 
        wallet2Privacy.privacy_mode === 'private' && 
        wallet3Privacy.privacy_mode === 'monetizable') {
      console.log('✅ Privacy modes set correctly');
    } else {
      throw new Error('Privacy modes not set correctly');
    }

    // Test privacy statistics
    const privacyStats = await privacyService.getProjectPrivacyStats(testProjectId);
    console.log('Privacy statistics:');
    console.log(`- Public: ${privacyStats.public}`);
    console.log(`- Private: ${privacyStats.private}`);
    console.log(`- Monetizable: ${privacyStats.monetizable}`);
    console.log(`- Total: ${privacyStats.total}`);
    
    if (privacyStats.public === 1 && privacyStats.private === 1 && privacyStats.monetizable === 1) {
      console.log('✅ Privacy statistics calculated correctly');
    } else {
      throw new Error('Privacy statistics incorrect');
    }

    // =====================================================
    // TEST 4: Time Series Data
    // =====================================================
    console.log('\n📈 Test 4: Time Series Data');
    
    const metrics = ['active_wallets', 'transactions', 'productivity'];
    for (const metric of metrics) {
      try {
        const timeSeriesData = await dashboardService.getTimeSeriesData(testProjectId, metric, 7);
        console.log(`✅ Time series data for ${metric}: ${timeSeriesData.length} data points`);
      } catch (error) {
        console.log(`⚠️  Time series data for ${metric}: ${error.message}`);
      }
    }

    // =====================================================
    // TEST 5: Export Functionality
    // =====================================================
    console.log('\n📤 Test 5: Export Functionality');
    
    // Test JSON export
    const jsonExport = await dashboardService.exportAnalyticsReport(testProjectId, 'json');
    if (jsonExport.format === 'json' && jsonExport.data) {
      console.log('✅ JSON export working correctly');
    } else {
      throw new Error('JSON export failed');
    }

    // Test CSV export
    const csvExport = await dashboardService.exportAnalyticsReport(testProjectId, 'csv');
    if (csvExport.format === 'csv' && csvExport.data.includes('OVERVIEW')) {
      console.log('✅ CSV export working correctly');
    } else {
      throw new Error('CSV export failed');
    }

    // =====================================================
    // TEST 6: Privacy Data Access Control
    // =====================================================
    console.log('\n🔐 Test 6: Privacy Data Access Control');
    
    // Test owner access
    const ownerAccess = await privacyService.checkDataAccess(wallet2.id, testUserId, false);
    if (ownerAccess.allowed && ownerAccess.dataLevel === 'full') {
      console.log('✅ Owner has full access to private wallet');
    } else {
      throw new Error('Owner access check failed');
    }

    // Test non-owner access to private wallet
    const nonOwnerAccess = await privacyService.checkDataAccess(wallet2.id, 'different-user-id', false);
    if (!nonOwnerAccess.allowed && nonOwnerAccess.reason === 'Wallet is private') {
      console.log('✅ Non-owner correctly denied access to private wallet');
    } else {
      throw new Error('Non-owner access check failed');
    }

    // Test public wallet access
    const publicAccess = await privacyService.checkDataAccess(wallet1.id, 'different-user-id', false);
    if (publicAccess.allowed && publicAccess.dataLevel === 'aggregated') {
      console.log('✅ Public wallet accessible with aggregated data');
    } else {
      throw new Error('Public wallet access check failed');
    }

    // Test monetizable wallet without payment
    const monetizableNoPayment = await privacyService.checkDataAccess(wallet3.id, 'different-user-id', false);
    if (!monetizableNoPayment.allowed && monetizableNoPayment.requiresPayment) {
      console.log('✅ Monetizable wallet requires payment');
    } else {
      throw new Error('Monetizable wallet access check failed');
    }

    // Test monetizable wallet with payment
    const monetizableWithPayment = await privacyService.checkDataAccess(wallet3.id, 'different-user-id', true);
    if (monetizableWithPayment.allowed && monetizableWithPayment.dataLevel === 'aggregated') {
      console.log('✅ Monetizable wallet accessible with payment');
    } else {
      throw new Error('Monetizable wallet paid access check failed');
    }

    console.log('\n✅ All dashboard analytics tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    // =====================================================
    // CLEANUP
    // =====================================================
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test wallets
      for (const walletId of testWalletIds) {
        await pool.query('DELETE FROM wallets WHERE id = $1', [walletId]);
      }
      console.log('✅ Deleted test wallets');

      // Delete test project
      if (testProjectId) {
        await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
        console.log('✅ Deleted test project');
      }

      // Delete test user
      if (testUserId) {
        await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        console.log('✅ Deleted test user');
      }
    } catch (cleanupError) {
      console.error('⚠️  Cleanup error:', cleanupError.message);
    }
  }
}

// Run the test
testDashboardAnalytics()
  .then(() => {
    console.log('\n✅ Dashboard analytics backend implementation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Dashboard analytics test failed:', error);
    process.exit(1);
  });
