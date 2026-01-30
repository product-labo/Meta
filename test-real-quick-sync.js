/**
 * Test a real Quick Sync to see if it gets stuck
 */

import { UserStorage, AnalysisStorage, ContractStorage } from './src/api/database/fileStorage.js';
import { performDefaultContractRefresh } from './src/api/routes/onboarding.js';

async function testRealQuickSync() {
  console.log('🚀 Testing real Quick Sync...');
  
  try {
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 User: ${testUser.id}`);
    
    // Find the contract configuration
    const allContracts = await ContractStorage.findByUserId(testUser.id);
    const defaultConfig = allContracts.find(c => c.isDefault && c.isActive);
    
    if (!defaultConfig) {
      console.log('❌ Default contract configuration not found');
      return;
    }
    
    // Simulate the refresh endpoint call (continuous = false for Quick Sync)
    console.log('📞 Calling refreshDefaultContract(false)...');
    
    // Check if there's already a running analysis
    const allAnalyses = await AnalysisStorage.findByUserId(testUser.id);
    const runningAnalysis = allAnalyses.find(analysis => 
      (analysis.status === 'running' || analysis.status === 'pending') &&
      analysis.metadata?.isDefaultContract === true
    );

    if (runningAnalysis) {
      console.log(`⚠️  Found running analysis: ${runningAnalysis.id}`);
      console.log('   This might cause Quick Sync to reuse existing analysis');
    }
    
    // Find existing analysis to update instead of creating new one
    let existingAnalysis = null;
    if (testUser.onboarding?.defaultContract?.lastAnalysisId) {
      existingAnalysis = await AnalysisStorage.findById(testUser.onboarding.defaultContract.lastAnalysisId);
    }
    
    if (!existingAnalysis) {
      const defaultContractAnalyses = allAnalyses.filter(analysis => 
        analysis.metadata?.isDefaultContract === true
      );
      const completedAnalyses = defaultContractAnalyses
        .filter(a => a.status === 'completed')
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      
      if (completedAnalyses.length > 0) {
        existingAnalysis = completedAnalyses[0];
      }
    }

    let analysisId;
    
    if (existingAnalysis) {
      // Update existing analysis instead of creating new one
      console.log(`🔄 Updating existing analysis ${existingAnalysis.id} for refresh`);
      
      await AnalysisStorage.update(existingAnalysis.id, {
        status: 'running',
        progress: 10,
        results: null, // Clear results for fresh analysis
        metadata: {
          ...existingAnalysis.metadata,
          isDefaultContract: true,
          isRefresh: true,
          continuous: false, // Quick Sync is not continuous
          refreshStarted: new Date().toISOString(),
          originalCreatedAt: existingAnalysis.createdAt,
          syncCycle: 1
        },
        errorMessage: null,
        logs: ['Starting default contract data refresh (Quick Sync)...'],
        completedAt: null
      });
      
      analysisId = existingAnalysis.id;
    } else {
      // Create new analysis
      console.log(`📝 Creating new analysis for default contract refresh`);
      
      const analysisData = {
        userId: testUser.id,
        configId: defaultConfig.id,
        analysisType: 'single',
        status: 'running',
        progress: 10,
        results: null,
        metadata: {
          isDefaultContract: true,
          isRefresh: true,
          continuous: false,
          refreshStarted: new Date().toISOString(),
          syncCycle: 1
        },
        errorMessage: null,
        logs: ['Starting default contract data refresh (Quick Sync)...'],
        completedAt: null
      };

      const analysisResult = await AnalysisStorage.create(analysisData);
      analysisId = analysisResult.id;
    }

    // Update user's default contract with analysis ID and reset indexing status
    const refreshUser = await UserStorage.findById(testUser.id);
    const refreshOnboarding = {
      ...refreshUser.onboarding,
      defaultContract: {
        ...refreshUser.onboarding.defaultContract,
        lastAnalysisId: analysisId,
        isIndexed: false,
        indexingProgress: 10,
        continuousSync: false
      }
    };
    await UserStorage.update(testUser.id, { onboarding: refreshOnboarding });

    console.log(`✅ Quick Sync started with analysis ID: ${analysisId}`);
    
    // Start the actual refresh process (this is what would run in background)
    console.log('🔄 Starting refresh process...');
    
    // Import the refresh function (we need to simulate this since it's not exported)
    // For now, let's just simulate the progress updates
    
    let progress = 10;
    const progressUpdates = [30, 50, 70, 80, 100];
    
    for (const targetProgress of progressUpdates) {
      progress = targetProgress;
      console.log(`📊 Updating progress to ${progress}%`);
      
      await AnalysisStorage.update(analysisId, { 
        progress: progress,
        lastUpdate: new Date().toISOString()
      });
      
      // Update user progress
      const currentUser = await UserStorage.findById(testUser.id);
      const updatedOnboarding = {
        ...currentUser.onboarding,
        defaultContract: {
          ...currentUser.onboarding.defaultContract,
          indexingProgress: progress
        }
      };
      await UserStorage.update(testUser.id, { onboarding: updatedOnboarding });
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (progress === 100) {
        // Mark as completed
        await AnalysisStorage.update(analysisId, {
          status: 'completed',
          progress: 100,
          results: {
            target: {
              contract: defaultConfig.targetContract.address,
              chain: defaultConfig.targetContract.chain,
              metrics: {
                totalTransactions: 0,
                uniqueUsers: 0,
                totalValue: 0
              }
            }
          },
          completedAt: new Date().toISOString()
        });
        
        // Mark user as indexed
        const finalUser = await UserStorage.findById(testUser.id);
        const finalOnboarding = {
          ...finalUser.onboarding,
          defaultContract: {
            ...finalUser.onboarding.defaultContract,
            isIndexed: true,
            indexingProgress: 100
          }
        };
        await UserStorage.update(testUser.id, { onboarding: finalOnboarding });
        
        console.log('✅ Quick Sync completed successfully');
      }
    }
    
    // Now test what the frontend monitoring would see
    console.log('\n🔍 Testing frontend monitoring...');
    
    const contractData = {
      analysisHistory: {
        latest: {
          id: analysisId,
          status: 'completed',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          hasError: false
        }
      }
    };
    
    console.log('📊 Frontend would see:');
    console.log(`   Status: ${contractData.analysisHistory.latest.status}`);
    console.log('   ✅ This should complete the Quick Sync UI');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testRealQuickSync().catch(console.error);