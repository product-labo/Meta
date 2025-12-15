/**
 * Test Privacy Preference Management Service
 * Tests privacy controls and data access enforcement
 */

import PrivacyPreferenceService from './src/services/privacyPreferenceService.js';

// Mock database
class MockDB {
  constructor() {
    this.wallets = new Map();
    this.projects = new Map();
    this.activityMetrics = new Map();
    this.productivityScores = new Map();
    this.auditLogs = [];
  }

  async query(sql, params) {
    // Handle different query types based on SQL content
    if (sql.includes('UPDATE wallets')) {
      return this.updateWallet(params);
    } else if (sql.includes('SELECT') && sql.includes('FROM wallets w') && sql.includes('JOIN projects p')) {
      return this.getWalletWithOwner(params);
    } else if (sql.includes('SELECT') && sql.includes('wallet_activity_metrics wam')) {
      if (sql.includes('w.address')) {
        return this.getFullWalletData(params);
      } else {
        return this.getAggregatedWalletData(params);
      }
    } else if (sql.includes('GROUP BY privacy_mode')) {
      return this.getPrivacyStats(params);
    } else if (sql.includes('WHERE w.privacy_mode = \'monetizable\'')) {
      return this.getMonetizableWallets();
    } else if (sql.includes('CREATE TABLE IF NOT EXISTS wallet_privacy_audit_log')) {
      return { rows: [] };
    } else if (sql.includes('INSERT INTO wallet_privacy_audit_log')) {
      return this.insertAuditLog(params);
    } else if (sql.includes('FROM wallets') && sql.includes('WHERE id')) {
      return this.getWallet(params);
    }

    return { rows: [] };
  }

  updateWallet(params) {
    const [privacyMode, walletId] = params;
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return { rows: [] };
    }

    wallet.privacy_mode = privacyMode;
    wallet.updated_at = new Date();
    
    return { rows: [wallet] };
  }

  getWallet(params) {
    const [walletId] = params;
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return { rows: [] };
    }

    return { rows: [wallet] };
  }

  getWalletWithOwner(params) {
    const [walletId] = params;
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return { rows: [] };
    }

    const project = this.projects.get(wallet.project_id);
    
    return {
      rows: [{
        id: wallet.id,
        privacy_mode: wallet.privacy_mode,
        project_id: wallet.project_id,
        owner_id: project ? project.user_id : null
      }]
    };
  }

  getFullWalletData(params) {
    const [walletId] = params;
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return { rows: [] };
    }

    const metrics = this.activityMetrics.get(walletId) || {};
    const scores = this.productivityScores.get(walletId) || {};

    return {
      rows: [{
        id: wallet.id,
        address: wallet.address,
        type: wallet.type,
        privacy_mode: wallet.privacy_mode,
        active_days: metrics.active_days || 0,
        total_transactions: metrics.total_transactions || 0,
        total_volume: metrics.total_volume || 0,
        avg_productivity_score: scores.total_score || 0
      }]
    };
  }

  getAggregatedWalletData(params) {
    const [walletId] = params;
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return { rows: [] };
    }

    const metrics = this.activityMetrics.get(walletId) || {};
    const scores = this.productivityScores.get(walletId) || {};

    return {
      rows: [{
        type: wallet.type,
        active_days: metrics.active_days || 0,
        total_transactions: metrics.total_transactions || 0,
        avg_productivity_score: scores.total_score || 0,
        avg_retention_score: scores.retention_score || 0,
        avg_adoption_score: scores.adoption_score || 0
      }]
    };
  }

  getPrivacyStats(params) {
    const [projectId] = params;
    const stats = { private: 0, public: 0, monetizable: 0 };

    for (const wallet of this.wallets.values()) {
      if (wallet.project_id === projectId) {
        stats[wallet.privacy_mode] = (stats[wallet.privacy_mode] || 0) + 1;
      }
    }

    return {
      rows: Object.entries(stats).map(([privacy_mode, wallet_count]) => ({
        privacy_mode,
        wallet_count
      }))
    };
  }

  getMonetizableWallets() {
    const results = [];

    for (const [walletId, wallet] of this.wallets.entries()) {
      if (wallet.privacy_mode === 'monetizable') {
        const metrics = this.activityMetrics.get(walletId) || {};
        const scores = this.productivityScores.get(walletId) || {};

        results.push({
          id: wallet.id,
          type: wallet.type,
          active_days: metrics.active_days || 0,
          total_transactions: metrics.total_transactions || 0,
          avg_productivity_score: scores.total_score || 0
        });
      }
    }

    return { rows: results };
  }

  insertAuditLog(params) {
    const [walletId, privacyMode] = params;
    this.auditLogs.push({ walletId, privacyMode, timestamp: new Date() });
    return { rows: [] };
  }

  // Helper methods to set up test data
  addWallet(wallet) {
    this.wallets.set(wallet.id, wallet);
  }

  addProject(project) {
    this.projects.set(project.id, project);
  }

  addActivityMetrics(walletId, metrics) {
    this.activityMetrics.set(walletId, metrics);
  }

  addProductivityScores(walletId, scores) {
    this.productivityScores.set(walletId, scores);
  }
}

