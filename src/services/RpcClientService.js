import { ethers } from 'ethers';

/**
 * RPC Client Service
 * Communicates with blockchain nodes via NowNodes RPC to fetch transaction data
 */
export class RpcClientService {
  /**
   * @param {string} rpcUrl - RPC endpoint URL
   * @param {string} chain - Chain name (ethereum, polygon, starknet, etc.)
   */
  constructor(rpcUrl, chain) {
    this.rpcUrl = rpcUrl;
    this.chain = chain.toLowerCase();
    this.provider = null;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000  // 10 seconds
    };
    this.timeouts = {
      transaction: 30000, // 30 seconds
      block: 10000        // 10 seconds
    };
    
    this._initializeProvider();
  }

  /**
   * Initialize the provider based on chain type
   * @private
   */
  _initializeProvider() {
    try {
      if (this.chain === 'starknet') {
        // Starknet uses different RPC format
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl, null, { staticNetwork: true });
      } else {
        // Ethereum, Polygon, Base, Arbitrum, Optimism use standard JSON-RPC
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl, null, { staticNetwork: true });
      }
    } catch (error) {
      throw new Error(`Failed to initialize provider for ${this.chain}: ${error.message}`);
    }
  }

  /**
   * Get current block number
   * @returns {Promise<number>} Current block number
   */
  async getBlockNumber() {
    return await this._retryOperation(async () => {
      if (this.chain === 'starknet') {
        // Starknet uses different RPC method
        const result = await this.provider.send('starknet_blockNumber', []);
        return parseInt(result, 16); // Convert hex to decimal
      } else {
        // Ethereum-compatible chains
        const blockNumber = await this.provider.getBlockNumber();
        return blockNumber;
      }
    }, 'getBlockNumber');
  }

  /**
   * Get transactions by contract address
   * @param {string} address - Contract address
   * @param {number} fromBlock - Starting block number
   * @param {number} toBlock - Ending block number
   * @returns {Promise<Array>} Array of transactions
   */
  async getTransactionsByAddress(address, fromBlock, toBlock) {
    return await this._retryOperation(async () => {
      const transactions = [];
      
      // Fetch transactions in batches to avoid overwhelming the RPC
      const batchSize = 1000;
      
      for (let block = fromBlock; block <= toBlock; block += batchSize) {
        const endBlock = Math.min(block + batchSize - 1, toBlock);
        
        // Get block range
        const blockPromises = [];
        for (let b = block; b <= endBlock; b++) {
          blockPromises.push(this.provider.getBlock(b, true));
        }
        
        const blocks = await Promise.all(blockPromises);
        
        // Filter transactions to/from the address
        for (const blockData of blocks) {
          if (blockData && blockData.transactions) {
            for (const tx of blockData.transactions) {
              if (tx.to && tx.to.toLowerCase() === address.toLowerCase()) {
                transactions.push(await this._formatTransaction(tx, blockData));
              }
            }
          }
        }
      }
      
      return transactions;
    }, 'getTransactionsByAddress', this.timeouts.transaction);
  }

  /**
   * Get transaction receipt
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction receipt
   */
  async getTransactionReceipt(txHash) {
    return await this._retryOperation(async () => {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    }, 'getTransactionReceipt');
  }

  /**
   * Get block by number
   * @param {number} blockNumber - Block number
   * @returns {Promise<Object>} Block data
   */
  async getBlock(blockNumber) {
    return await this._retryOperation(async () => {
      const block = await this.provider.getBlock(blockNumber);
      return block;
    }, 'getBlock', this.timeouts.block);
  }

  /**
   * Batch get transactions by hashes
   * @param {Array<string>} txHashes - Array of transaction hashes
   * @returns {Promise<Array>} Array of transactions
   */
  async batchGetTransactions(txHashes) {
    return await this._retryOperation(async () => {
      const batchSize = 10; // Process 10 at a time
      const results = [];
      
      for (let i = 0; i < txHashes.length; i += batchSize) {
        const batch = txHashes.slice(i, i + batchSize);
        const promises = batch.map(hash => this.provider.getTransaction(hash));
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      }
      
      return results;
    }, 'batchGetTransactions', this.timeouts.transaction);
  }

  /**
   * Format transaction data to standard format
   * @private
   */
  async _formatTransaction(tx, blockData) {
    const receipt = await this.getTransactionReceipt(tx.hash);
    
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value ? tx.value.toString() : '0',
      gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',
      gasUsed: receipt ? receipt.gasUsed.toString() : '0',
      gasLimit: tx.gasLimit ? tx.gasLimit.toString() : '0',
      input: tx.data || '0x',
      blockNumber: tx.blockNumber,
      blockTimestamp: blockData.timestamp,
      status: receipt ? receipt.status === 1 : false,
      chain: this.chain,
      nonce: tx.nonce
    };
  }

  /**
   * Retry operation with exponential backoff
   * @private
   */
  async _retryOperation(operation, operationName, timeout = null) {
    let lastError;
    
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        // Apply timeout if specified
        if (timeout) {
          return await this._withTimeout(operation(), timeout);
        }
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this._isNonRetryableError(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        
        console.warn(
          `[RPC ${this.chain}] ${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries}): ${error.message}. Retrying in ${delay}ms...`
        );
        
        await this._sleep(delay);
      }
    }
    
    throw new Error(
      `[RPC ${this.chain}] ${operationName} failed after ${this.retryConfig.maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Check if error should not be retried
   * @private
   */
  _isNonRetryableError(error) {
    const nonRetryableMessages = [
      'invalid address',
      'invalid argument',
      'missing argument',
      'invalid block number'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Execute operation with timeout
   * @private
   */
  async _withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get chain name
   * @returns {string} Chain name
   */
  getChain() {
    return this.chain;
  }

  /**
   * Get RPC URL
   * @returns {string} RPC URL
   */
  getRpcUrl() {
    return this.rpcUrl;
  }

  /**
   * Test connection to RPC endpoint
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      if (this.chain === 'starknet') {
        // Test Starknet-specific method
        await this.provider.send('starknet_blockNumber', []);
      } else {
        // Test Ethereum-compatible method
        await this.getBlockNumber();
      }
      return true;
    } catch (error) {
      console.error(`[RPC ${this.chain}] Connection test failed: ${error.message}`);
      return false;
    }
  }
}

export default RpcClientService;
