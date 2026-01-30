/**
 * Check analysis status to understand the continuous sync issue
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';

async function checkAnalysisStatus() {
  console.log('🔍 Checking all analysis status...');
  
  try {
    // Get all users
    const allUsers = await UserStorage.findAll();
    console.log(`👥 Found ${allUsers.length} users`);
    
    for (const user of allUsers) {
      console.log(`\n👤 User: ${user.id} (${user.email || 'no email'})`);
      
      if (user.onboarding?.defaultContract) {
        const dc = user.onboarding.defaultContract;
        console.log(`   📋 Default contract: ${dc.address} on ${dc.chain}`);
        console.log(`   📊 Indexed: ${dc.isIndexed}, Progress: ${dc.indexingProgress}%`);
        console.log(`   🔄 Continuous sync: ${dc.continuousSync}`);
        console.log(`   📝 Last analysis ID: ${dc.lastAnalysisId}`);
      }
      
      // Get all analyses for this user
      const userAnalyses = await AnalysisStorage.findByUserId(user.id);
      console.log(`   📊 Total analyses: ${userAnalyses.length}`);
      
      // Show recent analyses
      const recentAnalyses = userAnalyses
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
      
      for (const analysis of recentAnalyses) {
        console.log(`   📈 Analysis ${analysis.id}:`);
        console.log(`      Status: ${analysis.status}, Progress: ${analysis.progress}%`);
        console.log(`      Created: ${analysis.createdAt}`);
        console.log(`      Continuous: ${analysis.metadata?.continuous || false}`);
        console.log(`      Default contract: ${analysis.metadata?.isDefaultContract || false}`);
        console.log(`      Sync cycle: ${analysis.metadata?.syncCycle || 'N/A'}`);
        
        if (analysis.logs && analysis.logs.length > 0) {
          console.log(`      Last log: ${analysis.logs[analysis.logs.length - 1]}`);
        }
        
        // Check if this is a stuck analysis
        if (analysis.status === 'running' && analysis.progress <= 30) {
          console.log(`      ⚠️  STUCK ANALYSIS DETECTED!`);
          
          // Check how long it's been running
          const createdTime = new Date(analysis.createdAt);
          const now = new Date();
          const runningTime = now - createdTime;
          const runningMinutes = Math.floor(runningTime / (1000 * 60));
          
          console.log(`      ⏰ Running for ${runningMinutes} minutes`);
          
          if (runningMinutes > 5) {
            console.log(`      🔧 This analysis has been stuck for too long`);
            
            // Option to fix it
            console.log(`      🔧 Attempting to fix stuck analysis...`);
            
            try {
              await AnalysisStorage.update(analysis.id, {
                status: 'failed',
                errorMessage: 'Analysis stuck at 30% - manually terminated',
                completedAt: new Date().toISOString(),
                logs: [
                  ...(analysis.logs || []),
                  `Analysis stuck at ${analysis.progress}% for ${runningMinutes} minutes - manually terminated`
                ]
              });
              
              console.log(`      ✅ Analysis ${analysis.id} marked as failed`);
              
              // Update user status
              if (analysis.metadata?.isDefaultContract && user.onboarding?.defaultContract) {
                const updatedOnboarding = {
                  ...user.onboarding,
                  defaultContract: {
                    ...user.onboarding.defaultContract,
                    continuousSync: false,
                    indexingProgress: 0,
                    isIndexed: false
                  }
                };
                
                await UserStorage.update(user.id, { onboarding: updatedOnboarding });
                console.log(`      ✅ User continuous sync status reset`);
              }
              
            } catch (fixError) {
              console.error(`      ❌ Failed to fix analysis: ${fixError.message}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkAnalysisStatus().catch(console.error);