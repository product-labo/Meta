/**
 * Test Data Integrity Service
 * Tests validation, duplicate detection, and integrity checks
 */

import DataIntegrityService from './src/services/dataIntegrityService.js';

// Mock database
class MockDB {
  constructor() {
    this.wallets = new Map();
    this.projects = new Map();
    this.activityMetrics = new Map();
    this.productivityScores = new Map();
  }

  async query(sql, params = []) {
    if (sql.includes('SELECT id FROM wallets WHERE address')) {
      const [address, network] = params;
      for (const wallet of this.wallets.values()) {
        if (wallet.address === address && wallet.network === network) {
          return { rows: [{ id: wallet.id }] };
        }
      }
      return { rows: [] };
    }

    if (sql.includes('SELECT id FROM wallet_activity_metrics')) {
      const [walletId, activityDate] = params;
      const key = `${walletId}:${activityDate}`;
      return { rows: this.activityMetrics.has(key) ? [{ id: key }] : [] };
    }

    if (sql.includes('SELECT id, project_id FROM wallets WHERE id')) {
      const [walletId] = params;
      const wallet = this.wallets.get(walletId);
      return { rows: wallet ? [wallet] : [] };
    }

    if (sql.includes('SELECT id FROM projects WHERE id')) {
      const [projectId] = params;
      const project = this.projects.get(projectId);
      return { rows: project ? [{ id: project.id }] : [] };
    }

    if (sql.includes('COUNT(*) as count FROM wallet_activity_metrics')) {
      return { rows: [{ count: 0 }] };
    }

    if (sql.includes('COUNT(*) as count FROM wallet_productivity_scores')) {
      return { rows: [{ count: 0 }] };
    }

    if (sql.includes('COUNT(*) as count FROM wallets WHERE project_id')) {
      const [projectId] = params;
      let count = 0;
      for (const wallet of this.wallets.values()) {
        if (wallet.project_id === projectId) count++;
      }
      return { rows: [{ count }] };
    }

    if (sql.includes('COUNT(DISTINCT wallet_id)')) {
      return { rows: [{ count: this.wallets.size }] };
    }

    if (sql.includes('GROUP BY address, network')) {
      return { rows: [] };
    }

    if (sql.includes('GROUP BY wallet_id, activity_date')) {
      return { rows: [] };
    }

    if (sql.includes('DELETE FROM')) {
      return { rows: [] };
    }

    return { rows: [] };
  }

  // Helper methods
  addWallet(wallet) {
    this.wallets.set(wallet.id, wallet);
  }

  addProject(project) {
    this.projects.set(project.id, project);
  }

  addActivityMetrics(walletId, date) {
    this.activityMetrics.set(`${walletId}:${date}`, true);
  }
}

