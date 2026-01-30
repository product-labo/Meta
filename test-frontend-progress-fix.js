/**
 * Test that the frontend progress issue is fixed
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';

async function testFrontendProgressFix() {
  console.log('🧪 Testing frontend progress fix...');
  
  try {
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 User: ${testUser.id}`);
    
    // Simulate what the frontend API would return
    const allAnalyses = await AnalysisStorage.findByUserId(testUser.id);
    const runningContinuousSync = allAnalyses.find(analysis => 
      (analysis.status === 'running' || analysis.status === 'pending') &&
      analysis.metadata?.isDefaultContract === true &&
      analysis.metadata?.continuous === true
    );
    
    const frontendStatus = {
      completed: testUser.onboarding?.completed || false,
      hasDefaultContract: !!(testUser.onboarding?.defaultContract?.address),
      isIndexed: testUser.onboarding?.defaultContract?.isIndexed || false,
      indexingProgress: testUser.onboarding?.defaultContract?.indexingProgress || 0,
      continuousSync: !!(runningContinuousSync || testUser.onboarding?.defaultContract?.continuousSync),
      continuousSyncActive: !!runningContinuousSync
    };
    
    console.log('📊 Frontend would see:');
    console.log(`   Completed: ${frontendStatus.completed}`);
    console.log(`   Has default contract: ${frontendStatus.hasDefaultContract}`);
    console.log(`   Is indexed: ${frontendStatus.isIndexed}`);
    console.log(`   Indexing progress: ${frontendStatus.indexingProgress}%`);
    console.log(`   Continuous sync: ${frontendStatus.continuousSync}`);
    console.log(`   Continuous sync active: ${frontendStatus.continuousSyncActive}`);
    
    // Check if the issue is fixed
    if (frontendStatus.indexingProgress === 100 && frontendStatus.isIndexed && !frontendStatus.continuousSyncActive) {
      console.log('✅ Frontend progress issue is FIXED!');
      console.log('   - Progress is 100%');
      console.log('   - Contract is indexed');
      console.log('   - No continuous sync running');
    } else if (frontendStatus.indexingProgress < 100 && !frontendStatus.continuousSyncActive) {
      console.log('⚠️  Frontend progress issue PARTIALLY FIXED:');
      console.log(`   - Progress stuck at ${frontendStatus.indexingProgress}%`);
      console.log('   - But no continuous sync is running');
      console.log('   - User can start a new sync');
    } else if (frontendStatus.continuousSyncActive) {
      console.log('🔄 Continuous sync is currently ACTIVE');
      console.log('   - This is normal if sync was just started');
      console.log('   - Progress should be updating');
    } else {
      console.log('❌ Issue may still exist');
    }
    
    // Show recent analyses
    const recentAnalyses = allAnalyses
      .filter(a => a.metadata?.isDefaultContract === true)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
    
    console.log('\n📈 Recent default contract analyses:');
    for (const analysis of recentAnalyses) {
      console.log(`   ${analysis.id}:`);
      console.log(`     Status: ${analysis.status}, Progress: ${analysis.progress}%`);
      console.log(`     Continuous: ${analysis.metadata?.continuous || false}`);
      console.log(`     Created: ${analysis.createdAt}`);
      if (analysis.completedAt) {
        console.log(`     Completed: ${analysis.completedAt}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFrontendProgressFix().catch(console.error);