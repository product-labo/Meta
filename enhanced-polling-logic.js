
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
      console.error(`Marathon sync polling error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
      
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
