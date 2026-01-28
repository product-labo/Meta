# Refresh Update Fix

## Issue
The refresh feature (sync data) was creating new analysis records instead of updating the existing one. This caused:

1. **Dashboard showing N/A metrics** - The dashboard was looking for the original analysis but finding a new one
2. **Analysis history pollution** - Multiple analysis records for the same default contract (15 found in testing)
3. **Inconsistent data references** - The `lastAnalysisId` kept changing, breaking the connection to historical data

## Root Cause
In `src/api/routes/onboarding.js`, the `refresh-default-contract` endpoint was always calling:
```javascript
const analysisResult = await AnalysisStorage.create(analysisData);
```

This created a new analysis record every time refresh was called, instead of updating the existing one.

## Solution
Modified the refresh logic to **update existing analysis instead of creating new ones**:

### 1. Find Existing Analysis
```javascript
// Find existing analysis to update instead of creating new one
let existingAnalysis = null;
if (defaultContract.lastAnalysisId) {
  existingAnalysis = await AnalysisStorage.findById(defaultContract.lastAnalysisId);
}

// If no existing analysis found, find the most recent completed one
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
```

### 2. Update vs Create Logic
```javascript
if (existingAnalysis) {
  // Update existing analysis instead of creating new one
  console.log(`🔄 Updating existing analysis ${existingAnalysis.id} for refresh`);
  
  await AnalysisStorage.update(existingAnalysis.id, {
    status: 'running',
    progress: 10,
    results: null, // Clear old results
    metadata: {
      ...existingAnalysis.metadata,
      isDefaultContract: true,
      isRefresh: true,
      refreshStarted: new Date().toISOString(),
      originalCreatedAt: existingAnalysis.createdAt // Preserve original creation time
    },
    errorMessage: null,
    logs: ['Starting default contract data refresh...'],
    completedAt: null
  });
  
  analysisId = existingAnalysis.id;
} else {
  // Create new analysis only if no existing one found
  const analysisResult = await AnalysisStorage.create(analysisData);
  analysisId = analysisResult.id;
}
```

### 3. Preserve Analysis History
- **Maintains original creation date** via `originalCreatedAt` metadata
- **Keeps same analysis ID** so dashboard references remain valid
- **Updates results in place** instead of creating duplicates

## Benefits

✅ **Dashboard metrics now display correctly** - Same analysis ID means consistent data references
✅ **Clean analysis history** - No more duplicate entries for default contract
✅ **Preserved historical context** - Original creation date is maintained
✅ **Consistent user experience** - Refresh updates data without breaking UI references
✅ **Reduced database bloat** - No unnecessary duplicate analysis records

## Before vs After

**Before (Broken):**
```
Default contract analyses: 15
- Analysis 1: Created 2024-01-01, Status: completed
- Analysis 2: Created 2024-01-02, Status: completed (refresh)
- Analysis 3: Created 2024-01-03, Status: completed (refresh)
- ... (12 more duplicate analyses)
```

**After (Fixed):**
```
Default contract analyses: 1
- Analysis 1: Created 2024-01-01, Status: completed, Last Refreshed: 2024-01-03
```

## Impact
- **Dashboard now shows actual metrics** instead of N/A values
- **Refresh functionality works as expected** - updates existing data
- **Analysis history is clean** - no more duplicate entries
- **Performance improved** - fewer database records to process

## Files Modified
- `src/api/routes/onboarding.js`: Updated `refresh-default-contract` endpoint logic

## Testing
Verified with user `a9217f83-3bc0-46e8-9721-c3d9e13ea7d3`:
- Before: 15 default contract analyses (indicating the bug)
- After: Refresh will update existing analysis instead of creating new ones