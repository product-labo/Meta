# Dashboard Metrics Display Fix

## Issue
The dashboard was showing "N/A" for all default contract metrics even after successful refresh/sync operations. Investigation revealed that the analysis was completing but with errors, and the frontend wasn't handling error cases properly.

## Root Cause Analysis
1. **Starknet RPC Failures**: The analysis was failing due to Starknet RPC provider issues:
   ```
   Error: All starknet providers failed for fetchTransactions: Starknet RPC call failed: HTTP 503: Service Unavailable
   ```

2. **Error Data Structure**: When analysis failed, the metrics object contained:
   ```javascript
   metrics: { error: "All starknet providers failed..." }
   ```

3. **Frontend Logic Issue**: The dashboard was checking for `metrics?.tvl` but the metrics object contained an error string instead of actual metrics.

4. **No Error Handling**: The API didn't distinguish between successful metrics and error cases.

## Solution

### 1. API Error Handling (`src/api/routes/onboarding.js`)
Updated the `/default-contract` endpoint to properly handle error cases:

```javascript
res.json({
  contract: defaultContract,
  metrics: latestAnalysis?.results?.target?.metrics && !latestAnalysis.results.target.metrics.error 
    ? latestAnalysis.results.target.metrics 
    : null,
  fullResults: latestAnalysis?.results?.target || null,
  indexingStatus: {
    isIndexed: defaultContract.isIndexed,
    progress: defaultContract.indexingProgress
  },
  analysisHistory: {
    total: defaultContractAnalyses.length,
    completed: defaultContractAnalyses.filter(a => a.status === 'completed').length,
    latest: latestAnalysis ? {
      id: latestAnalysis.id,
      status: latestAnalysis.status,
      createdAt: latestAnalysis.createdAt,
      completedAt: latestAnalysis.completedAt,
      hasError: !!(latestAnalysis.results?.target?.metrics?.error)
    } : null
  },
  // Include error information if analysis failed
  analysisError: latestAnalysis?.results?.target?.metrics?.error || null
});
```

**Key Changes:**
- **Null metrics on error**: Returns `null` for metrics when error is present
- **Error field**: Adds `analysisError` field with the actual error message
- **Error flag**: Adds `hasError` flag to analysis history

### 2. Frontend Error Display (`frontend/app/dashboard/page.tsx`)
Enhanced the dashboard to show error information and provide retry options:

```typescript
interface DefaultContractData {
  // ... existing fields
  analysisError?: string | null // Error message if analysis failed
  analysisHistory: {
    // ... existing fields
    latest: {
      // ... existing fields
      hasError?: boolean
    } | null
  }
}
```

**UI Improvements:**
- **Error Alert Card**: Shows analysis error with retry button
- **Error Status Badge**: Displays "Analysis Failed" instead of "Indexed" when error occurs
- **Contextual Metrics**: Shows "Error" instead of "N/A" when analysis failed
- **Retry Functionality**: Allows users to retry failed analysis

### 3. Visual Error Indicators
```typescript
{defaultContract.analysisError && (
  <Card className="border-destructive/50 bg-destructive/5">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Analysis Error
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-3">
        {defaultContract.analysisError}
      </p>
      <Button onClick={handleRefreshDefaultContract} disabled={isRefreshing}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry Analysis
      </Button>
    </CardContent>
  </Card>
)}
```

## Benefits

✅ **Clear Error Communication**: Users now see exactly what went wrong instead of confusing "N/A" values
✅ **Actionable UI**: Retry button allows users to attempt analysis again
✅ **Better UX**: Distinguishes between "no data yet" vs "analysis failed"
✅ **Debugging Support**: Error messages help identify RPC or network issues
✅ **Status Clarity**: Visual indicators show analysis state clearly

## Before vs After

**Before (Confusing):**
```
TVL: N/A
Volume: N/A  
Users: N/A
Transactions: N/A
Status: Indexed ✅ (misleading)
```

**After (Clear):**
```
⚠️ Analysis Error
All starknet providers failed for fetchTransactions: HTTP 503: Service Unavailable
[Retry Analysis] button

TVL: Error
Volume: Error
Users: Error  
Transactions: Error
Status: Analysis Failed ❌
```

## Next Steps

1. **RPC Provider Reliability**: The underlying issue is Starknet RPC provider failures
2. **Provider Fallback**: Consider adding more Starknet RPC providers
3. **Retry Logic**: Implement automatic retry with exponential backoff
4. **Caching**: Cache successful results to show last known good data during failures

## Files Modified
- `src/api/routes/onboarding.js`: Enhanced error handling in API response
- `frontend/app/dashboard/page.tsx`: Added error display and retry functionality

## Impact
Users now have clear visibility into analysis failures and can take action to retry, rather than being confused by "N/A" values that provided no context about what went wrong.