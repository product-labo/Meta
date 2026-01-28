#!/usr/bin/env node

/**
 * Fix indexing status for completed analyses
 * This script finds completed analyses and updates user indexing status
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';

async function fixIndexingStatus() {
  console.log('🔧 Fixing indexing status for completed analyses');
  
  try {
    // Get all users
    const users = await UserStorage.findAll();
    console.log(`📋 Found ${users.length} users`);
    
    for (const user of users) {
      if (!user.onboarding?.defaultContract) {
        continue;
      }
      
      const defaultContract = user.onboarding.defaultContract;
      console.log(`\n👤 Checking user ${user.id} (${user.email})`);
      console.log(`   Current status: indexed=${defaultContract.isIndexed}, progress=${defaultContract.indexingProgress}%`);
      console.log(`   Last analysis ID: ${defaultContract.lastAnalysisId || 'None'}`);
      
      // Get all analyses for this user
      const allAnalyses = await AnalysisStorage.findByUserId(user.id);
      const defaultContractAnalyses = allAnalyses.filter(analysis => 
        analysis.metadata?.isDefaultContract === true
      );
      
      console.log(`   Default contract analyses: ${defaultContractAnalyses.length}`);
      
      if (defaultContractAnalyses.length === 0) {
        console.log('   ⚠️  No default contract analyses found');
        continue;
      }
      
      // Find the most recent completed analysis
      const completedAnalyses = defaultContractAnalyses
        .filter(a => a.status === 'completed')
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      
      if (completedAnalyses.length === 0) {
        console.log('   ⚠️  No completed analyses found');
        continue;
      }
      
      const latestCompleted = completedAnalyses[0];
      console.log(`   📊 Latest completed analysis: ${latestCompleted.id} (${latestCompleted.status})`);
      
      // Check if user status needs updating
      const needsUpdate = !defaultContract.isIndexed || 
                         defaultContract.indexingProgress !== 100 || 
                         defaultContract.lastAnalysisId !== latestCompleted.id;
      
      if (needsUpdate) {
        console.log('   🔄 Updating user indexing status...');
        
        const updatedOnboarding = {
          ...user.onboarding,
          defaultContract: {
            ...defaultContract,
            isIndexed: true,
            indexingProgress: 100,
            lastAnalysisId: latestCompleted.id
          }
        };
        
        await UserStorage.update(user.id, { onboarding: updatedOnboarding });
        console.log('   ✅ User indexing status updated');
        
        // Verify the update
        const verifyUser = await UserStorage.findById(user.id);
        const verifyContract = verifyUser.onboarding.defaultContract;
        console.log(`   ✅ Verified: indexed=${verifyContract.isIndexed}, progress=${verifyContract.indexingProgress}%, lastAnalysisId=${verifyContract.lastAnalysisId}`);
        
      } else {
        console.log('   ✅ User indexing status is already correct');
      }
    }
    
    console.log('\n🎉 Indexing status fix completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    return false;
  }
}

fixIndexingStatus()
  .then(success => {
    if (success) {
      console.log('✅ Indexing status fix successful');
      process.exit(0);
    } else {
      console.log('❌ Indexing status fix failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fix execution failed:', error);
    process.exit(1);
  });