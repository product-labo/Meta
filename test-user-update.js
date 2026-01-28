#!/usr/bin/env node

/**
 * Test UserStorage.update with nested objects
 */

import { UserStorage } from './src/api/database/fileStorage.js';

async function testUserUpdate() {
  console.log('🧪 Testing UserStorage.update with nested objects');
  
  try {
    // Create a test user
    const testUser = await UserStorage.create({
      email: 'test-update@example.com',
      name: 'Test Update User',
      onboarding: {
        completed: true,
        defaultContract: {
          address: '0x123',
          isIndexed: false,
          indexingProgress: 0,
          lastAnalysisId: null
        }
      }
    });
    
    console.log('✅ Created test user:', testUser.id);
    console.log('📋 Initial state:', testUser.onboarding.defaultContract);
    
    // Test nested update
    const updatedOnboarding = {
      ...testUser.onboarding,
      defaultContract: {
        ...testUser.onboarding.defaultContract,
        isIndexed: true,
        indexingProgress: 100,
        lastAnalysisId: 'test-analysis-123'
      }
    };
    
    const updatedUser = await UserStorage.update(testUser.id, {
      onboarding: updatedOnboarding
    });
    
    console.log('✅ Updated user');
    console.log('📋 Updated state:', updatedUser.onboarding.defaultContract);
    
    // Verify by reading again
    const verifyUser = await UserStorage.findById(testUser.id);
    console.log('📋 Verified state:', verifyUser.onboarding.defaultContract);
    
    if (verifyUser.onboarding.defaultContract.isIndexed === true &&
        verifyUser.onboarding.defaultContract.indexingProgress === 100 &&
        verifyUser.onboarding.defaultContract.lastAnalysisId === 'test-analysis-123') {
      console.log('🎉 Nested update works correctly!');
      return true;
    } else {
      console.log('❌ Nested update failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testUserUpdate()
  .then(success => {
    if (success) {
      console.log('✅ UserStorage nested update test passed');
      process.exit(0);
    } else {
      console.log('❌ UserStorage nested update test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });