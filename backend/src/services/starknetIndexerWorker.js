/**
 * Starknet Indexer Worker
 * 
 * Handles indexing of Starknet blockchain transactions for wallet addresses.
 * Supports RPC failover, batch processing, transaction decoding, internal call processing, and progress tracking.
 * 
 * Requirements: 4.1, 4.2, 4.3, 7.1, 7.4
 */

import { RpcProvider, CallData, cairo } from 'starknet';
import { EventEmitter } from 'events';
import { pool } from '../config/appConfig.js';
import { abiParserService } from './abiParserService.js';

/**
 * Advanced Starknet RPC Manager with failover support and enhanced error handling
 */
class StarknetRPCManager {
  constructor(rpcEndpoints) {
    this.rpcEndpoints = rpcEndpoints || [];
    this.currentIndex = 0;
    this.failedEndpoints = new Set();
    this.retryDelays = new Map(); // Track retry delays for failed endpoints
    this.rateLimitedEndpoints = new Map(); // Track rate-limited endpoints separately
  }

  /**
   * Get current provider with failover support
   */
  async getProvider() {
    if (this.rpcEndpoints.length === 0) {
      throw new Error('No Starknet RPC endpoints configured');
    }

    // Try to find a working endpoint
    for (let i = 0; i < this.rpcEndpoints.length; i++) {
      const endpoint = this.rpcEndpoints[this.currentIndex];
      
      // Skip failed endpoints that are still in cooldown
      if (this.failedEndpoints.has(endpoint)) {
        const retryTime = this.retryDelays.get(endpoint) || 0;
        if (Date.now() < retryTime) {
          this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
          continue;
        } else {
          // Cooldown expired, remove from failed set
          this.failedEndpoints.delete(endpoint);
          this.retryDelays.delete(endpoint);
        }
      }

      // Skip rate-limited endpoints that are still in cooldown
      if (this.rateLimitedEndpoints.has(endpoint)) {
        const rateLimitRetryTime = this.rateLimitedEndpoints.get(endpoint);
        if (Date.now() < rateLimitRetryTime) {
          this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
          continue;
        } else {
          // Rate limit cooldown expired
          this.rateLimitedEndpoints.delete(endpoint);
        }
      }

      try {
        const provider = new RpcProvider({ nodeUrl: endpoint });
        // Test the connection
        await provider.getBlockNumber();
        return provider;
      } catch (error) {
        console.warn(`Starknet RPC endpoint ${endpoint} failed:`, error.message);
        
        // Check if this is a rate limit error
        if (this.isRateLimitError(error)) {
          this.markEndpointRateLimited(endpoint);
        } else {
          this.markEndpointFailed(endpoint);
        }
        
        this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
      }
    }

    throw new Error('All Starknet RPC endpoints are currently unavailable');
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(error) {
    return error.code === 429 || 
           error.status === 429 || 
           error.message.toLowerCase().includes('rate limit') ||
           error.message.toLowerCase().includes('too many requests');
  }

  /**
   * Mark an endpoint as rate-limited with progressive backoff
   */
  markEndpointRateLimited(endpoint) {
    const currentDelay = this.rateLimitedEndpoints.get(endpoint) || 0;
    const baseDelay = currentDelay > 0 ? (currentDelay - Date.now()) : 30000; // Start with 30s
    const nextDelay = Math.min(baseDelay * 2, 600000); // Cap at 10 minutes for rate limits
    
    this.rateLimitedEndpoints.set(endpoint, Date.now() + nextDelay);
    console.warn(`Starknet RPC endpoint ${endpoint} rate limited, retry in ${nextDelay / 1000}s`);
  }

  /**
   * Mark an endpoint as failed and set retry delay
   */
  markEndpointFailed(endpoint) {
    this.failedEndpoints.add(endpoint);
    // Exponential backoff: 30s, 60s, 120s, 300s (5min)
    const currentDelay = this.retryDelays.get(endpoint) || 15000;
    const nextDelay = Math.min(currentDelay * 2, 300000);
    this.retryDelays.set(endpoint, Date.now() + nextDelay);
  }

  /**
   * Switch to next available endpoint
   */
  switchToNext() {
    this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
  }

  /**
   * Get status of all endpoints
   */
  getEndpointStatus() {
    return this.rpcEndpoints.map((endpoint, index) => ({
      endpoint,
      isCurrent: index === this.currentIndex,
      isFailed: this.failedEndpoints.has(endpoint),
      isRateLimited: this.rateLimitedEndpoints.has(endpoint),
      retryTime: this.retryDelays.get(endpoint) || this.rateLimitedEndpoints.get(endpoint),
      status: this.getEndpointStatusString(endpoint)
    }));
  }

  /**
   * Get human-readable status for an endpoint
   */
  getEndpointStatusString(endpoint) {
    if (this.rateLimitedEndpoints.has(endpoint)) {
      const retryTime = this.rateLimitedEndpoints.get(endpoint);
      const remainingTime = Math.max(0, retryTime - Date.now());
      return `Rate limited (retry in ${Math.ceil(remainingTime / 1000)}s)`;
    }
    
    if (this.failedEndpoints.has(endpoint)) {
      const retryTime = this.retryDelays.get(endpoint);
      const remainingTime = Math.max(0, retryTime - Date.now());
      return `Failed (retry in ${Math.ceil(remainingTime / 1000)}s)`;
    }
    
    return 'Available';
  }
}

/**
 * Starknet Indexer Worker Class
 */
export class StarknetIndexerWorker extends EventEmitter {
  constructor(rpcEndpoints, batchSize = 50) {
    super();
    this.rpcManager = new StarknetRPCManager(rpcEndpoints);
    this.batchSize = batchSize; // Smaller batch size for Starknet due to complexity
    this.isRunning = false;
    this.shouldStop = false;
  }

