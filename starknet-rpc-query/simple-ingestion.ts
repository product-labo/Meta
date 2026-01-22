import { loadConfig } from './src/utils/config';
import { logger } from './src/utils/logger';
import { Database } from './src/database/Database';
import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';

async function startIngestion() {
  try {
    console.log('Starting ingestion process...');
    
    const config = loadConfig();
    const db = new Database(config.database);
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);

    await db.connect();
    await db.runMigrations();
    
    const currentBlock = await rpc.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    
    // Start with just a few recent blocks
    const startBlock = currentBlock - 10n;
    console.log(`Processing blocks ${startBlock} to ${currentBlock}`);
    
    for (let blockNum = startBlock; blockNum <= currentBlock; blockNum++) {
      try {
        console.log(`Processing block ${blockNum}...`);
        const block = await rpc.getBlock(blockNum);
        console.log(`Block ${blockNum} has ${block.transactions?.length || 0} transactions`);
        
        await db.transaction(async (client) => {
          await client.query(`
            INSERT INTO blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (block_number) DO NOTHING
          `, [
            block.block_number,
            block.block_hash,
            block.parent_hash,
            block.timestamp,
            'ACCEPTED_ON_L2'
          ]);
          
          if (block.transactions) {
            for (const tx of block.transactions) {
              await client.query(`
                INSERT INTO transactions (tx_hash, block_number, tx_type, sender_address, status)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (tx_hash) DO NOTHING
              `, [
                tx.transaction_hash,
                block.block_number,
                tx.type,
                tx.sender_address || null,
                'ACCEPTED_ON_L2'
              ]);
            }
          }
        });
        
        console.log(`✓ Block ${blockNum} processed successfully`);
      } catch (error) {
        console.error(`Error processing block ${blockNum}:`, error);
      }
    }
    
    console.log('Ingestion completed!');
    await db.disconnect();
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

startIngestion();
