import 'dotenv/config';
import { RpcClient } from './rpc/client';
import { DatabaseManager } from './database/manager';
import { logger } from './utils/logger';

async function processCurrentBlock() {
  const rpc = new RpcClient();
  const db = new DatabaseManager();
  
  try {
    // Get current block
    const currentBlockNum = await rpc.getCurrentBlockNumber();
    logger.info(`Current blockchain block: ${currentBlockNum}`);
    
    // Get latest block data
    const blockData = await rpc.getBlockByNumber('latest', true);
    const blockNumber = parseInt(blockData.number, 16);
    
    logger.info(`Processing block ${blockNumber} with ${blockData.transactions?.length || 0} transactions`);
    
    // Store block
    await db.query(`
      INSERT INTO lisk_blocks (
        block_number, chain_id, block_hash, parent_hash, timestamp,
        gas_limit, gas_used, miner, transaction_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (block_number) DO UPDATE SET
        block_hash = EXCLUDED.block_hash,
        gas_used = EXCLUDED.gas_used,
        transaction_count = EXCLUDED.transaction_count
    `, [
      blockNumber,
      1135,
      blockData.hash,
      blockData.parentHash,
      parseInt(blockData.timestamp, 16),
      parseInt(blockData.gasLimit, 16),
      parseInt(blockData.gasUsed, 16),
      blockData.miner,
      blockData.transactions?.length || 0
    ]);
    
    // Process transactions
    if (blockData.transactions && blockData.transactions.length > 0) {
      for (const tx of blockData.transactions) {
        await db.query(`
          INSERT INTO lisk_transactions (
            tx_hash, block_number, transaction_index, from_address, to_address,
            value, gas_limit, gas_price, nonce, input_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (tx_hash) DO NOTHING
        `, [
          tx.hash,
          blockNumber,
          parseInt(tx.transactionIndex, 16),
          tx.from,
          tx.to,
          tx.value || '0',
          parseInt(tx.gas, 16),
          parseInt(tx.gasPrice || '0', 16),
          parseInt(tx.nonce, 16),
          tx.input
        ]);
      }
    }
    
    logger.info(`✅ Block ${blockNumber} processed successfully`);
    
  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await db.close();
  }
}

processCurrentBlock();
