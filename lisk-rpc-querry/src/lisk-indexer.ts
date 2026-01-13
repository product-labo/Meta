import 'dotenv/config';
import { DatabaseManager } from './database/manager';
import { RpcClient } from './rpc/client';
import { SyncStateManager } from './pipeline/sync-state';
import { logger } from './utils/logger';

export class LiskIndexer {
  private db: DatabaseManager;
  private rpc: RpcClient;
  private syncState: SyncStateManager;
  private chainId = 1135; // Lisk Mainnet

  constructor() {
    this.db = new DatabaseManager();
    this.rpc = new RpcClient();
    this.syncState = new SyncStateManager(this.db);
  }

  async start(maxBlocks: number = 50): Promise<void> {
    logger.info('🚀 Starting Lisk Indexer...');
    
    // Initialize chain config
    await this.db.initializeChainConfig(
      this.chainId, 
      'Lisk Mainnet', 
      this.rpc.getCurrentRpcUrl()
    );

    // Get current blockchain state
    const currentBlock = await this.rpc.getCurrentBlockNumber();
    const lastSynced = await this.syncState.getLastSynced(this.chainId);
    
    logger.info(`Current blockchain block: ${currentBlock}`);
    logger.info(`Last synced block: ${lastSynced}`);
    
    // Start syncing from where we left off (limit to maxBlocks)
    const startBlock = lastSynced === 0 ? currentBlock - 10 : parseInt(lastSynced.toString()) + 1;
    const endBlock = Math.min(startBlock + maxBlocks - 1, currentBlock);
    
    logger.info(`Syncing blocks ${startBlock} to ${endBlock} (last synced: ${lastSynced})`);
    
    if (startBlock > endBlock) {
      logger.info('No new blocks to sync');
      return;
    }
    
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      await this.processBlock(blockNumber);
      
      // Small delay to avoid overwhelming the RPC
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logger.info('✅ Sync completed');
  }

  private async processBlock(blockNumber: number): Promise<void> {
    try {
      logger.info(`📦 Processing block ${blockNumber}`);
      
      // 1. Fetch block data from RPC using specific block number
      const blockData = await this.rpc.getBlockByNumber(blockNumber, true);
      
      // 2. Store block in database
      await this.storeBlock(blockData);
      
      // 3. Process transactions in the block
      if (blockData.transactions && blockData.transactions.length > 0) {
        for (const tx of blockData.transactions) {
          await this.processTransaction(tx, parseInt(blockData.number, 16));
        }
      }
      
      // 4. Update sync state
      await this.syncState.updateLastSynced(parseInt(blockData.number, 16), this.chainId);
      
      logger.info(`✅ Block ${parseInt(blockData.number, 16)} processed (${blockData.transactions?.length || 0} txs)`);
      
    } catch (error) {
      logger.error(`❌ Failed to process block ${blockNumber}:`, error);
      throw error;
    }
  }

  private async storeBlock(blockData: any): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_blocks (
        block_number, chain_id, block_hash, parent_hash, timestamp,
        gas_limit, gas_used, miner, transaction_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (block_number) DO NOTHING
    `, [
      parseInt(blockData.number, 16),
      this.chainId,
      blockData.hash,
      blockData.parentHash,
      parseInt(blockData.timestamp, 16),
      parseInt(blockData.gasLimit, 16),
      parseInt(blockData.gasUsed, 16),
      blockData.miner,
      blockData.transactions?.length || 0
    ]);
  }

  private async processTransaction(txData: any, blockNumber: number): Promise<void> {
    // Store transaction
    await this.db.query(`
      INSERT INTO lisk_transactions (
        tx_hash, block_number, transaction_index, from_address, to_address,
        value, gas_limit, gas_price, nonce, input_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (tx_hash) DO NOTHING
    `, [
      txData.hash,
      blockNumber,
      parseInt(txData.transactionIndex, 16),
      txData.from,
      txData.to,
      txData.value || '0',
      parseInt(txData.gas, 16),
      parseInt(txData.gasPrice || '0', 16),
      parseInt(txData.nonce, 16),
      txData.input
    ]);

    // Track wallets
    await this.trackWallet(txData.from, blockNumber);
    if (txData.to) await this.trackWallet(txData.to, blockNumber);

    // Check if transaction is to a contract (has input data)
    if (txData.to && txData.input && txData.input !== '0x') {
      await this.detectAndStoreContract(txData.to, txData.hash, blockNumber);
      
      // Extract function signature (first 4 bytes of input)
      const functionSelector = txData.input.slice(0, 10);
      await this.trackWalletInteraction(txData.from, txData.to, txData.hash, blockNumber, 'CONTRACT_CALL', functionSelector);
    }
    
    // Track contract deployment
    if (!txData.to) {
      await this.trackWalletInteraction(txData.from, null, txData.hash, blockNumber, 'CONTRACT_DEPLOY');
    }

    // Get transaction receipt for additional data
    try {
      const receipt = await this.rpc.getTransactionReceipt(txData.hash);
      await this.storeTransactionReceipt(receipt);
      
      // Process logs from receipt
      if (receipt.logs && receipt.logs.length > 0) {
        await this.processLogs(receipt.logs, txData.hash, blockNumber);
      }
      
      // Check for contract deployment in receipt
      if (receipt.contractAddress) {
        await this.storeContract(receipt.contractAddress, txData.from, txData.hash, blockNumber);
      }

      // Process execution trace for complex transactions (disabled due to RPC limitations)
      // if (txData.to && txData.input && txData.input !== '0x') {
      //   await this.processExecutionTrace(txData.hash);
      // }
    } catch (error) {
      logger.warn(`Could not get receipt for tx ${txData.hash}`);
    }
  }

  private async storeTransactionReceipt(receiptData: any): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_transaction_receipts (
        tx_hash, status, gas_used, cumulative_gas_used, contract_address
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tx_hash) DO NOTHING
    `, [
      receiptData.transactionHash,
      parseInt(receiptData.status, 16),
      parseInt(receiptData.gasUsed, 16),
      parseInt(receiptData.cumulativeGasUsed, 16),
      receiptData.contractAddress
    ]);
  }

