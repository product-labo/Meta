/**
 * Test Quick Sync to see why it gets stuck at 30%
 */

import { UserStorage, AnalysisStorage, ContractStorage } from './src/api/database/fileStorage.js';

async function testQuickSyncIssue() {
  console.log('🔍 Testing Quick Sync issue...');
  
  try {
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 User: ${testUser.id}`);
    console.log(`📋 Current progress: ${testUser.onboarding?.defaultContract?.indexingProgress}%`);
    
    // Simulate what happens when Quick Sync is triggered
    console.log('\n🚀 Simulating Quick Sync start...');
    
    // 1. Frontend calls api.onboarding.refreshDefaultContract(false)
    console.log('📞 Step 1: Call refreshDefaultContract(false)');
    
    // Find the contract configuration
    const allContracts = await ContractStorage.findByUserId(testUser.id);
    const defaultConfig = allContracts.find(c => c.isDefault && c.isActive);
    
    if (!defaultConfig) {
      console.log('❌ Default contract configuration not found');
      return;
    }
    
    console.log(`📋 Contract config: ${defaultConfig.name}`);
    
    // 2. Check current analysis status
    const allAnalyses = await AnalysisStorage.findByUserId(testUser.id);
    const runningAnalysis = allAnalyses.find(analysis => 
      (analysis.status === 'running' || analysis.status === 'pending') &&
      analysis.metadata?.isDefaultContract === true
    );
    
    console.log('\n📊 Current analysis status:');
    if (runningAnalysis) {
      console.log(`   Running analysis: ${runningAnalysis.id}`);
      console.log(`   Status: ${runningAnalysis.status}`);
      console.log(`   Progress: ${runningAnalysis.progress}%`);
      console.log(`   Continuous: ${runningAnalysis.metadata?.continuous}`);
      console.log('   ⚠️  Quick Sync would find existing running analysis');
    } else {
      console.log('   No running analysis found');
      console.log('   ✅ Quick Sync would start new analysis');
    }
    
    // 3. Check what getDefaultContract would return
    console.log('\n📋 What getDefaultContract would return:');
    
    const latestAnalysis = allAnalyses
      .filter(a => a.metadata?.isDefaultContract === true)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    if (latestAnalysis) {
      console.log(`   Latest analysis: ${latestAnalysis.id}`);
      console.log(`   Status: ${latestAnalysis.status}`);
      console.log(`   Progress: ${latestAnalysis.progress}%`);
      console.log(`   Created: ${latestAnalysis.createdAt}`);
      console.log(`   Completed: ${latestAnalysis.completedAt || 'Not completed'}`);
      
      const analysisHistory = {
        latest: {
          id: latestAnalysis.id,
          status: latestAnalysis.status,
          createdAt: latestAnalysis.createdAt,
          completedAt: latestAnalysis.completedAt,
          hasError: !!(latestAnalysis.results?.target?.metrics?.error)
        }
      };
      
      console.log('\n🔍 Frontend monitoring would see:');
      console.log(`   analysisHistory.latest.status: ${analysisHistory.latest.status}`);
      
      if (analysisHistory.latest.status === 'completed') {
        console.log('   ✅ Quick Sync should complete immediately');
      } else if (analysisHistory.latest.status === 'running') {
        console.log('   🔄 Quick Sync would show as running');
      } else if (analysisHistory.latest.status === 'failed') {
        console.log('   ❌ Quick Sync would fail');
      } else {
        console.log('   ⚠️  Unexpected status - might cause stuck progress');
      }
    } else {
      console.log('   No analyses found');
    }
    
    // 4. Simulate the monitoring loop issue
    console.log('\n🔄 Simulating monitoring loop...');
    
    let attempts = 0;
    const maxAttempts = 5; // Reduced for testing
    let quickSyncLoading = true;
    let progress = 30; // Initial progress
    
    console.log(`   Initial progress: ${progress}%`);
    
    while (attempts < maxAttempts && quickSyncLoading) {
      attempts++;
      console.log(`   Attempt ${attempts}/${maxAttempts}:`);
      
      // Simulate what the monitoring does
      const contractData = {
        analysisHistory: {
          latest: latestAnalysis ? {
            id: latestAnalysis.id,
            status: latestAnalysis.status,
            createdAt: latestAnalysis.createdAt,
            completedAt: latestAnalysis.completedAt
          } : null
        }
      };
      
      if (contractData.analysisHistory?.latest?.status === 'completed') {
        console.log('     ✅ Analysis completed - should set progress to 100%');
        progress = 100;
        quickSyncLoading = false;
        break;
      } else if (contractData.analysisHistory?.latest?.status === 'running') {
        progress = Math.min(90, 30 + (attempts * 3));
        console.log(`     🔄 Analysis running - progress: ${progress}%`);
      } else if (contractData.analysisHistory?.latest?.status === 'failed') {
        console.log('     ❌ Analysis failed - should throw error');
        break;
      } else {
        console.log(`     ⚠️  Unexpected status: ${contractData.analysisHistory?.latest?.status}`);
        console.log('     🔒 Progress stuck at 30% - THIS IS THE ISSUE!');
      }
      
      // Simulate 6 second wait
      console.log('     ⏳ (simulating 6 second wait)');
    }
    
    console.log(`\n📊 Final result:`);
    console.log(`   Progress: ${progress}%`);
    console.log(`   Loading: ${quickSyncLoading}`);
    console.log(`   Attempts: ${attempts}/${maxAttempts}`);
    
    if (progress === 30 && quickSyncLoading) {
      console.log('\n❌ ISSUE IDENTIFIED: Quick Sync gets stuck at 30%');
      console.log('   Cause: Analysis status is not "running" or "completed"');
      console.log('   Solution: Fix the monitoring logic to handle all statuses');
    } else if (progress === 100) {
      console.log('\n✅ Quick Sync would complete successfully');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuickSyncIssue().catch(console.error);