// Test suite
async function runTests() {
  console.log('🧪 Testing Data Integrity Service\n');

  const db = new MockDB();
  const service = new DataIntegrityService(db);

  // Set up test data
  const projectId = 'project-1';
  const walletId = 'wallet-1';

  db.addProject({ id: projectId, name: 'Test Project' });
  db.addWallet({
    id: walletId,
    address: 't1test123',
    type: 't',
    project_id: projectId,
    network: 'mainnet',
    privacy_mode: 'private'
  });

  // Test 1: Validate valid wallet data
  console.log('Test 1: Validate valid wallet data');
  try {
    const result = service.validateWallet({
      address: 't1test123',
      type: 't',
      project_id: projectId,
      privacy_mode: 'private'
    });
    console.log('✅ Validation result:', result.valid ? 'VALID' : 'INVALID');
    if (!result.valid) {
      console.log('   Errors:', result.errors);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Validate invalid wallet data
  console.log('\nTest 2: Validate invalid wallet data');
  try {
    const result = service.validateWallet({
      address: '',
      type: 'invalid',
      privacy_mode: 'wrong'
    });
    console.log('✅ Validation result:', result.valid ? 'VALID' : 'INVALID');
    console.log('   Errors found:', result.errors.length);
    result.errors.forEach(err => console.log('   -', err));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Validate activity metrics
  console.log('\nTest 3: Validate activity metrics');
  try {
    const validMetrics = service.validateActivityMetrics({
      wallet_id: walletId,
      activity_date: '2024-01-01',
      transaction_count: 10,
      total_volume_zatoshi: 1000000,
      total_fees_paid: 1000,
      transfers_count: 5,
      swaps_count: 3,
      bridges_count: 2
    });
    console.log('✅ Valid metrics:', validMetrics.valid);

    const invalidMetrics = service.validateActivityMetrics({
      wallet_id: walletId,
      activity_date: '2024-01-01',
      transaction_count: 5,
      total_volume_zatoshi: -1000,
      transfers_count: 10 // More than total
    });
    console.log('✅ Invalid metrics detected:', !invalidMetrics.valid);
    console.log('   Errors:', invalidMetrics.errors.length);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 4: Validate productivity scores
  console.log('\nTest 4: Validate productivity scores');
  try {
    const validScore = service.validateProductivityScore({
      wallet_id: walletId,
      total_score: 85,
      retention_score: 90,
      adoption_score: 80,
      activity_score: 85,
      diversity_score: 80,
      status: 'healthy',
      risk_level: 'low'
    });
    console.log('✅ Valid score:', validScore.valid);

    const invalidScore = service.validateProductivityScore({
      wallet_id: walletId,
      total_score: 150, // Out of range
      retention_score: -10, // Negative
      status: 'invalid_status',
      risk_level: 'invalid_level'
    });
    console.log('✅ Invalid score detected:', !invalidScore.valid);
    console.log('   Errors:', invalidScore.errors.length);
    invalidScore.errors.forEach(err => console.log('   -', err));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 5: Check for duplicate wallet
  console.log('\nTest 5: Check for duplicate wallet');
  try {
    const isDuplicate = await service.checkDuplicateWallet('t1test123', 'mainnet');
    console.log('✅ Duplicate check:', isDuplicate ? 'FOUND' : 'NOT FOUND');

    const isNotDuplicate = await service.checkDuplicateWallet('t1newwallet', 'mainnet');
    console.log('✅ New wallet check:', isNotDuplicate ? 'DUPLICATE' : 'UNIQUE');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 6: Check for duplicate activity metrics
  console.log('\nTest 6: Check for duplicate activity metrics');
  try {
    db.addActivityMetrics(walletId, '2024-01-01');
    
    const isDuplicate = await service.checkDuplicateActivityMetrics(walletId, '2024-01-01');
    console.log('✅ Duplicate metrics check:', isDuplicate ? 'FOUND' : 'NOT FOUND');

    const isNotDuplicate = await service.checkDuplicateActivityMetrics(walletId, '2024-01-02');
    console.log('✅ New metrics check:', isNotDuplicate ? 'DUPLICATE' : 'UNIQUE');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 7: Verify wallet integrity
  console.log('\nTest 7: Verify wallet integrity');
  try {
    const integrity = await service.verifyWalletIntegrity(walletId);
    console.log('✅ Wallet integrity:', integrity.valid ? 'VALID' : 'INVALID');
    if (!integrity.valid) {
      console.log('   Issues:', integrity.issues);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 8: Verify project data consistency
  console.log('\nTest 8: Verify project data consistency');
  try {
    const consistency = await service.verifyProjectDataConsistency(projectId);
    console.log('✅ Project consistency:', consistency.valid ? 'VALID' : 'INVALID');
    console.log('   Stats:');
    console.log('     Total wallets:', consistency.stats.total_wallets);
    console.log('     Wallets with metrics:', consistency.stats.wallets_with_metrics);
    if (!consistency.valid) {
      console.log('   Issues:', consistency.issues);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 9: Cleanup orphaned records
  console.log('\nTest 9: Cleanup orphaned records');
  try {
    const cleanup = await service.cleanupOrphanedRecords(projectId);
    console.log('✅ Cleanup completed');
    console.log('   Activity metrics cleaned:', cleanup.cleaned.activity_metrics);
    console.log('   Productivity scores cleaned:', cleanup.cleaned.productivity_scores);
    console.log('   Cohort assignments cleaned:', cleanup.cleaned.cohort_assignments);
    console.log('   Adoption stages cleaned:', cleanup.cleaned.adoption_stages);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 10: Run comprehensive integrity check
  console.log('\nTest 10: Run comprehensive integrity check');
  try {
    const report = await service.runIntegrityCheck(projectId);
    console.log('✅ Integrity check completed');
    console.log('   Overall status:', report.overall_status);
    console.log('   Checks performed:', report.checks.length);
    report.checks.forEach(check => {
      console.log(`   - ${check.name}: ${check.status}`);
    });
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);
