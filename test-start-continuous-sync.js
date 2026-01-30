/**
 * Start a new continuous sync and monitor it to see if it gets stuck at 30%
 */

import { UserStorage, AnalysisStorage, ContractStorage } from './src/api/database/fileStorage.js';
import { performContinuousContractSync } from './src/api/routes/continuous-sync-improved.js';

async function startAndMonitorContinuousSync() {
  console.log('🚀 Starting new continuous sync to monitor...');
  
  try {
    // Find a user to test with
    const testUser = await UserStorage.findById('test-user-sync-123');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log(`👤 Using test user: ${testUser.id}`);
    console.log(`📋 Default contract: ${testUser.onboarding.defaultContract.address}`);
    
    // Find the contract configuration
    const allContracts = await ContractStorage.findByUserId(testUser.id);
    const defaultConfig = allContracts.find(c => c.isDefault && c.isActive);
    
    if (!defaultConfig) {
      console.log('❌ Default contract configuration not found');
      return;
    }
    
    console.log(`📋 Contract config: ${defaultConfig.name}`);
    
    // Create a new analysis for continuous sync
    const analysisData = {
      userId: testUser.id,
      configId: defaultConfig.id,
      analysisType: 'single',
      status: 'running',
      progress: 10,
      results: null,
      metadata: {
        isDefaultContract: true,
        continuous: true,
        continuousStarted: new Date().toISOString(),
        syncCycle: 1
      },
      errorMessage: null,
      logs: ['Starting continuous sync monitoring test...'],
      completedAt: null
    };

    const analysisResult = await AnalysisStorage.create(analysisData);
    console.log(`📝 Created analysis: ${analysisResult.id}`);
    
    // Update user's continuous sync status
    const updatedOnboarding = {
      ...testUser.onboarding,
      defaultContract: {
        ...testUser.onboarding.defaultContract,
        lastAnalysisId: analysisResult.id,
        continuousSync: true,
        continuousSyncStarted: new Date().toISOString(),
        isIndexed: false,
        indexingProgress: 10
      }
    };
    await UserStorage.update(testUser.id, { onboarding: updatedOnboarding });
    
    console.log('✅ Analysis created and user updated');
    
    // Start monitoring in a separate process
    const monitoringInterval = setInterval(async () => {
      try {
        const currentAnalysis = await AnalysisStorage.findById(analysisResult.id);
        if (!currentAnalysis) {
          console.log('❌ Analysis not found, stopping monitor');
          clearInterval(monitoringInterval);
          return;
        }
        
        console.log(`📊 Progress: ${currentAnalysis.progress}%, Status: ${currentAnalysis.status}, Cycle: ${currentAnalysis.metadata?.syncCycle || 'N/A'}`);
        
        if (currentAnalysis.logs && currentAnalysis.logs.length > 0) {
          const lastLog = currentAnalysis.logs[currentAnalysis.logs.length - 1];
          console.log(`📝 Last log: ${lastLog}`);
        }
        
        // Check if stuck at 30%
        if (currentAnalysis.status === 'running' && currentAnalysis.progress <= 30) {
          const createdTime = new Date(currentAnalysis.createdAt);
          const now = new Date();
          const runningTime = now - createdTime;
          const runningMinutes = Math.floor(runningTime / (1000 * 60));
          
          if (runningMinutes > 2) {
            console.log(`⚠️  STUCK DETECTED! Running for ${runningMinutes} minutes at ${currentAnalysis.progress}%`);
            
            // Stop the continuous sync
            console.log('🛑 Stopping stuck continuous sync...');
            await AnalysisStorage.update(analysisResult.id, {
              status: 'failed',
              errorMessage: 'Continuous sync stuck at 30% - manually terminated',
              completedAt: new Date().toISOString(),
              metadata: {
                ...currentAnalysis.metadata,
                continuous: false,
                stuckAt30Percent: true,
                terminatedAfterMinutes: runningMinutes
              }
            });
            
            clearInterval(monitoringInterval);
            console.log('✅ Monitoring stopped');
            return;
          }
        }
        
        // Stop monitoring if completed or failed
        if (currentAnalysis.status === 'completed' || currentAnalysis.status === 'failed') {
          console.log(`✅ Analysis ${currentAnalysis.status}, stopping monitor`);
          clearInterval(monitoringInterval);
        }
        
      } catch (monitorError) {
        console.error('❌ Monitor error:', monitorError.message);
      }
    }, 10000); // Check every 10 seconds
    
    // Start the continuous sync
    console.log('🚀 Starting continuous sync...');
    
    // Run continuous sync with timeout
    const syncPromise = performContinuousContractSync(analysisResult.id, defaultConfig, testUser.id);
    
    // Set a timeout to prevent infinite running
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Continuous sync timeout after 5 minutes'));
      }, 5 * 60 * 1000); // 5 minutes timeout
    });
    
    try {
      await Promise.race([syncPromise, timeoutPromise]);
      console.log('✅ Continuous sync completed normally');
    } catch (error) {
      console.log(`⚠️  Continuous sync ended: ${error.message}`);
      
      // Update analysis status
      const finalAnalysis = await AnalysisStorage.findById(analysisResult.id);
      if (finalAnalysis && finalAnalysis.status === 'running') {
        await AnalysisStorage.update(analysisResult.id, {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date().toISOString()
        });
      }
    }
    
    clearInterval(monitoringInterval);
    console.log('🏁 Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
startAndMonitorContinuousSync().catch(console.error);