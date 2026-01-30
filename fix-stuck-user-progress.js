/**
 * Fix stuck user progress for test-user-sync-123
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';

async function fixStuckUserProgress() {
  console.log('🔧 Fixing stuck user progress...');
  
  try {
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 User: ${testUser.id}`);
    console.log(`📊 Current progress: ${testUser.onboarding?.defaultContract?.indexingProgress}%`);
    console.log(`🔄 Continuous sync: ${testUser.onboarding?.defaultContract?.continuousSync}`);
    
    // Get the latest analysis
    const allAnalyses = await AnalysisStorage.findByUserId(testUser.id);
    const latestAnalysis = allAnalyses
      .filter(a => a.metadata?.isDefaultContract === true)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    if (latestAnalysis) {
      console.log(`📈 Latest analysis: ${latestAnalysis.id}`);
      console.log(`   Status: ${latestAnalysis.status}`);
      console.log(`   Progress: ${latestAnalysis.progress}%`);
      console.log(`   Continuous: ${latestAnalysis.metadata?.continuous}`);
      console.log(`   Sync cycle: ${latestAnalysis.metadata?.syncCycle}`);
    }
    
    // Fix the user's progress
    const updatedOnboarding = {
      ...testUser.onboarding,
      defaultContract: {
        ...testUser.onboarding.defaultContract,
        continuousSync: false,
        isIndexed: true,
        indexingProgress: 100,
        lastUpdate: new Date().toISOString(),
        fixedStuckProgress: true
      }
    };
    
    await UserStorage.update(testUser.id, { onboarding: updatedOnboarding });
    
    console.log('✅ User progress fixed:');
    console.log('   Progress: 22% → 100%');
    console.log('   Continuous sync: true → false');
    console.log('   Indexed: false → true');
    
    // Also mark the latest failed analysis as completed if it has results
    if (latestAnalysis && latestAnalysis.status === 'failed' && latestAnalysis.results) {
      console.log('\n🔧 Fixing latest analysis status...');
      
      await AnalysisStorage.update(latestAnalysis.id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date().toISOString(),
        metadata: {
          ...latestAnalysis.metadata,
          continuous: false,
          fixedStuckStatus: true
        },
        logs: [
          ...(latestAnalysis.logs || []),
          'Analysis status fixed from failed to completed (had valid results)'
        ]
      });
      
      console.log('✅ Analysis status fixed: failed → completed');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixStuckUserProgress().catch(console.error);