// Test suite
async function runTests() {
  console.log('🧪 Testing Privacy Preference Service\n');

  const db = new MockDB();
  const service = new PrivacyPreferenceService(db);

  // Set up test data
  const userId1 = 'user-1';
  const userId2 = 'user-2';
  const projectId1 = 'project-1';
  const walletId1 = 'wallet-1';
  const walletId2 = 'wallet-2';
  const walletId3 = 'wallet-3';

  db.addProject({ id: projectId1, user_id: userId1 });
  
  db.addWallet({
    id: walletId1,
    address: 't1abc123',
    type: 't',
    privacy_mode: 'private',
    project_id: projectId1,
    created_at: new Date(),
    updated_at: new Date()
  });

  db.addWallet({
    id: walletId2,
    address: 'z1def456',
    type: 'z',
    privacy_mode: 'public',
    project_id: projectId1,
    created_at: new Date(),
    updated_at: new Date()
  });

  db.addWallet({
    id: walletId3,
    address: 'u1ghi789',
    type: 'u',
    privacy_mode: 'monetizable',
    project_id: projectId1,
    created_at: new Date(),
    updated_at: new Date()
  });

  db.addActivityMetrics(walletId1, {
    active_days: 15,
    total_transactions: 50,
    total_volume: 1000000
  });

  db.addProductivityScores(walletId1, {
    total_score: 85,
    retention_score: 90,
    adoption_score: 80
  });

  // Test 1: Set privacy preference
  console.log('Test 1: Set privacy preference');
  try {
    const result = await service.setPrivacyPreference(walletId1, 'public');
    console.log('✅ Privacy mode updated:', result.privacy_mode);
    console.log('   Wallet ID:', result.id);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Get privacy preference
  console.log('\nTest 2: Get privacy preference');
  try {
    const result = await service.getPrivacyPreference(walletId1);
    console.log('✅ Privacy mode retrieved:', result.privacy_mode);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Invalid privacy mode
  console.log('\nTest 3: Invalid privacy mode');
  try {
    await service.setPrivacyPreference(walletId1, 'invalid');
    console.log('❌ Should have thrown error');
  } catch (error) {
    console.log('✅ Correctly rejected invalid mode:', error.message);
  }

  // Test 4: Check data access - Owner
  console.log('\nTest 4: Check data access - Owner');
  try {
    const access = await service.checkDataAccess(walletId1, userId1, false);
    console.log('✅ Owner access:', access.allowed, '-', access.reason);
    console.log('   Data level:', access.dataLevel);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 5: Check data access - Private wallet (non-owner)
  console.log('\nTest 5: Check data access - Private wallet (non-owner)');
  try {
    // Reset wallet to private
    await service.setPrivacyPreference(walletId1, 'private');
    const access = await service.checkDataAccess(walletId1, userId2, false);
    console.log('✅ Access denied:', !access.allowed, '-', access.reason);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 6: Check data access - Public wallet
  console.log('\nTest 6: Check data access - Public wallet');
  try {
    const access = await service.checkDataAccess(walletId2, userId2, false);
    console.log('✅ Public access:', access.allowed, '-', access.reason);
    console.log('   Data level:', access.dataLevel);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 7: Check data access - Monetizable without payment
  console.log('\nTest 7: Check data access - Monetizable without payment');
  try {
    const access = await service.checkDataAccess(walletId3, userId2, false);
    console.log('✅ Payment required:', !access.allowed, '-', access.reason);
    console.log('   Requires payment:', access.requiresPayment);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 8: Check data access - Monetizable with payment
  console.log('\nTest 8: Check data access - Monetizable with payment');
  try {
    const access = await service.checkDataAccess(walletId3, userId2, true);
    console.log('✅ Paid access granted:', access.allowed, '-', access.reason);
    console.log('   Data level:', access.dataLevel);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 9: Get full wallet data
  console.log('\nTest 9: Get full wallet data');
  try {
    const data = await service.getWalletData(walletId1, 'full');
    console.log('✅ Full data retrieved');
    console.log('   Address:', data.address);
    console.log('   Active days:', data.active_days);
    console.log('   Total transactions:', data.total_transactions);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 10: Get aggregated wallet data
  console.log('\nTest 10: Get aggregated wallet data');
  try {
    const data = await service.getWalletData(walletId1, 'aggregated');
    console.log('✅ Aggregated data retrieved');
    console.log('   Wallet type:', data.wallet_type);
    console.log('   Active days:', data.behavioral_metrics.active_days);
    console.log('   Note:', data.note);
    console.log('   Address exposed:', data.address ? 'YES (BAD)' : 'NO (GOOD)');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 11: Get project privacy stats
  console.log('\nTest 11: Get project privacy stats');
  try {
    const stats = await service.getProjectPrivacyStats(projectId1);
    console.log('✅ Privacy stats retrieved');
    console.log('   Private:', stats.private);
    console.log('   Public:', stats.public);
    console.log('   Monetizable:', stats.monetizable);
    console.log('   Total:', stats.total);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 12: Get monetizable wallets
  console.log('\nTest 12: Get monetizable wallets');
  try {
    const wallets = await service.getMonetizableWallets();
    console.log('✅ Monetizable wallets retrieved:', wallets.length);
    if (wallets.length > 0) {
      console.log('   First wallet type:', wallets[0].wallet_type);
      console.log('   Productivity score:', wallets[0].metrics_summary.productivity_score);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 13: Batch update project privacy
  console.log('\nTest 13: Batch update project privacy');
  try {
    const results = await service.setProjectPrivacyPreference(projectId1, 'public');
    console.log('✅ Updated', results.length, 'wallets to public');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);
