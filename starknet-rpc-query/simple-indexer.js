const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function query(sql) {
  const { stdout } = await execAsync(`sudo -u postgres psql -d david -t -A -c "${sql}"`);
  return stdout.trim().split('\n').filter(line => !line.includes('Warning'));
}

async function fetchBlock(blockNumber) {
  const cmd = `curl -s -X POST https://rpc.starknet.lava.build -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"starknet_getBlockWithTxs","params":[{"block_number":${blockNumber}}],"id":1}'`;
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

async function ingestBlock(blockNumber) {
  console.log(`\n📦 Block ${blockNumber}...`);
  
  const response = await fetchBlock(blockNumber);
  if (!response.result) {
    console.log(`  ❌ Failed to fetch`);
    return false;
  }
  
  const block = response.result;
  
  // Insert block
  const blockSql = `
    INSERT INTO blocks (
      block_number, block_hash, parent_block_hash, timestamp,
      finality_status, chain_id, transaction_count, event_count, is_active
    ) VALUES (
      ${block.block_number}, 
      '${block.block_hash}', 
      '${block.parent_hash}', 
      ${block.timestamp},
      '${block.status || 'ACCEPTED_ON_L2'}', 
      1, 
      ${block.transactions?.length || 0}, 
      0, 
      true
    ) ON CONFLICT (block_number) DO NOTHING;
  `;
  
  await execAsync(`sudo -u postgres psql -d david -c "${blockSql.replace(/\n/g, ' ')}"`);
  
  // Insert transactions
  let txCount = 0;
  let eventCount = 0;
  
  for (const tx of block.transactions || []) {
    const txSql = `
      INSERT INTO transactions (
        tx_hash, block_number, chain_id, tx_type, sender_address,
        status, actual_fee, nonce, max_fee, is_active
      ) VALUES (
        '${tx.transaction_hash}',
        ${block.block_number},
        1,
        '${tx.type}',
        ${tx.sender_address ? `'${tx.sender_address}'` : 'NULL'},
        'ACCEPTED_ON_L2',
        ${tx.actual_fee || 'NULL'},
        ${tx.nonce || 'NULL'},
        ${tx.max_fee || 'NULL'},
        true
      ) ON CONFLICT (tx_hash) DO NOTHING;
    `;
    
    try {
      await execAsync(`sudo -u postgres psql -d david -c "${txSql.replace(/\n/g, ' ')}"`);
      txCount++;
      
      // Fetch receipt for events
      const receiptCmd = `curl -s -X POST https://rpc.starknet.lava.build -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"starknet_getTransactionReceipt","params":["${tx.transaction_hash}"],"id":1}'`;
      const { stdout: receiptData } = await execAsync(receiptCmd);
      const receipt = JSON.parse(receiptData);
      
      if (receipt.result?.events) {
        for (let i = 0; i < receipt.result.events.length; i++) {
          const event = receipt.result.events[i];
          const keys = event.keys ? `ARRAY['${event.keys.join("','")}']` : 'ARRAY[]::text[]';
          const data = event.data ? `ARRAY['${event.data.join("','")}']` : 'ARRAY[]::text[]';
          
          const eventSql = `
            INSERT INTO events (
              tx_hash, contract_address, block_number, chain_id,
              event_index, keys, data, is_active
            ) VALUES (
              '${tx.transaction_hash}',
              '${event.from_address}',
              ${block.block_number},
              1,
              ${i},
              ${keys},
              ${data},
              true
            ) ON CONFLICT DO NOTHING;
          `;
          
          try {
            await execAsync(`sudo -u postgres psql -d david -c "${eventSql.replace(/\n/g, ' ')}"`);
            eventCount++;
          } catch (e) {
            // Skip on error
          }
        }
      }
    } catch (e) {
      // Skip on error
    }
  }
  
  // Update block event count
  await execAsync(`sudo -u postgres psql -d david -c "UPDATE blocks SET event_count = ${eventCount} WHERE block_number = ${block.block_number} AND chain_id = 1;"`);
  
  // Update sync state
  await execAsync(`sudo -u postgres psql -d david -c "UPDATE sync_state SET last_synced_block = ${block.block_number}, last_sync_timestamp = NOW() WHERE chain_id = 1;"`);
  
  console.log(`  ✅ Hash: ${block.block_hash.substring(0, 20)}...`);
  console.log(`  ✅ Txs: ${txCount}/${block.transactions?.length || 0}`);
  console.log(`  ✅ Events: ${eventCount}`);
  
  return true;
}

async function start() {
  console.log('🚀 Starknet Indexer Starting\n');
  
  // Get last synced
  const lastSynced = await query('SELECT COALESCE(last_synced_block, 0) FROM sync_state WHERE chain_id = 1');
  const startBlock = parseInt(lastSynced[0] || '0');
  
  console.log(`📊 Starting from block: ${startBlock}`);
  console.log(`📥 Syncing 2 blocks...\n`);
  
  // Sync 2 blocks
  for (let i = 1; i <= 2; i++) {
    await ingestBlock(startBlock + i);
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }
  
  // Stats
  const blocks = await query('SELECT COUNT(*) FROM blocks WHERE chain_id = 1');
  const txs = await query('SELECT COUNT(*) FROM transactions WHERE chain_id = 1');
  
  console.log('\n================================');
  console.log('📊 Stats:');
  console.log(`   Blocks: ${blocks[0]}`);
  console.log(`   Transactions: ${txs[0]}`);
  console.log('================================\n');
}

start().catch(console.error);
