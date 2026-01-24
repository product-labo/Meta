/**
 * Fixed SmartContractFetcher with strict chain isolation
 * Ensures Lisk only uses Lisk RPCs, Starknet only uses Starknet RPCs, etc.
 */

// Add this method to SmartContractFetcher class to ensure chain isolation
function ensureChainIsolation() {
  // Override the _executeWithFailover method to add strict validation
  const originalExecuteWithFailover = this._executeWithFailover;
  
  this._executeWithFailover = async function(chain, operation, operationName) {
    const providers = this.providers[chain];
    if (!providers || providers.length === 0) {
      throw new Error(`No providers configured for chain: ${chain}`);
    }
    
    console.log(`🔗 Using ${chain} providers only for ${operationName}`);
    
    let lastError;
    
    // Strict chain isolation - only use providers for the requested chain
    for (const provider of providers) {
      try {
        const startTime = Date.now();
        
        // Validate provider is for correct chain
        const providerChain = this._getProviderChain(provider);
        if (providerChain !== chain) {
          console.warn(`⚠️  Skipping ${provider.name} - wrong chain (${providerChain} != ${chain})`);
          continue;
        }
        
        // Execute operation with timeout
        const result = await Promise.race([
          operation(provider.client),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.failoverTimeout)
          )
        ]);
        
        // Update provider statistics
        const duration = Date.now() - startTime;
        provider.requestCount++;
        provider.successCount++;
        provider.isHealthy = true;
        provider.lastError = null;
        
        console.log(`✅ ${operationName} successful via ${provider.name} (${chain}) in ${duration}ms`);
        return result;
        
      } catch (error) {
        lastError = error;
        provider.requestCount++;
        provider.failureCount++;
        provider.isHealthy = false;
        provider.lastError = error.message;
        
        console.warn(`⚠️  ${operationName} failed via ${provider.name} (${chain}): ${error.message}`);
      }
    }
    
    // All providers for this specific chain failed
    throw new Error(`All ${chain} providers failed for ${operationName}: ${lastError?.message || 'Unknown error'}`);
  };
  
  // Helper method to determine provider chain
  this._getProviderChain = function(provider) {
    const url = provider.config.url.toLowerCase();
    if (url.includes('lisk')) return 'lisk';
    if (url.includes('starknet')) return 'starknet';
    if (url.includes('eth')) return 'ethereum';
    return 'unknown';
  };
}

// Export the fix
export { ensureChainIsolation };
