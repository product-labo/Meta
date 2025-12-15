/**
 * Test Wallet Model Functions
 * Tests wallet model CRUD operations with database
 */

import { createWallet, getAllWalletsByProject, getWalletById, updateWallet, deleteWallet } from '../src/models/wallet.js';
import { createProject } from '../src/models/project.js';
import pool from '../src/db/db.js';

async function runTests() {
  console.log('=== Testing Wallet Model Functions ===\n');

  let testUserId = null;
  let testProjectId = null;
  let testWalletId = null;

  try {
    // 1. Create a test user
    console.log('1. Creating test user...');
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) RETURNING id`,
      [`Wallet Model Test User`, `wallet-model-test-${Date.now()}@example.com`, 'hashedpassword']
    );
    testUserId = userResult.rows[0].id;
    console.log(`   ✓ User created: ${testUserId}\n`);

    // 2. Create a test project
    console.log('2. Creating test project...');
    const project = await createProject({
      user_id: testUserId,
      name: 'Wallet Model Test Project',
      description: 'Project for testing wallet model',
      category: 'defi',
      status: 'active'
    });
    testProjectId = project.id;
    console.log(`   ✓ Project created: ${testProjectId}\n`);

    // 3. Test wallet creation with auto-detected type
    console.log('3. Creating wallet with auto-detected type...');
    const wallet1 = await createWallet({
      project_id: testProjectId,
      address: 't1abc123def456ghi789jkl012mno345pqr',
      network: 'mainnet',
      privacy_mode: 'private',
      description: 'Test transparent wallet'
    });
    testWalletId = wallet1.id;
    console.log(`   ✓ Wallet created: ${wallet1.id}`);
    console.log(`   Type: ${wallet1.type} (auto-detected)`);
    console.log(`   Privacy: ${wallet1.privacy_mode}\n`);

    // 4. Test wallet creation with explicit type
    console.log('4. Creating wallet with explicit type...');
    const wallet2 = await createWallet({
      project_id: testProjectId,
      address: 'zs' + 'a'.repeat(76),
      type: 'z',
      network: 'mainnet',
      privacy_mode: 'public',
      description: 'Test shielded wallet'
    });
    console.log(`   ✓ Wallet created: ${wallet2.id}`);
    console.log(`   Type: ${wallet2.type} (explicit)\n`);

    // 5. Test wallet creation with unified address
    console.log('5. Creating unified address wallet...');
    const wallet3 = await createWallet({
      project_id: testProjectId,
      address: 'u1' + 'a'.repeat(100),
      network: 'mainnet',
      privacy_mode: 'monetizable',
      description: 'Test unified wallet'
    });
    console.log(`   ✓ Wallet created: ${wallet3.id}`);
    console.log(`   Type: ${wallet3.type}\n`);

    // 6. Test invalid address rejection
    console.log('6. Testing invalid address rejection...');
    try {
      await createWallet({
        project_id: testProjectId,
        address: 'invalid-address',
        network: 'mainnet'
      });
      console.log('   ✗ FAILED: Invalid address was accepted\n');
    } catch (error) {
      console.log(`   ✓ Invalid address rejected: ${error.message}\n`);
    }

    // 7. Test type mismatch detection
    console.log('7. Testing type mismatch detection...');
    try {
      await createWallet({
        project_id: testProjectId,
        address: 't1abc123def456ghi789jkl012mno345pqr',
        type: 'z', // Wrong type for t-address
        network: 'mainnet'
      });
      console.log('   ✗ FAILED: Type mismatch was not detected\n');
    } catch (error) {
      console.log(`   ✓ Type mismatch detected: ${error.message}\n`);
    }

    // 8. Get all wallets for project
    console.log('8. Fetching all wallets for project...');
    const wallets = await getAllWalletsByProject(testProjectId);
    console.log(`   ✓ Retrieved ${wallets.length} wallets`);
    wallets.forEach(w => {
      console.log(`     - ${w.type}-address: ${w.address.substring(0, 30)}...`);
    });
    console.log('');

    // 9. Get single wallet
    console.log('9. Fetching single wallet...');
    const singleWallet = await getWalletById(testWalletId, testProjectId);
    console.log(`   ✓ Retrieved wallet: ${singleWallet.id}`);
    console.log(`   Address: ${singleWallet.address.substring(0, 30)}...`);
    console.log(`   Type: ${singleWallet.type}\n`);

    // 10. Update wallet
    console.log('10. Updating wallet privacy mode...');
    const updatedWallet = await updateWallet(testWalletId, testProjectId, {
      privacy_mode: 'public',
      description: 'Updated description'
    });
    console.log(`   ✓ Wallet updated`);
    console.log(`   New privacy mode: ${updatedWallet.privacy_mode}`);
    console.log(`   New description: ${updatedWallet.description}\n`);

    // 11. Delete wallet
    console.log('11. Deleting wallet...');
    const deletedWallet = await deleteWallet(testWalletId, testProjectId);
    console.log(`   ✓ Wallet deleted: ${deletedWallet.id}\n`);

    // 12. Verify deletion
    console.log('12. Verifying wallet deletion...');
    const remainingWallets = await getAllWalletsByProject(testProjectId);
    console.log(`   ✓ ${remainingWallets.length} wallets remaining\n`);

    console.log('=== All Tests Passed! ===\n');

  } catch (error) {
    console.error('\n✗ Test failed:');
    console.error(`   ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('Cleaning up test data...');
    if (testProjectId) {
      await pool.query('DELETE FROM wallets WHERE project_id = $1', [testProjectId]);
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId]);
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    console.log('✓ Cleanup complete\n');
    
    await pool.end();
    process.exit(0);
  }
}

// Run tests
runTests();
