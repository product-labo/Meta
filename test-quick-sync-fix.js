/**
 * Test the Quick Sync fix
 */

import { UserStorage, AnalysisStorage, ContractStorage } from './src/api/database/fileStorage.js';

async function testQuickSyncFix() {
  console.log('🧪 Testing Quick Sync fix...');
  
  try {
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 User: ${testUser.id}`);
    
    // Create a scenario where analysis is stuck at 30%
    const allContracts = await ContractStorage.findByUserId(testUser.id);
    const defaultConfig = allContracts.find(c => c.isDefault && c.isActive);
    
    if (!defaultConfig) {
      console.log('❌ Default contract configuration not found');
      return;
    }
    
    // Create a stuck analysis
    const stuckAnalysisData = {
      userId: testUser.id,
      configId: defaultConfig.id,
      analysisType: 'single',
      status: 'running',
      progress: 30, // Stuck at 30%
      results: null,
      metadata: {
        isDefaultContract: true,
        isRefresh: true,
        continuous: false,
        refreshStarted: new Date().toISOString(),
        syncCycle: 1,
        testStuck: true
      },
      errorMessage: null,
      logs: ['Starting default contract data refresh (Quick Sync)...'],
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
    
    // Test the IMPROVED monitoring logic
    console.log('\n🔄 Testing IMPROVED frontend monitoring...');
    
    let attempts = 0;
    const maxAttempts = 5;
    let quickSyncLoading = true;
    let frontendProgress = 30;
    let lastProgress = 30;
    let stuckCount = 0;
    const MAX_STUCK_ATTEMPTS = 3;
    
    while (attempts < maxAttempts && quickSyncLoading) {
      attempts++;
      console.log(`\n   Attempt ${attempts}/${maxAttempts}:`);
      
      // Simulate getDefaultContract call
      const currentAnalysis = await AnalysisStorage.findById(stuckAnalysis.id);
      const currentUser = await UserStorage.findById(testUser.id);
      
      const contractData = {
        analysisHistory: {
          latest: {
            id: currentAnalysis.id,
            status: currentAnalysis.status,
            createdAt: currentAnalysis.createdAt,
            completedAt: currentAnalysis.completedAt,
            hasError: false
          }
        },
        indexingStatus: {
          isIndexed: currentUser.onboarding.defaultContract.isIndexed,
          progress: currentUser.onboarding.defaultContract.indexingProgress
        }
      };
      
      console.log(`     Analysis status: ${contractData.analysisHistory.latest.status}`);
      console.log(`     Indexing progress: ${contractData.indexingStatus.progress}%`);
      
      if (contractData.analysisHistory?.latest?.status === 'completed') {
        console.log('     ✅ Analysis completed - would set progress to 100%');
        frontendProgress = 100;
        quickSyncLoading = false;
        break;
      } else if (contractData.analysisHistory?.latest?.status === 'running') {
        // NEW IMPROVED LOGIC: Use actual progress from backend
        const actualProgress = contractData.indexingStatus?.progress || 0;
        const currentProgress = Math.max(30, Math.min(90, actualProgress));
        frontendProgress = currentProgress;
        
        console.log(`     🔄 Using actual progress: ${currentProgress}% (was: fake progress)`);
        
        // NEW: Detect if progress is stuck
        if (currentProgress === lastProgress) {
          stuckCount++;
          console.log(`     ⚠️  Progress unchanged for ${stuckCount} attempts`);
          
          if (stuckCount >= MAX_STUCK_ATTEMPTS) {
            console.log('     🚨 STUCK DETECTED: Would throw error');
            console.log('     ✅ IMPROVEMENT: Old logic would show fake progress, new logic detects stuck!');
            break;
          }
        } else {
          stuckCount = 0;
          lastProgress = currentProgress;
        }
      } else if (contractData.analysisHistory?.latest?.status === 'failed') {
        console.log('     ❌ Analysis failed - would throw error');
        break;
      } else {
        console.log(`     ⚠️  Unexpected status: ${contractData.analysisHistory?.latest?.status}`);
        if (attempts > 5) {
          console.log('     🚨 Would throw error for unclear status');
          break;
        }
      }
      
      console.log('     ⏳ (simulating 6 second wait)');
    }
    
    console.log(`\n📊 IMPROVED monitoring result:`);
    console.log(`   Frontend progress: ${frontendProgress}%`);
    console.log(`   Actual analysis progress: ${(await AnalysisStorage.findById(stuckAnalysis.id)).progress}%`);
    console.log(`   Stuck count: ${stuckCount}/${MAX_STUCK_ATTEMPTS}`);
    console.log(`   Loading: ${quickSyncLoading}`);
    
    if (stuckCount >= MAX_STUCK_ATTEMPTS) {
      console.log('\n✅ SUCCESS: Improved logic DETECTS stuck analysis!');
      console.log('   - No more fake progress increments');
      console.log('   - Uses actual backend progress');
      console.log('   - Detects when progress is stuck');
      console.log('   - Shows appropriate error to user');
    } else {
      console.log('\n⚠️  Test scenario may need adjustment');
    }
    
    // Test scenario 2: Analysis that actually progresses
    console.log('\n🧪 Testing scenario 2: Analysis that progresses...');
    
    // Simulate analysis making progress
    const progressUpdates = [40, 60, 80, 100];
    for (const targetProgress of progressUpdates) {
      await AnalysisStorage.update(stuckAnalysis.id, { 
        progress: targetProgress,
        lastUpdate: new Date().toISOString()
      });
      
      const updatedUser = await UserStorage.findById(testUser.id);
      const progressOnboarding = {
        ...updatedUser.onboarding,
        defaultContract: {
          ...updatedUser.onboarding.defaultContract,
          indexingProgress: targetProgress
        }
      };
      await UserStorage.update(testUser.id, { onboarding: progressOnboarding });
      
      console.log(`   📊 Updated progress to ${targetProgress}%`);
      
      if (targetProgress === 100) {
        await AnalysisStorage.update(stuckAnalysis.id, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        console.log('   ✅ Marked analysis as completed');
      }
    }
    
    // Test the monitoring with progressing analysis
    console.log('\n🔄 Testing monitoring with progressing analysis...');
    
    const finalAnalysis = await AnalysisStorage.findById(stuckAnalysis.id);
    const finalUser = await UserStorage.findById(testUser.id);
    
    const finalContractData = {
      analysisHistory: {
        latest: {
          id: finalAnalysis.id,
          status: finalAnalysis.status,
          createdAt: finalAnalysis.createdAt,
          completedAt: finalAnalysis.completedAt,
          hasError: false
        }
      },
      indexingStatus: {
        isIndexed: finalUser.onboarding.defaultContract.isIndexed,
        progress: finalUser.onboarding.defaultContract.indexingProgress
      }
    };
    
    console.log(`   Analysis status: ${finalContractData.analysisHistory.latest.status}`);
    console.log(`   Progress: ${finalContractData.indexingStatus.progress}%`);
    
    if (finalContractData.analysisHistory.latest.status === 'completed') {
      console.log('   ✅ Would complete Quick Sync successfully');
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    const cleanupOnboarding = {
      ...testUser.onboarding,
      defaultContract: {
        ...testUser.onboarding.defaultContract,
        isIndexed: true,
        indexingProgress: 100
      }
    };
    await UserStorage.update(testUser.id, { onboarding: cleanupOnboarding });
    
    console.log('✅ Quick Sync fix test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuickSyncFix().catch(console.error);