  /**
   * Index wallet transactions from startBlock to endBlock
   */
  async indexWallet(walletId, address, chain, chainType, startBlock, endBlock, onProgress) {
    this.isRunning = true;
    this.shouldStop = false;
    this.startTime = Date.now();

    const result = {
      walletId,
      address,
      chain,
      chainType: 'starknet',
      startBlock,
      endBlock,
      transactionsFound: 0,
      eventsFound: 0,
      blocksProcessed: 0,
      success: false,
      error: null
    };

    try {
      console.log(`Starting Starknet indexing for wallet ${walletId} on ${chain} from block ${startBlock} to ${endBlock}`);

      const provider = await this.rpcManager.getProvider();
      const currentBlock = Math.min(endBlock, await provider.getBlockNumber());
      
      // Update endBlock to current if it was set too high
      result.endBlock = currentBlock;
      
      let processedBlock = startBlock;
      const totalBlocks = currentBlock - startBlock + 1;

      while (processedBlock <= currentBlock && !this.shouldStop) {
        const batchEndBlock = Math.min(processedBlock + this.batchSize - 1, currentBlock);
        
        try {
          const batchResult = await this.processBatch(
            walletId, 
            address, 
            chain, 
            chainType, 
            processedBlock, 
            batchEndBlock, 
            provider
          );

          result.transactionsFound += batchResult.transactions;
          result.eventsFound += batchResult.events;
          result.blocksProcessed = batchEndBlock - startBlock + 1;

          // Calculate progress metrics
          const progress = {
            currentBlock: batchEndBlock,
            totalBlocks,
            transactionsFound: result.transactionsFound,
            eventsFound: result.eventsFound,
            blocksPerSecond: this.calculateBlocksPerSecond(startBlock, batchEndBlock, Date.now() - this.startTime),
            estimatedTimeRemaining: this.calculateETA(processedBlock, currentBlock, this.startTime)
          };

          // Emit progress update
          if (onProgress) {
            onProgress(progress);
          }
          this.emit('progress', progress);

          processedBlock = batchEndBlock + 1;

          // Small delay to prevent overwhelming the RPC
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`Error processing Starknet batch ${processedBlock}-${batchEndBlock}:`, error);
          
          // Try to switch RPC endpoint and retry
          this.rpcManager.switchToNext();
          
          // Skip problematic batch after 3 retries
          let retries = 0;
          while (retries < 3) {
            try {
              const newProvider = await this.rpcManager.getProvider();
              await this.processBatch(walletId, address, chain, chainType, processedBlock, batchEndBlock, newProvider);
              break;
            } catch (retryError) {
              retries++;
              if (retries >= 3) {
                console.error(`Skipping Starknet batch ${processedBlock}-${batchEndBlock} after 3 retries`);
                processedBlock = batchEndBlock + 1;
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
          }
        }
      }

      // Update wallet's last indexed block
      await this.updateWalletIndexingStatus(walletId, currentBlock, result.transactionsFound, result.eventsFound);

      result.success = true;
      console.log(`Completed Starknet indexing for wallet ${walletId}: ${result.transactionsFound} transactions, ${result.eventsFound} events`);

    } catch (error) {
      result.error = error.message;
      console.error(`Starknet indexing failed for wallet ${walletId}:`, error);
      throw error;
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Process a batch of Starknet blocks
   */
  async processBatch(walletId, address, chain, chainType, startBlock, endBlock, provider) {
    const transactions = [];
    const events = [];

    // Process each block in the batch
    for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
      try {
        const block = await provider.getBlockWithTxs(blockNum);
        if (!block || !block.transactions) continue;

        // Process each transaction in the block
        for (const tx of block.transactions) {
          // Check if wallet is involved in transaction
          const isWalletInvolved = this.isWalletInvolvedInTransaction(address, tx);
          
          if (isWalletInvolved) {
            const decodedTx = await this.decodeStarknetTransaction(tx, chain);
            
            // Process internal calls for this transaction
            const internalCalls = await this.processInternalCalls(tx, address);
            
            const transactionData = {
              walletId,
              chain,
              chainType: 'starknet',
              transactionHash: tx.transaction_hash,
              blockNumber: blockNum,
              blockTimestamp: new Date(block.timestamp * 1000),
              fromAddress: tx.sender_address || tx.contract_address,
              toAddress: tx.contract_address,
              valueEth: this.extractTransactionValue(tx),
              gasUsed: null, // Starknet uses different gas model
              gasPrice: null,
              functionSelector: decodedTx.functionSelector,
              functionName: decodedTx.functionName,
              functionCategory: decodedTx.functionCategory,
              decodedParams: decodedTx.decodedParams,
              transactionStatus: tx.execution_status === 'SUCCEEDED' ? 1 : 0,
              isContractInteraction: true, // Most Starknet transactions are contract interactions
              direction: this.getTransactionDirection(address, tx.sender_address, tx.contract_address),
              rawData: {
                calldata: tx.calldata,
                signature: tx.signature,
                max_fee: tx.max_fee,
                version: tx.version,
                nonce: tx.nonce,
                type: tx.type,
                internalCalls: internalCalls
              }
            };

            transactions.push(transactionData);

            // Get transaction receipt for events
            try {
              const receipt = await provider.getTransactionReceipt(tx.transaction_hash);
              if (receipt && receipt.events) {
                for (const event of receipt.events) {
                  const decodedEvent = await this.decodeStarknetEvent(event, chain);
                  if (decodedEvent) {
                    events.push({
                      walletId,
                      transactionHash: tx.transaction_hash,
                      chain,
                      chainType: 'starknet',
                      blockNumber: blockNum,
                      blockTimestamp: new Date(block.timestamp * 1000),
                      eventSignature: this.getStarknetEventSignature(event),
                      eventName: decodedEvent.eventName,
                      contractAddress: event.from_address,
                      decodedParams: decodedEvent.decodedParams,
                      logIndex: events.length, // Starknet doesn't have log index, use array position
                      rawTopics: event.keys,
                      rawData: event.data
                    });
                  }
                }
              }
            } catch (receiptError) {
              console.warn(`Failed to get receipt for transaction ${tx.transaction_hash}:`, receiptError.message);
            }
          }
        }
      } catch (blockError) {
        console.warn(`Error processing Starknet block ${blockNum}:`, blockError.message);
        // Continue with next block
      }
    }

    // Store transactions and events in database
    if (transactions.length > 0) {
      await this.storeTransactions(transactions);
    }
    if (events.length > 0) {
      await this.storeEvents(events);
    }

    return {
      transactions: transactions.length,
      events: events.length
    };
  }

  /**
   * Check if wallet is involved in Starknet transaction
   */
  isWalletInvolvedInTransaction(walletAddress, tx) {
    const wallet = walletAddress.toLowerCase();
    
    // Check sender address
    if (tx.sender_address && tx.sender_address.toLowerCase() === wallet) {
      return true;
    }
    
    // Check contract address (for contract calls)
    if (tx.contract_address && tx.contract_address.toLowerCase() === wallet) {
      return true;
    }
    
    // Check calldata for wallet address (common in transfers)
    if (tx.calldata && Array.isArray(tx.calldata)) {
      for (const data of tx.calldata) {
        if (typeof data === 'string' && data.toLowerCase() === wallet) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Process internal calls for Starknet transaction
   */
  async processInternalCalls(tx, walletAddress) {
    const internalCalls = [];
    
    try {
      // Starknet transactions can have complex call structures
      // For now, we'll extract basic call information from calldata
      if (tx.calldata && Array.isArray(tx.calldata) && tx.calldata.length > 0) {
        // Parse calldata structure - this is simplified
        // In production, you'd want more sophisticated parsing based on the contract ABI
        const calls = this.parseStarknetCalldata(tx.calldata);
        
        for (const call of calls) {
          if (this.isCallRelevantToWallet(call, walletAddress)) {
            internalCalls.push({
              contractAddress: call.contractAddress,
              selector: call.selector,
              calldata: call.calldata,
              type: 'internal_call'
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Error processing internal calls for ${tx.transaction_hash}:`, error.message);
    }
    
    return internalCalls;
  }

  /**
   * Parse Starknet calldata structure (simplified)
   */
  parseStarknetCalldata(calldata) {
    const calls = [];
    
    try {
      // Starknet calldata format varies by transaction type
      // This is a simplified parser - in production you'd need more sophisticated parsing
      if (calldata.length >= 3) {
        calls.push({
          contractAddress: calldata[0],
          selector: calldata[1],
          calldata: calldata.slice(2)
        });
      }
    } catch (error) {
      console.warn('Error parsing Starknet calldata:', error.message);
    }
    
    return calls;
  }

  /**
   * Check if internal call is relevant to wallet
   */
  isCallRelevantToWallet(call, walletAddress) {
    const wallet = walletAddress.toLowerCase();
    
    // Check if wallet is the contract being called
    if (call.contractAddress && call.contractAddress.toLowerCase() === wallet) {
      return true;
    }
    
    // Check if wallet appears in calldata
    if (call.calldata && Array.isArray(call.calldata)) {
      for (const data of call.calldata) {
        if (typeof data === 'string' && data.toLowerCase() === wallet) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Decode Starknet transaction
   */
  async decodeStarknetTransaction(tx, chain) {
    const result = {
      functionSelector: null,
      functionName: null,
      functionCategory: null,
      decodedParams: null
    };

    try {
      // Extract function selector from calldata
      if (tx.calldata && Array.isArray(tx.calldata) && tx.calldata.length > 1) {
        result.functionSelector = tx.calldata[1]; // Second element is usually the selector
        
        // Try to get ABI features for the contract
        if (tx.contract_address) {
          const abiFeatures = await abiParserService.getABIFeatures(tx.contract_address, chain);
          const functionFeature = abiFeatures.functions.find(f => f.selector === result.functionSelector);

          if (functionFeature) {
            result.functionName = functionFeature.name;
            result.functionCategory = functionFeature.category;

            // Try to decode parameters (simplified for Starknet)
            try {
              result.decodedParams = this.decodeStarknetCalldata(tx.calldata, functionFeature);
            } catch (decodeError) {
              console.warn(`Failed to decode Starknet function parameters for ${result.functionName}:`, decodeError.message);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Error decoding Starknet transaction ${tx.transaction_hash}:`, error.message);
    }

    return result;
  }

  /**
   * Decode Starknet calldata (simplified)
   */
  decodeStarknetCalldata(calldata, functionFeature) {
    const result = {};
    
    try {
      if (functionFeature && functionFeature.inputs && Array.isArray(calldata)) {
        // Skip contract address and selector (first 2 elements)
        const paramData = calldata.slice(2);
        
        functionFeature.inputs.forEach((param, index) => {
          if (index < paramData.length) {
            result[param.name || `param${index}`] = paramData[index];
          }
        });
      }
    } catch (error) {
      console.warn('Error decoding Starknet calldata:', error.message);
    }
    
    return result;
  }

  /**
   * Decode Starknet event
   */
  async decodeStarknetEvent(event, chain) {
    try {
      const eventSignature = this.getStarknetEventSignature(event);
      
      // Try to get ABI features for the contract
      const abiFeatures = await abiParserService.getABIFeatures(event.from_address, chain);
      const eventFeature = abiFeatures.events.find(e => e.topic === eventSignature);

      if (eventFeature) {
        try {
          const decodedParams = this.decodeStarknetEventData(event, eventFeature);
          
          return {
            eventName: eventFeature.name,
            decodedParams: decodedParams
          };
        } catch (decodeError) {
          console.warn(`Failed to decode Starknet event parameters for ${eventFeature.name}:`, decodeError.message);
        }
      }

      // Return basic info even if we can't decode
      return {
        eventName: 'Unknown',
        decodedParams: { signature: eventSignature }
      };
    } catch (error) {
      console.warn(`Error decoding Starknet event:`, error.message);
      return null;
    }
  }

  /**
   * Get Starknet event signature
   */
  getStarknetEventSignature(event) {
    // In Starknet, the first key is typically the event selector
    return event.keys && event.keys.length > 0 ? event.keys[0] : 'unknown';
  }

  /**
   * Decode Starknet event data
   */
  decodeStarknetEventData(event, eventFeature) {
    const result = {};
    
    try {
      if (eventFeature && eventFeature.inputs) {
        // Combine keys and data for parameter extraction
        const allData = [...(event.keys || []), ...(event.data || [])];
        
        eventFeature.inputs.forEach((param, index) => {
          if (index < allData.length) {
            result[param.name || `param${index}`] = allData[index];
          }
        });
      }
    } catch (error) {
      console.warn('Error decoding Starknet event data:', error.message);
    }
    
    return result;
  }

  /**
   * Extract transaction value from Starknet transaction
   */
  extractTransactionValue(tx) {
    // Starknet doesn't have a direct value field like Ethereum
    // Value is typically in calldata for transfer operations
    try {
      if (tx.calldata && Array.isArray(tx.calldata)) {
        // Look for transfer-like patterns in calldata
        // This is simplified - in production you'd parse based on function signature
        for (const data of tx.calldata) {
          if (typeof data === 'string' && data.match(/^0x[0-9a-fA-F]+$/)) {
            const num = BigInt(data);
            if (num > 0n && num < BigInt('0xffffffffffffffffffffffffffffffff')) {
              // Convert from wei to ETH equivalent (18 decimals)
              return (Number(num) / 1e18).toString();
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting Starknet transaction value:', error.message);
    }
    
    return '0';
  }

  /**
   * Determine transaction direction relative to wallet
   */
  getTransactionDirection(walletAddress, fromAddress, toAddress) {
    const wallet = walletAddress?.toLowerCase();
    const from = fromAddress?.toLowerCase();
    const to = toAddress?.toLowerCase();

    if (from === wallet && to === wallet) {
      return 'internal';
    } else if (from === wallet) {
      return 'outgoing';
    } else if (to === wallet) {
      return 'incoming';
    }
    return 'unknown';
  }

  /**
   * Store transactions in database
   */
  async storeTransactions(transactions) {
    if (transactions.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const tx of transactions) {
        await client.query(
          `INSERT INTO wallet_transactions (
            wallet_id, chain, chain_type, transaction_hash, block_number, block_timestamp,
            from_address, to_address, value_eth, gas_used, gas_price, function_selector,
            function_name, function_category, decoded_params, transaction_status,
            is_contract_interaction, direction, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (wallet_id, chain, transaction_hash) DO NOTHING`,
          [
            tx.walletId, tx.chain, tx.chainType, tx.transactionHash, tx.blockNumber, tx.blockTimestamp,
            tx.fromAddress, tx.toAddress, tx.valueEth, tx.gasUsed, tx.gasPrice, tx.functionSelector,
            tx.functionName, tx.functionCategory, JSON.stringify(tx.decodedParams), tx.transactionStatus,
            tx.isContractInteraction, tx.direction, JSON.stringify(tx.rawData)
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to store Starknet transactions: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Store events in database
   */
  async storeEvents(events) {
    if (events.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const event of events) {
        await client.query(
          `INSERT INTO wallet_events (
            wallet_id, transaction_hash, chain, chain_type, block_number, block_timestamp,
            event_signature, event_name, contract_address, decoded_params, log_index,
            raw_topics, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (wallet_id, chain, transaction_hash, log_index) DO NOTHING`,
          [
            event.walletId, event.transactionHash, event.chain, event.chainType, event.blockNumber,
            event.blockTimestamp, event.eventSignature, event.eventName, event.contractAddress,
            JSON.stringify(event.decodedParams), event.logIndex, event.rawTopics, event.rawData
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to store Starknet events: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Record batch error for manual retry
   */
  async recordBatchError(walletId, startBlock, endBlock, errorMessage) {
    try {
      await pool.query(
        `INSERT INTO indexing_batch_errors (wallet_id, start_block, end_block, error_message, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (wallet_id, start_block, end_block) DO UPDATE SET
         error_message = $4, retry_count = indexing_batch_errors.retry_count + 1, updated_at = NOW()`,
        [walletId, startBlock, endBlock, errorMessage]
      );
    } catch (dbError) {
      console.error('Failed to record batch error:', dbError.message);
    }
  }

  /**
   * Update wallet's indexing status
   */
  async updateWalletIndexingStatus(walletId, lastIndexedBlock, totalTransactions, totalEvents) {
    await pool.query(
      `UPDATE wallets 
       SET last_indexed_block = $1, last_synced_at = NOW(), 
           total_transactions = $2, total_events = $3, updated_at = NOW()
       WHERE id = $4`,
      [lastIndexedBlock, totalTransactions, totalEvents, walletId]
    );
  }

  /**
   * Calculate blocks per second processing speed
   */
  calculateBlocksPerSecond(startBlock, currentBlock, elapsedMs) {
    if (elapsedMs <= 0) return 0;
    const blocksProcessed = currentBlock - startBlock + 1;
    return Number((blocksProcessed / (elapsedMs / 1000)).toFixed(2));
  }

  /**
   * Calculate estimated time remaining
   */
  calculateETA(currentBlock, endBlock, startTime) {
    const elapsed = Date.now() - startTime;
    const remaining = endBlock - currentBlock;
    if (elapsed <= 0 || remaining <= 0) return 0;
    
    const rate = (currentBlock - this.startBlock) / elapsed;
    return Math.round(remaining / rate / 1000); // seconds
  }

  /**
   * Stop the indexing process
   */
  stop() {
    this.shouldStop = true;
  }

  /**
   * Check if indexer is currently running
   */
  isIndexing() {
    return this.isRunning;
  }
}

// Default RPC endpoints for Starknet networks
export const DEFAULT_STARKNET_RPC_ENDPOINTS = {
  'starknet-mainnet': [
    'https://starknet-mainnet.public.blastapi.io',
    'https://rpc.starknet.lava.build',
    'https://starknet-mainnet.g.alchemy.com/v2/demo'
  ],
  'starknet-sepolia': [
    'https://starknet-sepolia.public.blastapi.io',
    'https://rpc.sepolia.starknet.lava.build',
    'https://starknet-sepolia.g.alchemy.com/v2/demo'
  ]
};

export default StarknetIndexerWorker;