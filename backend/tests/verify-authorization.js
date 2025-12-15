/**
 * Verification script for authorization middleware
 * Tests the core functionality of ownership and admin checks
 */

import { pool } from '../src/config/appConfig.js';
import {
  requireOwnership,
  requireAdmin,
  requireAccess,
  requireSelfOrAdmin
} from '../src/middleware/authorization.js';

async function runTests() {
  console.log('🧪 Testing Authorization Middleware\n');
  
  let testUser, testAdmin, testProject, testWallet;
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Setup: Create test data
    console.log('📝 Setting up test data...');
    
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Test User', 'test-auth@example.com', 'hashed_password', false]
    );
    testUser = userResult.rows[0];
    console.log(`✓ Created test user: ${testUser.email}`);

    const adminResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Admin User', 'admin-auth@example.com', 'hashed_password', true]
    );
    testAdmin = adminResult.rows[0];
    console.log(`✓ Created admin user: ${testAdmin.email}`);

    const projectResult = await pool.query(
      'INSERT INTO projects (user_id, name, category) VALUES ($1, $2, $3) RETURNING *',
      [testUser.id, 'Test Project', 'defi']
    );
    testProject = projectResult.rows[0];
    console.log(`✓ Created test project: ${testProject.name}`);

    // Skip wallet creation if table doesn't exist
    try {
      const walletResult = await pool.query(
        'INSERT INTO wallets (project_id, address, type, network) VALUES ($1, $2, $3, $4) RETURNING *',
        [testProject.id, 't1TestAuthAddress123', 't', 'testnet']
      );
      testWallet = walletResult.rows[0];
      console.log(`✓ Created test wallet: ${testWallet.address}\n`);
    } catch (error) {
      console.log(`⚠️  Skipping wallet tests (table doesn't exist)\n`);
    }

    // Test 1: requireOwnership - Owner can access their project
    console.log('Test 1: Owner can access their own project');
    try {
      const req = {
        user: { id: testUser.id },
        params: { id: testProject.id }
      };
      const res = {};
      let nextCalled = false;
      let errorPassed = null;
      const next = (err) => {
        nextCalled = true;
        errorPassed = err;
      };

      const middleware = requireOwnership('project');
      await middleware(req, res, next);

      if (nextCalled && !errorPassed) {
        console.log('✅ PASS: Owner granted access to their project\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Owner denied access to their project\n');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
      failedTests++;
    }

    // Test 2: requireOwnership - Non-owner cannot access project
    console.log('Test 2: Non-owner cannot access project');
    try {
      const req = {
        user: { id: testAdmin.id },
        params: { id: testProject.id }
      };
      const res = {};
      let errorPassed = null;
      const next = (err) => {
        errorPassed = err;
      };

      const middleware = requireOwnership('project');
      await middleware(req, res, next);

      if (errorPassed && errorPassed.statusCode === 403) {
        console.log('✅ PASS: Non-owner denied access to project\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Non-owner granted access to project\n');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
      failedTests++;
    }

    // Test 3: requireAdmin - Admin can access admin endpoints
    console.log('Test 3: Admin can access admin endpoints');
    try {
      const req = {
        user: { id: testAdmin.id }
      };
      const res = {};
      let nextCalled = false;
      let errorPassed = null;
      const next = (err) => {
        nextCalled = true;
        errorPassed = err;
      };

      await requireAdmin(req, res, next);

      if (nextCalled && !errorPassed) {
        console.log('✅ PASS: Admin granted access to admin endpoints\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Admin denied access to admin endpoints\n');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
      failedTests++;
    }

    // Test 4: requireAdmin - Non-admin cannot access admin endpoints
    console.log('Test 4: Non-admin cannot access admin endpoints');
    try {
      const req = {
        user: { id: testUser.id }
      };
      const res = {};
      let errorPassed = null;
      const next = (err) => {
        errorPassed = err;
      };

      await requireAdmin(req, res, next);

      if (errorPassed && errorPassed.statusCode === 403) {
        console.log('✅ PASS: Non-admin denied access to admin endpoints\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Non-admin granted access to admin endpoints\n');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
      failedTests++;
    }

    // Test 5: requireAccess - Admin can access any resource
    console.log('Test 5: Admin can access any resource via requireAccess');
    try {
      const req = {
        user: { id: testAdmin.id },
        params: { id: testProject.id }
      };
      const res = {};
      let nextCalled = false;
      let errorPassed = null;
      const next = (err) => {
        nextCalled = true;
        errorPassed = err;
      };

      const middleware = requireAccess('project');
      await middleware(req, res, next);

      if (nextCalled && !errorPassed && req.isAdmin) {
        console.log('✅ PASS: Admin granted access to any resource\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Admin denied access or isAdmin flag not set\n');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
      failedTests++;
    }

    // Test 6: requireSelfOrAdmin - User can access their own data
    console.log('Test 6: User can access their own data');
    try {
      const req = {
        user: { id: testUser.id },
        params: { userId: testUser.id }
      };
      const res = {};
      let nextCalled = false;
      let errorPassed = null;
      const next = (err) => {
        nextCalled = true;
        errorPassed = err;
      };

      const middleware = requireSelfOrAdmin('params', 'userId');
      await middleware(req, res, next);

      if (nextCalled && !errorPassed) {
        console.log('✅ PASS: User granted access to their own data\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: User denied access to their own data\n');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
      failedTests++;
    }

    // Test 7: requireSelfOrAdmin - User cannot access other user's data
    console.log('Test 7: User cannot access other user\'s data');
    try {
      const req = {
        user: { id: testUser.id },
        params: { userId: testAdmin.id }
      };
      const res = {};
      let errorPassed = null;
      const next = (err) => {
        errorPassed = err;
      };

      const middleware = requireSelfOrAdmin('params', 'userId');
      await middleware(req, res, next);

      if (errorPassed && errorPassed.statusCode === 403) {
        console.log('✅ PASS: User denied access to other user\'s data\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: User granted access to other user\'s data\n');
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}\n`);
      failedTests++;
    }

    // Test 8: Wallet ownership through project (only if wallet exists)
    if (testWallet) {
      console.log('Test 8: Owner can access wallet through project ownership');
      try {
        const req = {
          user: { id: testUser.id },
          params: { walletId: testWallet.id }
        };
        const res = {};
        let nextCalled = false;
        let errorPassed = null;
        const next = (err) => {
          nextCalled = true;
          errorPassed = err;
        };

        const middleware = requireOwnership('wallet', 'walletId');
        await middleware(req, res, next);

        if (nextCalled && !errorPassed) {
          console.log('✅ PASS: Owner granted access to wallet through project\n');
          passedTests++;
        } else {
          console.log('❌ FAIL: Owner denied access to wallet\n');
          failedTests++;
        }
      } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failedTests++;
      }
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    failedTests++;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up test data...');
    if (testWallet) {
      await pool.query('DELETE FROM wallets WHERE id = $1', [testWallet.id]);
      console.log('✓ Deleted test wallet');
    }
    if (testProject) {
      await pool.query('DELETE FROM projects WHERE id = $1', [testProject.id]);
      console.log('✓ Deleted test project');
    }
    if (testUser) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      console.log('✓ Deleted test user');
    }
    if (testAdmin) {
      await pool.query('DELETE FROM users WHERE id = $1', [testAdmin.id]);
      console.log('✓ Deleted admin user');
    }

    await pool.end();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Total: ${passedTests + failedTests}`);
    console.log('='.repeat(50));

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed');
      process.exit(1);
    }
  }
}

runTests();
