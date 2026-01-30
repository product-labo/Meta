#!/usr/bin/env node

/**
 * Fix Sync Process Timeout Issues
 * Addresses the 30% stuck problem by adding timeout mechanisms
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing sync process timeout issues...');

// Fix 1: Add timeout wrapper for analyzeContract
const timeoutWrapper = `
/**
 * Timeout wrapper for long-running operations
 */
function withTimeout(promise, timeoutMs, operation = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(\`\${operation} timed out after \${timeoutMs}ms\`));
      }, timeoutMs);
    })
  ]);
}
`;

// Fix 2: Enhanced progress reporting
const progressReporter = `
/**
 * Progress reporter for granular updates
 */
class ProgressReporter {
  constructor(analysisId, userId, totalSteps = 10) {
    this.analysisId = analysisId;
    this.userId = userId;
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.baseProgress = 30; // Start from 30%
    this.maxProgress = 80;  // End at 80%
  }

  async updateProgress(step, message = '') {
    this.currentStep = step;
    const progress = Math.min(
      this.maxProgress,
      this.baseProgress + ((step / this.totalSteps) * (this.maxProgress - this.baseProgress))
    );
    
    console.log(\`📊 Progress: \${progress}% - \${message}\`);
    
    try {
      // Update analysis progress
      await AnalysisStorage.update(this.analysisId, { 
        progress,
        lastUpdate: new Date().toISOString(),
        currentStep: message
      });
      
      // Update user progress
      const currentUser = await UserStorage.findById(this.userId);
      if (currentUser?.onboarding?.defaultContract) {
        const updatedOnboarding = {
          ...currentUser.onboarding,
          defaultContract: {
            ...currentUser.onboarding.defaultContract,
            indexingProgress: progress,
            lastUpdate: new Date().toISOString(),
            currentStep: message
          }
        };
        await UserStorage.update(this.userId, { onboarding: updatedOnboarding });
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }
}
`;

// Fix 3: Enhanced analyzeContract with timeout and progress
const enhancedAnalyzeContract = `
// Enhanced analyzeContract method with timeout and progress reporting
async function performDefaultContractAnalysisWithTimeout(analysisId, config, userId) {
  const ANALYSIS_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout
  const progressReporter = new ProgressReporter(analysisId, userId, 8);
  
  try {
    console.log(\`🔍 Starting analysis for \${analysisId} with timeout protection\`);
    
    // Initialize progress
    await progressReporter.updateProgress(0, 'Initializing analysis engine');
    
    const engine = new EnhancedAnalyticsEngine(config.rpcConfig);
    console.log(\`⚙️  EnhancedAnalyticsEngine created\`);
    
    await progressReporter.updateProgress(1, 'Engine initialized');
    
    // Wrap the analysis with timeout
    const analysisPromise = async () => {
      await progressReporter.updateProgress(2, 'Starting contract analysis');
      
      console.log(\`🎯 Analyzing contract: \${config.targetContract.address} on \${config.targetContract.chain}\`);
      
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
    
    console.log(\`✅ Contract analysis completed successfully\`);
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
`;

// Fix 4: Enhanced frontend polling logic
const enhancedPollingLogic = `
// Enhanced polling logic with better timeout detection
const startPolling = useCallback(() => {
  if (pollIntervalRef.current) {
    clearInterval(pollIntervalRef.current);
  }

  let consecutiveFailures = 0;
  let lastProgressUpdate = Date.now();
  const PROGRESS_TIMEOUT = 2 * 60 * 1000; // 2 minutes without progress = timeout
  const MAX_CONSECUTIVE_FAILURES = 5;

  pollIntervalRef.current = setInterval(async () => {
    if (!mountedRef.current) return;
    
    try {
      // Get current sync status
      const [status, contractData] = await Promise.all([
        api.onboarding.getStatus(),
        api.onboarding.getDefaultContract()
      ]);

      // Reset failure counter on success
      consecutiveFailures = 0;

      // Check for progress timeout
      const currentTime = Date.now();
      const currentProgress = status.indexingProgress || 0;
      
      if (currentProgress > syncState.progress) {
        lastProgressUpdate = currentTime;
      } else if (currentTime - lastProgressUpdate > PROGRESS_TIMEOUT) {
        console.log('🚨 Progress timeout detected - sync appears stuck');
        updateSyncState({
          error: 'Sync appears to be stuck. Please try refreshing the page.',
          isStuck: true
        });
        return;
      }

      // Simplified status checking - use single authoritative flag
      const isStillActive = status.continuousSyncActive === true || 
                           status.indexingProgress < 100;

      if (!isStillActive && syncState.isActive) {
        console.log('🛑 Marathon sync completed');
        stopPolling();
        updateSyncState({
          isActive: false,
          progress: 100,
          error: null
        });
        
        // Trigger page refresh after completion
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
        return;
      }

      // Update state with latest data
      const fullReport = contractData.fullResults?.fullReport;
      
      updateSyncState({
        progress: currentProgress,
        syncCycle: fullReport?.metadata?.syncCycle || 0,
        totalTransactions: fullReport?.summary?.totalTransactions || 0,
        uniqueUsers: fullReport?.summary?.uniqueUsers || 0,
        totalEvents: fullReport?.summary?.totalEvents || 0,
        dataIntegrityScore: fullReport?.metadata?.dataIntegrityScore || 100,
        cycleStartTime: fullReport?.metadata?.cycleStartTime || null,
        estimatedCycleDuration: fullReport?.metadata?.estimatedCycleDuration || null,
        cyclesCompleted: Math.max(0, (fullReport?.metadata?.syncCycle || 1) - 1),
        error: contractData.analysisError || null,
        lastUpdate: new Date().toISOString()
      });

    } catch (error) {
      consecutiveFailures++;
      console.error(\`Marathon sync polling error (\${consecutiveFailures}/\${MAX_CONSECUTIVE_FAILURES}):\`, error);
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log('🚨 Too many consecutive failures, stopping polling');
        updateSyncState({
          error: 'Connection issues detected. Please refresh the page.',
          isStuck: true
        });
        stopPolling();
      }
    }
  }, POLL_INTERVAL);
}, [updateSyncState, syncState.progress, syncState.isActive]);
`;

// Fix 5: RPC timeout wrapper
const rpcTimeoutWrapper = `
/**
 * Enhanced RPC call with timeout
 */
async function makeRpcCallWithTimeout(client, method, params, timeoutMs = 30000) {
  return withTimeout(
    client._makeRpcCall(method, params),
    timeoutMs,
    \`RPC call \${method}\`
  );
}

/**
 * Enhanced fetchContractInteractions with timeout protection
 */
async function fetchContractInteractionsWithTimeout(contractAddress, fromBlock, toBlock, chain) {
  const FETCH_TIMEOUT = 2 * 60 * 1000; // 2 minutes timeout
  
  console.log(\`🎯 Fetching contract interactions with timeout protection\`);
  
  return await withTimeout(
    this.fetchContractInteractions(contractAddress, fromBlock, toBlock, chain),
    FETCH_TIMEOUT,
    'Contract interaction fetching'
  );
}
`;

console.log('✅ Sync timeout fixes prepared');
console.log('');
console.log('📋 Next steps:');
console.log('1. Apply timeout wrapper to EnhancedAnalyticsEngine.js');
console.log('2. Update onboarding.js with enhanced progress reporting');
console.log('3. Update use-marathon-sync.ts with improved polling logic');
console.log('4. Add RPC timeout protection to ContractInteractionFetcher.js');
console.log('5. Test the fixes with a real sync operation');

// Write the fixes to separate files for easy application
fs.writeFileSync('timeout-wrapper.js', timeoutWrapper);
fs.writeFileSync('progress-reporter.js', progressReporter);
fs.writeFileSync('enhanced-analyze-contract.js', enhancedAnalyzeContract);
fs.writeFileSync('enhanced-polling-logic.js', enhancedPollingLogic);
fs.writeFileSync('rpc-timeout-wrapper.js', rpcTimeoutWrapper);

console.log('');
console.log('📁 Fix files created:');
console.log('- timeout-wrapper.js');
console.log('- progress-reporter.js');
console.log('- enhanced-analyze-contract.js');
console.log('- enhanced-polling-logic.js');
console.log('- rpc-timeout-wrapper.js');