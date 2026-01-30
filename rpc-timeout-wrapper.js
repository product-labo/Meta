
/**
 * Enhanced RPC call with timeout
 */
async function makeRpcCallWithTimeout(client, method, params, timeoutMs = 30000) {
  return withTimeout(
    client._makeRpcCall(method, params),
    timeoutMs,
    `RPC call ${method}`
  );
}

/**
 * Enhanced fetchContractInteractions with timeout protection
 */
async function fetchContractInteractionsWithTimeout(contractAddress, fromBlock, toBlock, chain) {
  const FETCH_TIMEOUT = 2 * 60 * 1000; // 2 minutes timeout
  
  console.log(`🎯 Fetching contract interactions with timeout protection`);
  
  return await withTimeout(
    this.fetchContractInteractions(contractAddress, fromBlock, toBlock, chain),
    FETCH_TIMEOUT,
    'Contract interaction fetching'
  );
}
