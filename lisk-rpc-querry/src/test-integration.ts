import 'dotenv/config';
import { DatabaseManager } from './database/manager';
import { RpcClient } from './rpc/client';
import { logger } from './utils/logger';

async function testLiskIntegration() {
  try {
    // Test RPC
    const rpc = new RpcClient();
    logger.info(`RPC endpoints: ${rpc.getAllRpcUrls().length} available`);
    
    const currentBlock = await rpc.getCurrentBlockNumber();
    logger.info(`✅ Current Lisk block: ${currentBlock}`);
    
    // Test Database
    const db = new DatabaseManager(); // Use env vars instead of DATABASE_URL
    
    // Initialize Lisk chain config
    await db.initializeChainConfig(1135, 'Lisk Mainnet', rpc.getCurrentRpcUrl());
    logger.info('✅ Lisk chain config initialized');
    
    // Test inserting a block record
    await db.query(`
      INSERT INTO lisk_blocks (block_number, chain_id, block_hash, parent_hash, timestamp, gas_limit, gas_used)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (block_number) DO NOTHING
    `, [currentBlock, 1135, '0xtest', '0xparent', Date.now(), 30000000, 15000000]);
    
    logger.info('✅ Test block inserted into lisk_blocks table');
    
    // Verify data
    const result = await db.query('SELECT COUNT(*) FROM lisk_blocks');
    logger.info(`✅ Lisk blocks count: ${result.rows[0].count}`);
    
    await db.close();
    logger.info('✅ Integration test completed successfully');
    
  } catch (error) {
    logger.error('❌ Integration test failed:', error);
  }
}

testLiskIntegration();
