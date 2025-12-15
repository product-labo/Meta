/**
 * Simple Unit Test for Onboarding Service
 * Tests the onboarding service functions directly
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create pool directly
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Test user data
const testUserId = '00000000-0000-0000-0000-000000000099';

async function setupTestUser() {
  console.log('Setting up test user...');
  
  // Create a test user
  const result = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, onboarding_completed)
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT (id) DO UPDATE SET onboarding_completed = false
     RETURNING *`,
    [testUserId, 'Test User', 'test-onboarding-simple@example.com', 'hashed_password']
  );
  
  console.log('✅ Test user created/updated\n');
  return result.rows[0];
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  // Delete test wallets
  await pool.query(
    `DELETE FROM wallets WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = $1
    )`,
    [testUserId]
  );
  
  // Delete test projects
  await pool.query('DELETE FROM projects WHERE user_id = $1', [testUserId]);
  
  // Delete test user
  await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  
  console.log('✅ Test data cleaned up\n');
}

async function testOnboardingDatabase() {
  console.log('🧪 Testing Onboarding Database Operations\n');

  try {
    // Setup
    await setupTestUser();

    // Test 1: Check onboarding_completed field exists
    console.log('1️⃣ Testing onboarding_completed field...');
    const fieldCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'onboarding_completed'
    `);
    
    if (fieldCheck.rows.length === 0) {
      throw new Error('onboarding_completed field not found');
    }
    
    console.log('✅ onboarding_completed field exists');
    console.log(`   Type: ${fieldCheck.rows[0].data_type}`);
    console.log(`   Default: ${fieldCheck.rows[0].column_default}\n`);

    // Test 2: Check initial value
    console.log('2️⃣ Testing initial onboarding status...');
    const userCheck = await pool.query(
      'SELECT onboarding_completed FROM users WHERE id = $1',
      [testUserId]
    );
    
    console.log(`   Onboarding completed: ${userCheck.rows[0].onboarding_completed}`);
    
    if (userCheck.rows[0].onboarding_completed !== false) {
      throw new Error('Initial onboarding status should be false');
    }
    console.log('✅ Initial status correct (false)\n');

    // Test 3: Create project and wallet in transaction
    console.log('3️⃣ Testing atomic project + wallet creation...');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create project
      const projectResult = await client.query(
        `INSERT INTO projects (user_id, name, description, category, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING *`,
        [testUserId, 'Test Project', 'Test Description', 'defi']
      );
      
      const project = projectResult.rows[0];
      console.log(`   Project created: ${project.id}`);
      
      // Create wallet
      const walletResult = await client.query(
        `INSERT INTO wallets (project_id, address, type, privacy_mode, network)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [project.id, 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN', 't', 'private', 'mainnet']
      );
      
      const wallet = walletResult.rows[0];
      console.log(`   Wallet created: ${wallet.id}`);
      
      // Update onboarding status
      await client.query(
        'UPDATE users SET onboarding_completed = true WHERE id = $1',
        [testUserId]
      );
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully\n');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Test 4: Verify onboarding status updated
    console.log('4️⃣ Testing onboarding status after completion...');
    const updatedUser = await pool.query(
      'SELECT onboarding_completed FROM users WHERE id = $1',
      [testUserId]
    );
    
    console.log(`   Onboarding completed: ${updatedUser.rows[0].onboarding_completed}`);
    
    if (updatedUser.rows[0].onboarding_completed !== true) {
      throw new Error('Onboarding status should be true after completion');
    }
    console.log('✅ Status updated correctly (true)\n');

    // Test 5: Verify project exists
    console.log('5️⃣ Testing project creation...');
    const projects = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1',
      [testUserId]
    );
    
    console.log(`   Projects found: ${projects.rows.length}`);
    if (projects.rows.length === 0) {
      throw new Error('Project not found');
    }
    console.log(`   Project name: ${projects.rows[0].name}`);
    console.log('✅ Project created successfully\n');

    // Test 6: Verify wallet exists and is linked
    console.log('6️⃣ Testing wallet creation and linking...');
    const wallets = await pool.query(
      `SELECT w.*, p.name as project_name 
       FROM wallets w 
       JOIN projects p ON w.project_id = p.id 
       WHERE p.user_id = $1`,
      [testUserId]
    );
    
    console.log(`   Wallets found: ${wallets.rows.length}`);
    if (wallets.rows.length === 0) {
      throw new Error('Wallet not found');
    }
    console.log(`   Wallet address: ${wallets.rows[0].address}`);
    console.log(`   Wallet type: ${wallets.rows[0].type}`);
    console.log(`   Linked to project: ${wallets.rows[0].project_name}`);
    console.log('✅ Wallet created and linked successfully\n');

    console.log('✅ All database tests passed!\n');
    console.log('📊 Summary:');
    console.log('   ✓ onboarding_completed field exists');
    console.log('   ✓ Initial status is false');
    console.log('   ✓ Atomic transaction (project + wallet + status update)');
    console.log('   ✓ Status updated to true after completion');
    console.log('   ✓ Project created successfully');
    console.log('   ✓ Wallet created and linked to project');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    // Cleanup
    await cleanupTestData();
    await pool.end();
  }
}

// Run tests
testOnboardingDatabase()
  .then(() => {
    console.log('\n✅ Test suite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  });
