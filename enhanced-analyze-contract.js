
// Enhanced analyzeContract method with timeout and progress reporting
async function performDefaultContractAnalysisWithTimeout(analysisId, config, userId) {
  const ANALYSIS_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout
  const progressReporter = new ProgressReporter(analysisId, userId, 8);
  
  try {
    console.log(`🔍 Starting analysis for ${analysisId} with timeout protection`);
    
    // Initialize progress
    await progressReporter.updateProgress(0, 'Initializing analysis engine');
    
    const engine = new EnhancedAnalyticsEngine(config.rpcConfig);
    console.log(`⚙️  EnhancedAnalyticsEngine created`);
    
    await progressReporter.updateProgress(1, 'Engine initialized');
    
    // Wrap the analysis with timeout
    const analysisPromise = async () => {
      await progressReporter.updateProgress(2, 'Starting contract analysis');
      
      console.log(`🎯 Analyzing contract: ${config.targetContract.address} on ${config.targetContract.chain}`);
      
      // Break down the analysis into steps with progress updates
      const targetResults = await engine.analyzeContract(
        config.targetContract.address,
        config.targetContract.chain,
        config.targetContract.name,
        config.analysisParams.blockRange,
        progressReporter // Pass progress reporter
      );
      
      await progressReporter.updateProgress(7, 'Analysis completed');
      return targetResults;
    };
    
    // Execute with timeout
    const targetResults = await withTimeout(
      analysisPromise(),
      ANALYSIS_TIMEOUT,
      'Contract analysis'
    );
    
    console.log(`✅ Contract analysis completed successfully`);
    await progressReporter.updateProgress(8, 'Finalizing results');
    
    // Continue with rest of the analysis...
    return targetResults;
    
  } catch (error) {
    console.error('Analysis failed:', error);
    
    // Update progress with error
    try {
      await AnalysisStorage.update(analysisId, { 
        progress: 30,
        error: error.message,
        status: 'failed',
        lastUpdate: new Date().toISOString()
      });
      
      const currentUser = await UserStorage.findById(userId);
      if (currentUser?.onboarding?.defaultContract) {
        const updatedOnboarding = {
          ...currentUser.onboarding,
          defaultContract: {
            ...currentUser.onboarding.defaultContract,
            indexingProgress: 30,
            error: error.message,
            status: 'failed',
            lastUpdate: new Date().toISOString()
          }
        };
        await UserStorage.update(userId, { onboarding: updatedOnboarding });
      }
    } catch (updateError) {
      console.error('Failed to update error state:', updateError);
    }
    
    throw error;
  }
}
