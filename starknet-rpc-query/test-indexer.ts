import { Pool } from 'pg';
import { RpcProvider } from 'starknet';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'david',
  user: 'postgres'
});

const provider = new RpcProvider({ 
  nodeUrl: 'https://starknet-rpc.publicnode.com' 
});

const CHAIN_ID = 1; // Starknet Mainnet

async function ingestBlock(blockNumber: number) {
  console.log(`\n📦 Processing block ${blockNumber}...`);
  
  try {
    // Fetch block with transactions
    const block = await provider.getBlockWithTxs(blockNumber);
    
    // Insert block
    await pool.query(`
      INSERT INTO blocks (
        block_number, block_hash, parent_block_hash, timestamp,
        finality_status, chain_id, sequencer_address, 
        transaction_count, event_count, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (block_number) DO NOTHING
    `, [
      block.block_number,
      block.block_hash,
      block.parent_hash,
      block.timestamp,
      block.status || 'ACCEPTED_ON_L2',
      CHAIN_ID,
      block.sequencer_address || null,
      block.transactions?.length || 0,
      0, // Will count events later
      true
    ]);
    
    console.log(`  ✅ Block inserted: ${block.block_hash}`);
    
    // Process transactions
    let totalEvents = 0;
    for (const tx of block.transactions || []) {
      const txData: any = tx; // Type assertion for flexibility
      
      // Insert transaction
      await pool.query(`
        INSERT INTO transactions (
          tx_hash, block_number, chain_id, tx_type, sender_address,
          status, actual_fee, nonce, max_fee, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tx_hash) DO NOTHING
      `, [
        txData.transaction_hash,
        block.block_number,
        CHAIN_ID,
        txData.type,
        txData.sender_address || null,
        'ACCEPTED_ON_L2',
        txData.actual_fee || null,
        txData.nonce || null,
        txData.max_fee || null,
        true
      ]);
      
      // Fetch transaction receipt for events
      try {
        const receipt: any = await provider.getTransactionReceipt(txData.transaction_hash);
        
        if (receipt.events && Array.isArray(receipt.events)) {
          for (let i = 0; i < receipt.events.length; i++) {
            const event = receipt.events[i];
            
            await pool.query(`
              INSERT INTO events (
                tx_hash, contract_address, block_number, chain_id,
                event_index, keys, data, is_active
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT DO NOTHING
            `, [
              tx.transaction_hash,
              event.from_address,
              block.block_number,
              CHAIN_ID,
              i,
              event.keys || [],
              event.data || [],
              true
            ]);
            
            totalEvents++;
          }
        }
      } catch (e) {
        console.log(`    ⚠️  Could not fetch receipt for ${tx.transaction_hash}`);
      }
    }
    
    // Update block event count
    await pool.query(`
      UPDATE blocks SET event_count = $1 
      WHERE block_number = $2 AND chain_id = $3
    `, [totalEvents, block.block_number, CHAIN_ID]);
    
    // Update sync state
    await pool.query(`
      UPDATE sync_state 
      SET last_synced_block = $1, 
          last_sync_timestamp = NOW(),
          sync_status = 'syncing'
      WHERE chain_id = $2
    `, [block.block_number, CHAIN_ID]);
    
    console.log(`  ✅ Transactions: ${block.transactions?.length || 0}`);
    console.log(`  ✅ Events: ${totalEvents}`);
    
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error processing block ${blockNumber}:`, error.message);
    return false;
  }
}

async function startIndexing() {
  console.log('🚀 Starting Starknet Indexer');
  console.log('================================\n');
  
  // Get current sync state
  const syncState = await pool.query(
    'SELECT last_synced_block FROM sync_state WHERE chain_id = $1',
    [CHAIN_ID]
  );
  
  let startBlock = parseInt(syncState.rows[0]?.last_synced_block || '0');
  
  // Get latest block from chain
  const latestBlock = await provider.getBlockNumber();
  
  console.log(`📊 Current state:`);
  console.log(`   Last synced: ${startBlock}`);
  console.log(`   Latest block: ${latestBlock}`);
  console.log(`   Blocks behind: ${latestBlock - startBlock}\n`);
  
  // Sync 10 blocks for testing
  const blocksToSync = Math.min(10, latestBlock - startBlock);
  
  console.log(`📥 Syncing ${blocksToSync} blocks...\n`);
  
  for (let i = 0; i < blocksToSync; i++) {
    const blockNum = startBlock + i + 1;
    const success = await ingestBlock(blockNum);
    
    if (!success) {
      console.log('\n⚠️  Stopping due to error');
      break;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Final stats
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM blocks WHERE chain_id = $1) as blocks,
      (SELECT COUNT(*) FROM transactions WHERE chain_id = $1) as transactions,
      (SELECT COUNT(*) FROM events WHERE chain_id = $1) as events
  `, [CHAIN_ID]);
  
  console.log('\n================================');
  console.log('📊 Database Stats:');
  console.log(`   Blocks: ${stats.rows[0].blocks}`);
  console.log(`   Transactions: ${stats.rows[0].transactions}`);
  console.log(`   Events: ${stats.rows[0].events}`);
  console.log('================================\n');
  
  await pool.end();
}

startIndexing().catch(console.error);
