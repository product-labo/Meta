/**
 * Simple test to identify Quick Sync stuck at 30% issue
 */

import { UserStorage, AnalysisStorage, ContractStorage } from './src/api/database/fileStorage.js';

async function testQuickSyncSimple() {
  console.log('🔍 Testing Quick Sync stuck at 30% issue...');
  
  try {
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 User: ${testUser.id}`);
    console.log(`📊 Current indexing progress: ${testUser.onboarding?.defaultContract?.indexingProgress}%`);
    
    // Create a scenario where Quick Sync would get stuck
    console.log('\n🧪 Creating scenario where Quick Sync gets stuck...');
    
    // Find the contract configuration
    const allContracts = await ContractStorage.findByUserId(testUser.id);
    const defaultConfig = allContracts.find(c => c.isDefault && c.isActive);
    
    if (!defaultConfig) {
      console.log('❌ Default contract configuration not found');
      return;
    }
    
    // Create a new analysis that will simulate the stuck scenario
    const stuckAnalysisData = {
      userId: testUser.id,
      configId: defaultConfig.id,
      analysisType: 'single',
      status: 'running', // This is the key - it's running but not progressing
      progress: 30, // Stuck at 30%
      results: null,
      metadata: {
        isDefaultContract: true,
        isRefresh: true,
        continuous: false,
        refreshStarted: new Date().toISOString(),
        syncCycle: 1,
        stuckTest: true
      },
      errorMessage: null,
      logs: ['Starting default contract data refresh (Quick Sync)...', 'Analysis appears to be stuck...'],
      completedAt: null
    };

    const stuckAnalysis = await AnalysisStorage.create(stuckAnalysisData);
    console.log(`📝 Created stuck analysis: ${stuckAnalysis.id}`);
    
    // Update user to point to this stuck analysis
    const stuckOnboarding = {
      ...testUser.onboarding,
      defaultContract: {
        ...testUser.onboarding.defaultContract,
        lastAnalysisId: stuckAnalysis.id,
        isIndexed: false,
        indexingProgress: 30, // User progress also stuck at 30%
        continuousSync: false
      }
    };
    await UserStorage.update(testUser.id, { onboarding: stuckOnboarding });
    
    console.log('✅ Created stuck scenario');
    
    // Now simulate what the frontend monitoring would see
    console.log('\n🔄 Simulating frontend monitoring loop...');
    
    let attempts = 0;
    const maxAttempts = 5;
    let quickSyncLoading = true;
    let frontendProgress = 30; // Frontend starts at 30%
    
    while (attempts < maxAttempts && quickSyncLoading) {
      attempts++;
      console.log(`\n   Attempt ${attempts}/${maxAttempts}:`);
      
      // Simulate getDefaultContract call
      const currentAnalysis = await AnalysisStorage.findById(stuckAnalysis.id);
      const contractData = {
        analysisHistory: {
          latest: {
            id: currentAnalysis.id,
            status: currentAnalysis.status,
            createdAt: currentAnalysis.createdAt,
            completedAt: currentAnalysis.completedAt,
            hasError: false
          }
        }
      };
      
      console.log(`     Analysis status: ${contractData.analysisHistory.latest.status}`);
      console.log(`     Analysis progress: ${currentAnalysis.progress}%`);
      
      if (contractData.analysisHistory?.latest?.status === 'completed') {
        console.log('     ✅ Analysis completed - would set progress to 100%');
        frontendProgress = 100;
        quickSyncLoading = false;
        break;
      } else if (contractData.analysisHistory?.latest?.status === 'running') {
        // This is the problematic logic in the frontend
        const newProgress = Math.min(90, 30 + (attempts * 3));
        frontendProgress = newProgress;
        console.log(`     🔄 Analysis running - frontend progress: ${frontendProgress}%`);
        console.log(`     ⚠️  But actual analysis progress is still: ${currentAnalysis.progress}%`);
        
        // The issue: frontend progress increases but analysis progress doesn't
        if (currentAnalysis.progress === 30 && frontendProgress > 30) {
          console.log('     🚨 ISSUE DETECTED: Frontend progress diverges from actual progress!');
        }
      } else if (contractData.analysisHistory?.latest?.status === 'failed') {
        console.log('     ❌ Analysis failed - would throw error');
        break;
      }
      
      // Simulate 6 second wait
      console.log('     ⏳ (simulating 6 second wait)');
    }
    
    console.log(`\n📊 Final result:`);
    console.log(`   Frontend progress: ${frontendProgress}%`);
    console.log(`   Actual analysis progress: ${(await AnalysisStorage.findById(stuckAnalysis.id)).progress}%`);
    console.log(`   Loading: ${quickSyncLoading}`);
    console.log(`   Attempts: ${attempts}/${maxAttempts}`);
    
    if (frontendProgress > 30 && quickSyncLoading) {
      console.log('\n❌ ISSUE CONFIRMED: Quick Sync frontend gets stuck!');
      console.log('   Problem: Frontend shows increasing progress but analysis is actually stuck');
      console.log('   Root cause: Frontend monitoring logic is flawed');
      console.log('\n🔧 SOLUTION NEEDED:');
      console.log('   1. Frontend should check actual analysis progress, not just status');
      console.log('   2. Add timeout detection for stuck analyses');
      console.log('   3. Better error handling for stuck scenarios');
    }
    
    // Clean up the test analysis
    console.log('\n🧹 Cleaning up test analysis...');
    await AnalysisStorage.update(stuckAnalysis.id, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      metadata: {
        ...stuckAnalysisData.metadata,
        cleanedUpTest: true
      }
    });
    
    // Reset user progress
    const resetOnboarding = {
      ...testUser.onboarding,
      defaultContract: {
        ...testUser.onboarding.defaultContract,
        isIndexed: true,
        indexingProgress: 100
      }
    };
    await UserStorage.update(testUser.id, { onboarding: resetOnboarding });
    
    console.log('✅ Test cleanup completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuickSyncSimple().catch(console.error);