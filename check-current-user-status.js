/**
 * Check Current User Status
 * Simple check to see current user progress and identify stuck users
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';

async function checkCurrentUserStatus() {
  console.log('📊 Checking Current User Status...\n');
  
  try {
    const allUsers = await UserStorage.findAll();
    console.log(`Found ${allUsers.length} users\n`);
    
    for (const user of allUsers) {
      if (!user.onboarding?.defaultContract) continue;
      
      const contract = user.onboarding.defaultContract;
      const progress = contract.indexingProgress || 0;
      
      console.log(`👤 User: ${user.email || user.id}`);
      console.log(`   📋 Contract: ${contract.address}`);
      console.log(`   📊 Progress: ${progress}%`);
      console.log(`   ✅ Indexed: ${contract.isIndexed || false}`);
      console.log(`   🔄 Continuous Sync: ${contract.continuousSync || false}`);
      
      if (contract.lastAnalysisId) {
        const analysis = await AnalysisStorage.findById(contract.lastAnalysisId);
        if (analysis) {
          console.log(`   📋 Last Analysis: ${analysis.status} (${analysis.progress || 0}%)`);
          console.log(`   📅 Created: ${analysis.createdAt}`);
          console.log(`   📅 Completed: ${analysis.completedAt || 'Not completed'}`);
          if (analysis.errorMessage) {
            console.log(`   ❌ Error: ${analysis.errorMessage}`);
          }
        }
      }
      
      // Check for running analyses
      const allAnalyses = await AnalysisStorage.findByUserId(user.id);
      const runningAnalyses = allAnalyses.filter(a => 
        a.status === 'running' || a.status === 'pending'
      );
      
      if (runningAnalyses.length > 0) {
        console.log(`   🔄 Running Analyses: ${runningAnalyses.length}`);
        runningAnalyses.forEach(a => {
          console.log(`      - ${a.id}: ${a.status} (${a.progress || 0}%)`);
        });
      }
      
      // Identify stuck users
      if (progress > 0 && progress < 100 && runningAnalyses.length === 0) {
        console.log(`   🚨 STUCK USER: Progress ${progress}% but no running analyses`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking user status:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkCurrentUserStatus().catch(console.error);
}

export { checkCurrentUserStatus };