  private async trackWallet(address: string, blockNumber: number): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_wallets (address, first_seen_block)
      VALUES ($1, $2)
      ON CONFLICT (address) DO NOTHING
    `, [address, blockNumber]);
  }

  private async trackWalletInteraction(walletAddress: string, contractAddress: string | null, txHash: string, blockNumber: number, interactionType: string, functionSelector?: string): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_wallet_interactions (
        wallet_address, contract_address, function_selector, tx_hash, block_number, interaction_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (wallet_address, tx_hash, interaction_type) DO NOTHING
    `, [walletAddress, contractAddress, functionSelector || null, txHash, blockNumber, interactionType]);
  }

  private async detectAndStoreContract(contractAddress: string, txHash: string, blockNumber: number): Promise<void> {
    // Check if we already know about this contract
    const existing = await this.db.query(`
      SELECT contract_address FROM lisk_contracts WHERE contract_address = $1
    `, [contractAddress]);

    if (existing.rows.length === 0) {
      // Get contract code to verify it's actually a contract
      try {
        const code = await this.rpc.getCode(contractAddress);
        if (code && code !== '0x') {
          // It's a contract, store it
          await this.db.query(`
            INSERT INTO lisk_contracts (
              contract_address, chain_id, deployer_address, deployment_tx_hash, deployment_block_number
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (contract_address) DO NOTHING
          `, [contractAddress, this.chainId, 'unknown', txHash, blockNumber]);
          
          logger.info(`📋 Discovered contract: ${contractAddress}`);
        }
      } catch (error) {
        logger.warn(`Could not verify contract ${contractAddress}: ${error}`);
      }
    }
  }

  private async processLogs(logs: any[], txHash: string, blockNumber: number): Promise<void> {
    for (const log of logs) {
      await this.db.query(`
        INSERT INTO lisk_logs (
          tx_hash, block_number, log_index, contract_address,
          topic0, topic1, topic2, topic3, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tx_hash, log_index) DO NOTHING
      `, [
        txHash,
        blockNumber,
        parseInt(log.logIndex, 16),
        log.address,
        log.topics[0] || null,
        log.topics[1] || null,
        log.topics[2] || null,
        log.topics[3] || null,
        log.data
      ]);
    }
  }

  private async storeContract(contractAddress: string, deployer: string, txHash: string, blockNumber: number): Promise<void> {
    await this.db.query(`
      INSERT INTO lisk_contracts (
        contract_address, chain_id, deployer_address, deployment_tx_hash, deployment_block_number
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (contract_address) DO NOTHING
    `, [contractAddress, this.chainId, deployer, txHash, blockNumber]);
  }

  private async processExecutionTrace(txHash: string): Promise<void> {
    try {
      const trace = await this.rpc.debugTraceTransaction(txHash);
      if (trace && trace.calls) {
        await this.storeExecutionCalls(trace, txHash, null, 0);
      }
    } catch (error) {
      logger.warn(`Could not get trace for tx ${txHash}: ${error}`);
    }
  }

  private async storeExecutionCalls(call: any, txHash: string, parentCallId: number | null, depth: number): Promise<number> {
    const result = await this.db.query(`
      INSERT INTO lisk_execution_calls (
        tx_hash, parent_call_id, call_depth, call_type, from_address, to_address,
        value, gas_limit, gas_used, input_data, output_data, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING call_id
    `, [
      txHash,
      parentCallId,
      depth,
      call.type || 'CALL',
      call.from,
      call.to,
      call.value || '0',
      parseInt(call.gas || '0', 16),
      parseInt(call.gasUsed || '0', 16),
      call.input,
      call.output,
      call.error
    ]);

    const callId = result.rows[0].call_id;

    // Process nested calls
    if (call.calls && call.calls.length > 0) {
      for (const nestedCall of call.calls) {
        await this.storeExecutionCalls(nestedCall, txHash, callId, depth + 1);
      }
    }

    return callId;
  }

  async stop(): Promise<void> {
    await this.db.close();
    logger.info('🛑 Lisk Indexer stopped');
  }
}

// CLI usage
if (require.main === module) {
  const indexer = new LiskIndexer();
  
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await indexer.stop();
    process.exit(0);
  });
  
  indexer.start().catch(error => {
    logger.error('Indexer failed:', error);
    process.exit(1);
  });
}
