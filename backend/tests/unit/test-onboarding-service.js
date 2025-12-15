/**
 * Unit Test for Onboarding Service
 * Tests the onboarding service functions directly without HTTP
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { pool } from '../../src/config/appConfig.js';
import {
  completeOnboarding,
  isOnboardingCompleted,
  getOnboardingStatus,
  resetOnboarding
} from '../../src/services/onboardingService.js';

// Test user data
const testUserId = '00000000-0000-0000-0000-000000000001'; // Will be created in test

async function setupTestUser() {
  console.log('Setting up test user...');
  
  // Create a test user
  const result = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, onboarding_completed)
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT (id) DO UPDATE SET onboarding_completed = false
     RETURNING *`,
    [testUserId, 'Test User', 'test-onboarding@example.com', 'hashed_password']
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

async function testOnboardingService() {
  console.log('🧪 Testing Onboarding Service\n');

  try {
    // Setup
    await setupTestUser();

    // Test 1: Check initial onboarding status
    console.log('1️⃣ Testing initial onboarding status...');
    const initialCompleted = await isOnboardingCompleted(testUserId);
    console.log(`   Onboarding completed: ${initialCompleted}`);
    
    if (initialCompleted) {
      console.log('❌ ERROR: Initial onboarding should be false\n');
      throw new Error('Initial onboarding status incorrect');
    }
    console.log('✅ Initial status correct (false)\n');

    // Test 2: Get initial onboarding status details
    console.log('2️⃣ Testing get onboarding status...');
    const initialStatus = await getOnboardingStatus(testUserId);
    console.log(`   User: ${initialStatus.user.name}`);
    console.log(`   Completed: ${initialStatus.onboarding_completed}`);
    console.log(`   Project: ${initialStatus.project ? 'exists' : 'none'}`);
    console.log(`   Wallet: ${initialStatus.wallet ? 'exists' : 'none'}`);
    
    if (initialStatus.onboarding_completed || initialStatus.project || initialStatus.wallet) {
      console.log('❌ ERROR: Initial status should have no project/wallet\n');
      throw new Error('Initial status incorrect');
    }
    console.log('✅ Initial status details correct\n');

    // Test 3: Complete onboarding
    console.log('3️⃣ Testing complete onboarding...');
    const onboardingData = {
      project: {
        name: 'Test DeFi Project',
        description: 'A test project for onboarding',
        category: 'defi',
        website_url: 'https://example.com'
      },
      wallet: {
        address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN',
        privacy_mode: 'private',
        description: 'Primary wallet',
        network: 'mainnet'
      }
    };

    const result = await completeOnboarding(testUserId, onboardingData);
    console.log(`   Success: ${result.success}`);
    console.log(`   Project ID: ${result.project.id}`);
    console.log(`   Project Name: ${result.project.name}`);
    console.log(`   Wallet ID: ${result.wallet.id}`);
    console.log(`   Wallet Address: ${result.wallet.address}`);
    console.log(`   Wallet Type: ${result.wallet.type}`);
    
    if (!result.success || !result.project || !result.wallet) {
      console.log('❌ ERROR: Onboarding completion failed\n');
      throw new Error('Onboarding completion failed');
    }
    console.log('✅ Onboarding completed successfully\n');

    // Test 4: Verify onboarding status after completion
    console.log('4️⃣ Testing onboarding status after completion...');
    const completedStatus = await isOnboardingCompleted(testUserId);
    console.log(`   Onboarding completed: ${completedStatus}`);
    
    if (!completedStatus) {
      console.log('❌ ERROR: Onboarding should be completed\n');
      throw new Error('Onboarding status not updated');
    }
    console.log('✅ Onboarding status updated correctly\n');

    // Test 5: Get status details after completion
    console.log('5️⃣ Testing get status after completion...');
    const finalStatus = await getOnboardingStatus(testUserId);
    console.log(`   Completed: ${finalStatus.onboarding_completed}`);
    console.log(`   Project: ${finalStatus.project?.name}`);
    console.log(`   Wallet: ${finalStatus.wallet?.address}`);
    
    if (!finalStatus.onboarding_completed || !finalStatus.project || !finalStatus.wallet) {
      console.log('❌ ERROR: Final status should have project and wallet\n');
      throw new Error('Final status incorrect');
    }
    console.log('✅ Final status details correct\n');

    // Test 6: Verify transaction atomicity (project and wallet both exist)
    console.log('6️⃣ Testing transaction atomicity...');
    const projectCheck = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [result.project.id]
    );
    const walletCheck = await pool.query(
      'SELECT * FROM wallets WHERE id = $1',
      [result.wallet.id]
    );
    
    console.log(`   Project exists: ${projectCheck.rows.length > 0}`);
    console.log(`   Wallet exists: ${walletCheck.rows.length > 0}`);
    console.log(`   Wallet linked to project: ${walletCheck.rows[0]?.project_id === result.project.id}`);
    
    if (projectCheck.rows.length === 0 || walletCheck.rows.length === 0) {
      console.log('❌ ERROR: Project or wallet not found in database\n');
      throw new Error('Transaction atomicity failed');
    }
    
    if (walletCheck.rows[0].project_id !== result.project.id) {
      console.log('❌ ERROR: Wallet not linked to project\n');
      throw new Error('Wallet-project relationship incorrect');
    }
    console.log('✅ Transaction atomicity verified\n');

    // Test 7: Test validation errors
    console.log('7️⃣ Testing validation errors...');
    
    // Test missing project data
    try {
      await completeOnboarding(testUserId, { wallet: onboardingData.wallet });
      console.log('❌ ERROR: Should have thrown error for missing project\n');
      throw new Error('Validation failed');
    } catch (error) {
      if (error.message.includes('required')) {
        console.log('   ✓ Missing project data validation works');
      } else {
        throw error;
      }
    }
    
    // Test missing wallet data
    try {
      await completeOnboarding(testUserId, { project: onboardingData.project });
      console.log('❌ ERROR: Should have thrown error for missing wallet\n');
      throw new Error('Validation failed');
    } catch (error) {
      if (error.message.includes('required')) {
        console.log('   ✓ Missing wallet data validation works');
      } else {
        throw error;
      }
    }
    
    // Test invalid wallet address
    try {
      await completeOnboarding(testUserId, {
        project: onboardingData.project,
        wallet: { ...onboardingData.wallet, address: 'invalid_address' }
      });
      console.log('❌ ERROR: Should have thrown error for invalid address\n');
      throw new Error('Validation failed');
    } catch (error) {
      if (error.message.includes('Invalid')) {
        console.log('   ✓ Invalid address validation works');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Validation errors working correctly\n');

    // Test 8: Test reset onboarding
    console.log('8️⃣ Testing reset onboarding...');
    await resetOnboarding(testUserId);
    const resetStatus = await isOnboardingCompleted(testUserId);
    console.log(`   Onboarding completed after reset: ${resetStatus}`);
    
    if (resetStatus) {
      console.log('❌ ERROR: Onboarding should be reset to false\n');
      throw new Error('Reset onboarding failed');
    }
    console.log('✅ Reset onboarding working correctly\n');

    console.log('✅ All onboarding service tests passed!\n');
    console.log('📊 Summary:');
    console.log('   ✓ Initial status check');
    console.log('   ✓ Get status details');
    console.log('   ✓ Complete onboarding (atomic transaction)');
    console.log('   ✓ Status verification after completion');
    console.log('   ✓ Get status details after completion');
    console.log('   ✓ Transaction atomicity (project + wallet)');
    console.log('   ✓ Validation error handling');
    console.log('   ✓ Reset onboarding');

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
testOnboardingService()
  .then(() => {
    console.log('\n✅ Test suite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  });
