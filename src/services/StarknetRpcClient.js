/**
 * Starknet RPC Client
 * Specialized client for Starknet's JSON-RPC API
 * Multi-Chain RPC Integration - Task 2
 */

import fetch from 'node-fetch';

export class StarknetRpcClient {
  constructor(rpcUrl) {
    this.rpcUrl = rpcUrl;
    this.requestId = 1;
  }

  /**
   * Make a JSON-RPC call to Starknet
   * @private
   */
  async _makeRpcCall(method, params = [], timeout = 10000) {
    const payload = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: this.requestId++
    };

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message} (Code: ${data.error.code})`);
      }

      return data.result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Starknet RPC call timed out after ${timeout}ms`);
      }
      throw new Error(`Starknet RPC call failed: ${error.message}`);
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber() {
    return await this._makeRpcCall('starknet_blockNumber');
  }

  /**
   * Get block by number
   */
  async getBlock(blockNumber) {
    const blockId = typeof blockNumber === 'number' ? 
      { block_number: blockNumber } : 
      blockNumber;
    
    return await this._makeRpcCall('starknet_getBlockWithTxs', [blockId]);
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash) {
    return await this._makeRpcCall('starknet_getTransactionByHash', [txHash]);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    return await this._makeRpcCall('starknet_getTransactionReceipt', [txHash]);
  }

  /**
   * Get transactions by contract address (simplified approach)
   */
  async getTransactionsByAddress(contractAddress, fromBlock, toBlock) {
    const transactions = [];
    
    try {
      // Get blocks in range and filter transactions
      for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
        const block = await this.getBlock(blockNum);
        
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            // Check if transaction involves the contract
            if (tx.contract_address === contractAddress || 
                (tx.calldata && tx.calldata.includes(contractAddress))) {
              
              const receipt = await this.getTransactionReceipt(tx.transaction_hash);
              
              transactions.push({
                hash: tx.transaction_hash,
                from: tx.sender_address,
                to: tx.contract_address,
                value: '0', // Starknet doesn't have ETH value transfers in the same way
                gasPrice: '0',
                gasUsed: receipt?.actual_fee || '0',
                gasLimit: tx.max_fee || '0',
                input: JSON.stringify(tx.calldata || []),
                blockNumber: blockNum,
                blockTimestamp: block.timestamp,
                status: receipt?.status === 'ACCEPTED_ON_L2' || receipt?.status === 'ACCEPTED_ON_L1',
                chain: 'starknet',
                nonce: tx.nonce,
                type: tx.type,
                version: tx.version
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Starknet transactions:', error.message);
      throw error;
    }
    
    return transactions;
  }

  /**
   * Batch get transactions (simplified for Starknet)
   */
  async batchGetTransactions(txHashes) {
    const transactions = [];
    
    // Process in smaller batches to avoid overwhelming the RPC
    const batchSize = 5;
    for (let i = 0; i < txHashes.length; i += batchSize) {
      const batch = txHashes.slice(i, i + batchSize);
      const promises = batch.map(hash => this.getTransaction(hash));
      const results = await Promise.all(promises);
      transactions.push(...results);
    }
    
    return transactions;
  }

  /**
   * Test connection to Starknet RPC
   */
  async testConnection() {
    try {
      // Use shorter timeout for connection test
      await this._makeRpcCall('starknet_blockNumber', [], 5000);
      return true;
    } catch (error) {
      console.error(`Starknet RPC test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get chain info
   */
  getChain() {
    return 'starknet';
  }

  /**
   * Get RPC URL
   */
  getRpcUrl() {
    return this.rpcUrl;
  }
}

export default StarknetRpcClient;