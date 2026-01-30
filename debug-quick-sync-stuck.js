/**
 * Debug Quick Sync Stuck at 30% Issue
 * Checks the current state of user progress and analysis status
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';

async function debugQuickSyncStuck() {
  console.log('🔍 Debugging Quick Sync Stuck at 30% Issue...\n');

  try {
    // Get all users to find the one with stuck progress
    const allUsers = await UserStorage.findAll();
    console.log(`📊 Found ${allUsers.length} total users`);

    // Find users with indexing progress
    const usersWithProgress = allUsers.filter(user => 
      user.onboarding?.defaultContract?.indexingProgress !== undefined
    );

    console.log(`\n👥 Users with indexing progress: ${usersWithProgress.length}`);

    for (const user of usersWithProgress) {
      const contract = user.onboarding.defaultContract;
      console.log(`\n📋 User ${user.id}:`);
      console.log(`   - Progress: ${contract.indexingProgress}%`);
      console.log(`   - Is Indexed: ${contract.isIndexed}`);
      console.log(`   - Last Update: ${contract.lastUpdate}`);
      console.log(`   - Last Analysis ID: ${contract.lastAnalysisId}`);
      console.log(`   - Has Errors: ${contract.hasErrors}`);
      console.log(`   - Last Error: ${contract.lastError || 'None'}`);

      // Check the analysis status
      if (contract.lastAnalysisId) {
        try {
          const analysis = await AnalysisStorage.findById(contract.lastAnalysisId);
          if (analysis) {
            console.log(`   📊 Analysis Status:`);
            console.log(`      - Status: ${analysis.status}`);
            console.log(`      - Progress: ${analysis.progress}%`);
            console.log(`      - Created: ${analysis.createdAt}`);
            console.log(`      - Completed: ${analysis.completedAt || 'Not completed'}`);
            console.log(`      - Has Results: ${!!analysis.results}`);
            console.log(`      - Has Errors: ${analysis.hasErrors || false}`);
            console.log(`      - Error Message: ${analysis.errorMessage || 'None'}`);

            // Check if results have transaction data
            if (analysis.results?.target) {
              const target = analysis.results.target;
              console.log(`   🎯 Target Results:`);
              console.log(`      - Total Transactions: ${target.summary?.totalTransactions || 0}`);
              console.log(`      - Unique Users: ${target.summary?.uniqueUsers || 0}`);
              console.log(`      - Has DeFi Metrics: ${!!target.defiMetrics}`);
              console.log(`      - DeFi Metrics Error: ${target.defiMetrics?.error || 'None'}`);
            }
          } else {
            console.log(`   ❌ Analysis not found: ${contract.lastAnalysisId}`);
          }
        } catch (error) {
          console.log(`   ❌ Error fetching analysis: ${error.message}`);
        }
      }

      // Check for stuck conditions
      if (contract.indexingProgress === 30 && !contract.isIndexed) {
        console.log(`   🚨 STUCK USER DETECTED! Progress stuck at 30%`);
        
        // Check if we should fix this user
        const shouldFix = contract.lastAnalysisId && 
                         contract.lastUpdate && 
                         (Date.now() - new Date(contract.lastUpdate).getTime()) > 5 * 60 * 1000; // 5 minutes old

        if (shouldFix) {
          console.log(`   🔧 Attempting to fix stuck user...`);
          
          try {
            // Check if analysis is actually completed
            const analysis = await AnalysisStorage.findById(contract.lastAnalysisId);
            if (analysis && analysis.status === 'completed') {
              console.log(`   ✅ Analysis is completed, updating user progress to 100%`);
              
              const updatedOnboarding = {
                ...user.onboarding,
                defaultContract: {
                  ...contract,
                  isIndexed: true,
                  indexingProgress: 100,
                  lastUpdate: new Date().toISOString(),
                  hasErrors: analysis.hasErrors || false
                }
              };
              
              await UserStorage.update(user.id, { onboarding: updatedOnboarding });
              console.log(`   ✅ User progress updated to 100%`);
            } else if (analysis && analysis.status === 'failed') {
              console.log(`   ❌ Analysis failed, resetting user progress to 0%`);
              
              const resetOnboarding = {
                ...user.onboarding,
                defaultContract: {
                  ...contract,
                  isIndexed: false,
                  indexingProgress: 0,
                  lastUpdate: new Date().toISOString(),
                  lastError: analysis.errorMessage || 'Analysis failed'
                }
              };
              
              await UserStorage.update(user.id, { onboarding: resetOnboarding });
              console.log(`   ✅ User progress reset to 0% for retry`);
            } else {
              console.log(`   ⏳ Analysis still running or pending, leaving as is`);
            }
          } catch (fixError) {
            console.error(`   ❌ Failed to fix stuck user: ${fixError.message}`);
          }
        } else {
          console.log(`   ⏳ User recently updated, waiting before fixing`);
        }
      }
    }

    // Summary
    const stuckUsers = usersWithProgress.filter(user => 
      user.onboarding.defaultContract.indexingProgress === 30 && 
      !user.onboarding.defaultContract.isIndexed
    );

    console.log(`\n📊 Summary:`);
    console.log(`   - Total users: ${allUsers.length}`);
    console.log(`   - Users with progress: ${usersWithProgress.length}`);
    console.log(`   - Stuck users (30%): ${stuckUsers.length}`);

    if (stuckUsers.length > 0) {
      console.log(`\n🚨 Found ${stuckUsers.length} stuck user(s)!`);
      console.log(`   Run this script again to attempt fixes for users stuck > 5 minutes`);
    } else {
      console.log(`\n✅ No stuck users found`);
    }

    return true;

  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the debug
debugQuickSyncStuck()
  .then(success => {
    if (success) {
      console.log('\n🎉 Debug completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Debug failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });