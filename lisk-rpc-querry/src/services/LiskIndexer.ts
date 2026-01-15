import { rpcClient } from '../rpc/LiskRPCClient';
import {
  insertChainConfig,
  initializeSyncState,
  updateSyncState,
  getSyncState,
  insertBlock,
  upsertAccount,
  insertTransaction,
  insertEvent,
  linkTransactionAccount,
  insertStateSnapshot,
  insertStateDelta,
  upsertTokenBalance,
  insertTokenLock,
  storeRawRPCResponse
} from '../repositories';
import { ReorgHandler } from './ReorgHandler';
import { stateComputer } from './StateComputer';
import dotenv from 'dotenv';

dotenv.config();

const CHAIN_ID = parseInt(process.env.CHAIN_ID || '1');
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000');

export class LiskIndexer {
  private chainId: number;
  private isRunning: boolean = false;
  private reorgHandler: ReorgHandler;

  constructor(chainId: number = CHAIN_ID) {
    this.chainId = chainId;
    this.reorgHandler = new ReorgHandler(chainId);
  }

  async initialize(): Promise<void> {
    console.log('Initializing Lisk Indexer...');
    
    // Insert chain config
    await insertChainConfig({
      chain_id: this.chainId,
      chain_name: process.env.CHAIN_NAME || 'lisk-mainnet',
      rpc_url: process.env.LISK_MAINNET_RPC || 'https://rpc.api.lisk.com',
      start_block: parseInt(process.env.START_BLOCK || '0'),
      finality_depth: parseInt(process.env.FINALITY_DEPTH || '12'),
      reorg_depth: parseInt(process.env.REORG_DEPTH || '64')
    });

    // Initialize sync state
    await initializeSyncState(this.chainId);
    
    console.log('Indexer initialized successfully');
  }

  async indexBlock(blockNumber: number): Promise<void> {
    console.log(`Indexing block ${blockNumber}...`);
    
    const block = await rpcClient.getBlockByNumber(blockNumber, true);
    
    if (!block) {
      console.log(`Block ${blockNumber} not found`);
      return;
    }

    // Store raw RPC response
    await storeRawRPCResponse('eth_getBlockByNumber', block, blockNumber);

    // Insert block
    await insertBlock({
      block_id: block.hash,
      chain_id: this.chainId,
      height: parseInt(block.number, 16),
      timestamp: parseInt(block.timestamp, 16),
      previous_block_id: block.parentHash,
      generator_address: block.miner || block.author || '0x0',
      transaction_root: block.transactionsRoot,
      state_root: block.stateRoot,
      asset_root: block.receiptsRoot,
      payload_length: block.size ? parseInt(block.size, 16) : 0
    });

    // Process transactions
    if (block.transactions && Array.isArray(block.transactions)) {
      for (const tx of block.transactions) {
        if (typeof tx === 'object') {
          await this.indexTransaction(tx, block);
        }
      }
    }

    // Update sync state
    await updateSyncState(this.chainId, blockNumber);
    
    console.log(`Block ${blockNumber} indexed successfully`);
  }

  async indexTransaction(tx: any, block: any): Promise<void> {
    const blockHeight = parseInt(block.number, 16);
    
    // Ensure sender account exists
    await upsertAccount({
      address: tx.from,
      chain_id: this.chainId,
      first_seen_height: blockHeight,
      last_seen_height: blockHeight
    });

    // Ensure receiver account exists (if present)
    if (tx.to) {
      await upsertAccount({
        address: tx.to,
        chain_id: this.chainId,
        first_seen_height: blockHeight,
        last_seen_height: blockHeight
      });
    }

    // Parse module and command from input data
    const { module, command } = this.parseModuleCommand(tx.input);
    const value = tx.value ? parseInt(tx.value, 16) : 0;

    // Insert transaction
    await insertTransaction({
      tx_id: tx.hash,
      chain_id: this.chainId,
      block_id: block.hash,
      block_height: blockHeight,
      module,
      command,
      sender_address: tx.from,
      nonce: parseInt(tx.nonce, 16),
      fee: parseInt(tx.gas, 16) * parseInt(tx.gasPrice || '0', 16),
      params: { input: tx.input, to: tx.to, value: tx.value },
      signatures: { v: tx.v, r: tx.r, s: tx.s },
      execution_status: 'pending'
    });

    // Link transaction to accounts
    await linkTransactionAccount(tx.hash, tx.from, 'sender');
    if (tx.to) {
      await linkTransactionAccount(tx.hash, tx.to, 'receiver');
    }

    // Get receipt for status and events
    try {
      const receipt = await rpcClient.getTransactionReceipt(tx.hash);
      if (receipt) {
        // Store raw receipt
        await storeRawRPCResponse('eth_getTransactionReceipt', receipt, blockHeight, tx.hash);

        // Process logs as events
        if (receipt.logs && Array.isArray(receipt.logs)) {
          for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
            await insertEvent({
              tx_id: tx.hash,
              block_id: block.hash,
              block_height: blockHeight,
              event_index: i,
              module: 'evm',
              name: 'Log',
              data: { data: log.data, address: log.address },
              topics: log.topics
            });
          }
        }

        // Update token balances for transfers
        if (module === 'token' && command === 'transfer' && tx.to && value > 0) {
          // Update sender balance (decrease)
          await this.updateTokenBalance(tx.from, '0x0000000000000000', -value, blockHeight);
          
          // Update receiver balance (increase)
          await this.updateTokenBalance(tx.to, '0x0000000000000000', value, blockHeight);

          // Record state deltas
          await insertStateDelta({
            tx_id: tx.hash,
            address: tx.from,
            block_height: blockHeight,
            module: 'token',
            field_path: 'balance',
            old_value: null,
            new_value: { change: -value }
          });

          await insertStateDelta({
            tx_id: tx.hash,
            address: tx.to,
            block_height: blockHeight,
            module: 'token',
            field_path: 'balance',
            old_value: null,
            new_value: { change: value }
          });
        }
      }
    } catch (error) {
      console.error(`Error getting receipt for ${tx.hash}:`, error);
    }
  }

  private async updateTokenBalance(
    address: string,
    token_id: string,
    change: number,
    block_height: number
  ): Promise<void> {
    // This is a simplified version - in production, fetch actual balance from chain
    await upsertTokenBalance({
      address,
      token_id,
      available_balance: Math.max(0, change), // Simplified
      locked_balance: 0,
      last_updated_height: block_height
    });
  }

  private parseModuleCommand(input: string): { module: string; command: string } {
    // Default to token.transfer for simple transfers
    if (!input || input === '0x') {
      return { module: 'token', command: 'transfer' };
    }
    
    // Extract function selector (first 4 bytes)
    const selector = input.slice(0, 10);
    
    // Map common selectors to module.command
    const selectorMap: Record<string, { module: string; command: string }> = {
      '0xa9059cbb': { module: 'token', command: 'transfer' },
      '0x095ea7b3': { module: 'token', command: 'approve' },
      '0x23b872dd': { module: 'token', command: 'transferFrom' },
    };
    
    return selectorMap[selector] || { module: 'unknown', command: 'unknown' };
  }

  async start(): Promise<void> {
    await this.initialize();
    this.isRunning = true;

    console.log('Starting indexer...');

    while (this.isRunning) {
      try {
        const syncState = await getSyncState(this.chainId);
        const currentHeight = syncState?.last_synced_height || 0;
        const latestBlock = await rpcClient.getBlockNumber();

        console.log(`Current height: ${currentHeight}, Latest: ${latestBlock}`);

        if (currentHeight < latestBlock) {
          const endHeight = Math.min(currentHeight + BATCH_SIZE, latestBlock);
          
          console.log(`Indexing blocks ${currentHeight + 1} to ${endHeight}...`);
          
          for (let height = currentHeight + 1; height <= endHeight; height++) {
            await this.indexBlock(height);
          }
        } else {
          console.log('Caught up, waiting for new blocks...');
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
      } catch (error) {
        console.error('Indexer error:', error);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log('Stopping indexer...');
  }
}
