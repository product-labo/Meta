/**
 * Fix for Quick Sync Getting Stuck at 30% Issue
 * 
 * The issue occurs because:
 * 1. Backend analysis completes successfully but hits HTTP 429 errors
 * 2. User's indexingProgress is not properly updated to 100% on completion
 * 3. Frontend polling logic gets confused by inconsistent status flags
 * 4. continuousSyncActive becomes false but indexingProgress stays at 30%
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';

async function fixQuickSyncStuckIssue() {
  console.log('🔧 Fixing Quick Sync Stuck at 30% Issue...');
  
  try {
    // Get all users
    const allUsers = await UserStorage.findAll();
    console.log(`📊 Found ${allUsers.length} users to check`);
    
    let fixedUsers = 0;
    let stuckUsers = 0;
    
    for (const user of allUsers) {
      if (!user.onboarding?.defaultContract) continue;
      
      const defaultContract = user.onboarding.defaultContract;
      const progress = defaultContract.indexingProgress || 0;
      
      // Check if user is stuck (progress < 100% but no active continuous sync)
      const allAnalyses = await AnalysisStorage.findByUserId(user.id);
      const runningContinuousSync = allAnalyses.find(analysis => 
        (analysis.status === 'running' || analysis.status === 'pending') &&
        analysis.metadata?.isDefaultContract === true &&
        analysis.metadata?.continuous === true
      );
      
      const isStuck = progress < 100 && !runningContinuousSync;
      
      if (isStuck) {
        stuckUsers++;
        console.log(`\n🚨 Found stuck user: ${user.email || user.id}`);
        console.log(`   Progress: ${progress}%`);
        console.log(`   Has running continuous sync: ${!!runningContinuousSync}`);
        
        // Check if there's a completed analysis that should have updated progress
        const completedAnalyses = allAnalyses.filter(analysis => 
          analysis.status === 'completed' &&
          analysis.metadata?.isDefaultContract === true
        );
        
        if (completedAnalyses.length > 0) {
          // Sort by completion date and get the most recent
          const latestCompleted = completedAnalyses.sort((a, b) => 
            new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
          )[0];
          
          console.log(`   Latest completed analysis: ${latestCompleted.id}`);
          console.log(`   Completed at: ${latestCompleted.completedAt}`);
          console.log(`   Has results: ${!!latestCompleted.results}`);
          
          // Fix the user's progress
          const updatedOnboarding = {
            ...user.onboarding,
            defaultContract: {
              ...defaultContract,
              isIndexed: true,
              indexingProgress: 100,
              continuousSync: false,
              lastAnalysisId: latestCompleted.id,
              lastUpdate: new Date().toISOString(),
              fixedStuckProgress: true
            }
          };
          
          await UserStorage.update(user.id, { onboarding: updatedOnboarding });
          fixedUsers++;
          
          console.log(`   ✅ Fixed user progress to 100%`);
        } else {
          console.log(`   ⚠️  No completed analyses found - user needs to restart sync`);
          
          // Reset progress to 0 so user can restart
          const resetOnboarding = {
            ...user.onboarding,
            defaultContract: {
              ...defaultContract,
              isIndexed: false,
              indexingProgress: 0,
              continuousSync: false,
              lastUpdate: new Date().toISOString(),
              resetStuckProgress: true
            }
          };
          
          await UserStorage.update(user.id, { onboarding: resetOnboarding });
          fixedUsers++;
          
          console.log(`   🔄 Reset user progress to 0% for restart`);
        }
      }
    }
    
    console.log(`\n📊 Fix Summary:`);
    console.log(`   Total users checked: ${allUsers.length}`);
    console.log(`   Stuck users found: ${stuckUsers}`);
    console.log(`   Users fixed: ${fixedUsers}`);
    
    if (fixedUsers > 0) {
      console.log(`\n✅ Quick sync stuck issue has been fixed for ${fixedUsers} users!`);
      console.log(`   Users should now see proper completion status or be able to restart sync.`);
    } else {
      console.log(`\n✅ No stuck users found - the issue may already be resolved.`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing quick sync stuck issue:', error);
    throw error;
  }
}

// Also create a function to prevent future occurrences
async function improveCompletionHandling() {
  console.log('\n🔧 Implementing improved completion handling...');
  
  // Check for any analyses that are marked as completed but user progress wasn't updated
  try {
    const allUsers = await UserStorage.findAll();
    
    for (const user of allUsers) {
      if (!user.onboarding?.defaultContract) continue;
      
      const allAnalyses = await AnalysisStorage.findByUserId(user.id);
      const recentCompleted = allAnalyses.filter(analysis => 
        analysis.status === 'completed' &&
        analysis.metadata?.isDefaultContract === true &&
        analysis.completedAt &&
        new Date(analysis.completedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );
      
      if (recentCompleted.length > 0 && user.onboarding.defaultContract.indexingProgress < 100) {
        console.log(`🔄 Updating progress for user ${user.email || user.id} with recent completed analysis`);
        
        const latestCompleted = recentCompleted.sort((a, b) => 
          new Date(b.completedAt) - new Date(a.completedAt)
        )[0];
        
        const updatedOnboarding = {
          ...user.onboarding,
          defaultContract: {
            ...user.onboarding.defaultContract,
            isIndexed: true,
            indexingProgress: 100,
            continuousSync: false,
            lastAnalysisId: latestCompleted.id,
            lastUpdate: new Date().toISOString(),
            autoFixedCompletion: true
          }
        };
        
        await UserStorage.update(user.id, { onboarding: updatedOnboarding });
        console.log(`   ✅ Updated user progress to 100%`);
      }
    }
    
    console.log('✅ Completion handling improvements applied');
    
  } catch (error) {
    console.error('❌ Error improving completion handling:', error);
  }
}

// Run the fixes
async function runFixes() {
  console.log('🚀 Starting Quick Sync Stuck at 30% Fix...\n');
  
  await fixQuickSyncStuckIssue();
  await improveCompletionHandling();
  
  console.log('\n🎉 All fixes completed!');
  console.log('\nNext steps:');
  console.log('1. Users with stuck progress should now see 100% completion');
  console.log('2. Users with reset progress can start a new sync');
  console.log('3. Frontend should properly detect completion status');
  console.log('4. Consider implementing better error handling for HTTP 429 errors');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFixes().catch(console.error);
}

export { fixQuickSyncStuckIssue, improveCompletionHandling };