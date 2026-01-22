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

async function fetchReceipt(txHash) {
  const cmd = `curl -s -X POST https://rpc.starknet.lava.build -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"starknet_getTransactionReceipt","params":["${txHash}"],"id":1}'`;
  const { stdout } = await execAsync(cmd);
  return JSON.parse(stdout);
}

function escapeSQL(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function escapeArray(arr) {
  if (!arr || arr.length === 0) return 'ARRAY[]::text[]';
  const escaped = arr.map(item => item.replace(/'/g, "''"));
  return `ARRAY['${escaped.join("','")}']`;
}

async function ingestBlock(blockNumber) {
  console.log(`📦 Block ${blockNumber}...`);
  
  const response = await fetchBlock(blockNumber);
  if (!response.result) return false;
  
  const block = response.result;
  
  // Insert block
  await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status, chain_id, transaction_count, event_count, is_active) VALUES (${block.block_number}, '${block.block_hash}', '${block.parent_hash}', ${block.timestamp}, '${block.status || 'ACCEPTED_ON_L2'}', 1, ${block.transactions?.length || 0}, 0, true) ON CONFLICT (block_number) DO NOTHING;"`);
  
  let txCount = 0, eventCount = 0;
  
  for (const tx of block.transactions || []) {
    // Insert transaction
    await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO transactions (tx_hash, block_number, chain_id, tx_type, sender_address, status, actual_fee, nonce, max_fee, is_active) VALUES ('${tx.transaction_hash}', ${block.block_number}, 1, '${tx.type}', ${escapeSQL(tx.sender_address)}, 'ACCEPTED_ON_L2', ${tx.actual_fee || 'NULL'}, ${tx.nonce || 'NULL'}, ${tx.max_fee || 'NULL'}, true) ON CONFLICT (tx_hash) DO NOTHING;"`);
    txCount++;
    
    // Track wallet
    if (tx.sender_address) {
      await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO starknet_wallets (address, chain_id, first_seen_block, account_type) VALUES ('${tx.sender_address}', 1, ${block.block_number}, 'wallet') ON CONFLICT (address, chain_id) DO NOTHING;"`);
    }
    
    // Fetch receipt for events (every 5th transaction to balance speed)
    if (txCount % 5 === 0) {
      try {
        const receipt = await fetchReceipt(tx.transaction_hash);
        
        if (receipt.result?.events) {
          for (let i = 0; i < receipt.result.events.length; i++) {
            const event = receipt.result.events[i];
            
            // Create contract if not exists
            await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO contract_classes (class_hash, chain_id) VALUES ('0x0', 1) ON CONFLICT DO NOTHING;"`);
            await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO contracts (contract_address, class_hash, chain_id, deployment_block) VALUES ('${event.from_address}', '0x0', 1, ${block.block_number}) ON CONFLICT DO NOTHING;"`);
            
            // Add event
            await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO events (tx_hash, contract_address, block_number, chain_id, event_index, keys, data, is_active) VALUES ('${tx.transaction_hash}', '${event.from_address}', ${block.block_number}, 1, ${i}, ${escapeArray(event.keys)}, ${escapeArray(event.data)}, true) ON CONFLICT DO NOTHING;"`);
            eventCount++;
            
            // Detect Transfer events
            if (event.keys && event.keys[0] === '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9') {
              await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO starknet_tokens (token_address, chain_id, token_type) VALUES ('${event.from_address}', 1, 'ERC20') ON CONFLICT DO NOTHING;"`);
              
              if (event.data && event.data.length >= 2) {
                const fromAddr = event.data[0] || '0x0';
                const toAddr = event.data[1] || '0x0';
                const amount = event.data[2] || '0';
                await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO starknet_token_transfers (tx_hash, event_index, chain_id, token_address, from_address, to_address, amount, block_number) VALUES ('${tx.transaction_hash}', ${i}, 1, '${event.from_address}', '${fromAddr}', '${toAddr}', ${amount}, ${block.block_number}) ON CONFLICT DO NOTHING;"`);
              }
            }
          }
        }
      } catch (e) {}
    }
  }
  
  // Update sync state
  await execAsync(`sudo -u postgres psql -d david -c "UPDATE sync_state SET last_synced_block = ${block.block_number}, last_sync_timestamp = NOW() WHERE chain_id = 1;"`);
  
  console.log(`  ✅ Txs: ${txCount}, Events: ${eventCount}`);
  return true;
}

async function continuousSync() {
  console.log('🔄 Continuous Starknet Indexer Started\n');
  
  while (true) {
    try {
      const lastSynced = await query('SELECT COALESCE(last_synced_block, 0) FROM sync_state WHERE chain_id = 1');
      const currentBlock = parseInt(lastSynced[0] || '0');
      const nextBlock = currentBlock + 1;
      
      const success = await ingestBlock(nextBlock);
      
      if (!success) {
        console.log('⏸️  Caught up, waiting 10s...');
        await new Promise(r => setTimeout(r, 10000));
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Show stats every 10 blocks
      if (nextBlock % 10 === 0) {
        const stats = await query('SELECT (SELECT COUNT(*) FROM blocks WHERE chain_id = 1), (SELECT COUNT(*) FROM transactions WHERE chain_id = 1), (SELECT COUNT(*) FROM events WHERE chain_id = 1)');
        const [blocks, txs, events] = stats[0].split('|');
        console.log(`\n📊 Stats: ${blocks} blocks, ${txs} txs, ${events} events\n`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

continuousSync();
