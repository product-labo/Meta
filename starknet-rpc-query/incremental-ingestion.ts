import { loadConfig } from './src/utils/config';
import { logger } from './src/utils/logger';
import { Database } from './src/database/Database';
import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';

async function startIncrementalIngestion() {
  try {
    console.log('Starting incremental ingestion process...');
    
    const config = loadConfig();
    const db = new Database(config.database);
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);

    await db.connect();
    await db.runMigrations();
    
    const currentBlock = await rpc.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    
    // Get the last processed block
    const result = await db.query<{block_number: string}>(
      'SELECT MAX(block_number) as block_number FROM blocks'
    );
    const lastProcessed = result[0]?.block_number ? BigInt(result[0].block_number) : null;
    
    let startBlock: bigint;
    if (lastProcessed) {
      startBlock = lastProcessed + 1n;
      console.log(`Resuming from block ${startBlock} (last processed: ${lastProcessed})`);
    } else {
      // Start with recent 1000 blocks if no data exists
      startBlock = currentBlock - 1000n;
      console.log(`Starting fresh from block ${startBlock} (recent 1000 blocks)`);
    }
    
    const endBlock = currentBlock;
    const batchSize = 50; // Process in smaller batches
    
    console.log(`Processing blocks ${startBlock} to ${endBlock} in batches of ${batchSize}`);
    
    for (let current = startBlock; current <= endBlock; current += BigInt(batchSize)) {
      const batchEnd = current + BigInt(batchSize - 1) > endBlock ? 
        endBlock : current + BigInt(batchSize - 1);
      
      console.log(`Processing batch: blocks ${current} to ${batchEnd}`);
      
      for (let blockNum = current; blockNum <= batchEnd; blockNum++) {
        try {
          const block = await rpc.getBlock(blockNum);
          
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
          
          if (blockNum % 10n === 0n) {
            console.log(`✓ Processed block ${blockNum} (${block.transactions?.length || 0} txs)`);
          }
        } catch (error) {
          console.error(`Error processing block ${blockNum}:`, error);
        }
      }
      
      // Check current counts
      const counts = await db.query<{table_name: string, count: string}>(
        "SELECT 'blocks' as table_name, COUNT(*) as count FROM blocks UNION ALL SELECT 'transactions', COUNT(*) FROM transactions"
      );
      console.log(`Progress: ${counts[0].count} blocks, ${counts[1].count} transactions`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('Incremental ingestion completed!');
    await db.disconnect();
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

startIncrementalIngestion();
