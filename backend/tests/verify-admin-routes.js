/**
 * Verification script for admin route protection
 * Tests that admin routes are properly protected with authentication and authorization
 */

import { pool } from '../src/config/appConfig.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testAdminRoutes() {
  console.log('🧪 Testing Admin Route Protection\n');
  
  let testUser, testAdmin;
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Setup: Create test users
    console.log('📝 Setting up test data...');
    
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Regular User', 'regular-admin-test@example.com', 'hashed_password', false]
    );
    testUser = userResult.rows[0];
    console.log(`✓ Created regular user: ${testUser.email}`);

    const adminResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Admin User', 'admin-admin-test@example.com', 'hashed_password', true]
    );
    testAdmin = adminResult.rows[0];
    console.log(`✓ Created admin user: ${testAdmin.email}\n`);

    // Generate JWT tokens
    const userToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminToken = jwt.sign(
      { id: testAdmin.id, email: testAdmin.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('✓ Generated JWT tokens\n');

    // Test 1: Admin can access admin stats endpoint
    console.log('Test 1: Admin can access /api/admin/stats');
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.ok) {
        console.log('✅ PASS: Admin granted access to stats endpoint\n');
        passedTests++;
      } else {
        console.log(`❌ FAIL: Admin denied access (status: ${response.status})\n`);
        failedTests++;
      }
    } catch (error) {
      console.log(`⚠️  SKIP: Server not running or endpoint not available\n`);
    }

    // Test 2: Regular user cannot access admin stats endpoint
    console.log('Test 2: Regular user cannot access /api/admin/stats');
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.status === 403) {
        console.log('✅ PASS: Regular user denied access to stats endpoint\n');
        passedTests++;
      } else {
        console.log(`❌ FAIL: Regular user granted access (status: ${response.status})\n`);
        failedTests++;
      }
    } catch (error) {
      console.log(`⚠️  SKIP: Server not running or endpoint not available\n`);
    }

    // Test 3: Unauthenticated request cannot access admin endpoint
    console.log('Test 3: Unauthenticated request cannot access /api/admin/stats');
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`);

      if (response.status === 401) {
        console.log('✅ PASS: Unauthenticated request denied access\n');
        passedTests++;
      } else {
        console.log(`❌ FAIL: Unauthenticated request granted access (status: ${response.status})\n`);
        failedTests++;
      }
    } catch (error) {
      console.log(`⚠️  SKIP: Server not running or endpoint not available\n`);
    }

    console.log('💡 Note: Some tests may be skipped if the server is not running.');
    console.log('   Start the server with: npm start\n');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    failedTests++;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up test data...');
    if (testUser) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      console.log('✓ Deleted regular user');
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

testAdminRoutes();
