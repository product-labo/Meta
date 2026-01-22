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
  return `ARRAY['${arr.join("','")}']`;
}

async function ingestBlock(blockNumber, fetchEvents = false) {
  console.log(`\n📦 Block ${blockNumber}...`);
  
  const response = await fetchBlock(blockNumber);
  if (!response.result) {
    console.log(`  ❌ Failed`);
    return false;
  }
  
  const block = response.result;
  
  // Insert block
  await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status, chain_id, transaction_count, event_count, is_active) VALUES (${block.block_number}, '${block.block_hash}', '${block.parent_hash}', ${block.timestamp}, '${block.status || 'ACCEPTED_ON_L2'}', 1, ${block.transactions?.length || 0}, 0, true) ON CONFLICT (block_number) DO NOTHING;"`);
  
  let txCount = 0, walletCount = 0, contractCount = 0, eventCount = 0, callCount = 0;
  
  for (const tx of block.transactions || []) {
    // Insert transaction
    await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO transactions (tx_hash, block_number, chain_id, tx_type, sender_address, status, actual_fee, nonce, max_fee, is_active) VALUES ('${tx.transaction_hash}', ${block.block_number}, 1, '${tx.type}', ${escapeSQL(tx.sender_address)}, 'ACCEPTED_ON_L2', ${tx.actual_fee || 'NULL'}, ${tx.nonce || 'NULL'}, ${tx.max_fee || 'NULL'}, true) ON CONFLICT (tx_hash) DO NOTHING;"`);
    txCount++;
    
    // Track wallet
    if (tx.sender_address) {
      await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO starknet_wallets (address, chain_id, first_seen_block, account_type) VALUES ('${tx.sender_address}', 1, ${block.block_number}, 'wallet') ON CONFLICT (address, chain_id) DO NOTHING;"`);
      walletCount++;
    }
    
    // Detect contract deployment
    if (tx.type === 'DEPLOY_ACCOUNT' && tx.contract_address) {
      await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO contracts (contract_address, class_hash, chain_id, deployer_address, deployment_tx_hash, deployment_block) VALUES ('${tx.contract_address}', ${escapeSQL(tx.class_hash)}, 1, ${escapeSQL(tx.sender_address)}, '${tx.transaction_hash}', ${block.block_number}) ON CONFLICT (contract_address, chain_id) DO NOTHING;"`);
      contractCount++;
      
      if (tx.class_hash) {
        await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO contract_classes (class_hash, chain_id, declared_tx_hash, declared_block) VALUES ('${tx.class_hash}', 1, '${tx.transaction_hash}', ${block.block_number}) ON CONFLICT (class_hash, chain_id) DO NOTHING;"`);
      }
    }
    
    // Fetch events if enabled
    if (fetchEvents) {
      try {
        const receipt = await fetchReceipt(tx.transaction_hash);
        
        if (receipt.result?.events) {
          for (let i = 0; i < receipt.result.events.length; i++) {
            const event = receipt.result.events[i];
            
            await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO events (tx_hash, contract_address, block_number, chain_id, event_index, keys, data, is_active) VALUES ('${tx.transaction_hash}', '${event.from_address}', ${block.block_number}, 1, ${i}, ${escapeArray(event.keys)}, ${escapeArray(event.data)}, true) ON CONFLICT DO NOTHING;"`);
            eventCount++;
            
            // Detect Transfer events (key[0] = Transfer selector)
            if (event.keys && event.keys[0] === '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9') {
              // This is a token transfer
              const tokenAddr = event.from_address;
              
              // Add token if not exists
              await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO starknet_tokens (token_address, chain_id, token_type) VALUES ('${tokenAddr}', 1, 'ERC20') ON CONFLICT DO NOTHING;"`);
              
              // Add transfer
              if (event.data && event.data.length >= 2) {
                const fromAddr = event.data[0] || '0x0';
                const toAddr = event.data[1] || '0x0';
                const amount = event.data[2] || '0';
                
                await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO starknet_token_transfers (tx_hash, event_index, chain_id, token_address, from_address, to_address, amount, block_number) VALUES ('${tx.transaction_hash}', ${i}, 1, '${tokenAddr}', '${fromAddr}', '${toAddr}', ${amount}, ${block.block_number}) ON CONFLICT DO NOTHING;"`);
              }
            }
          }
        }
        
        // Track execution
        if (receipt.result?.execution_status) {
          await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO execution_calls (tx_hash, contract_address, chain_id, entry_point_selector, call_status) VALUES ('${tx.transaction_hash}', ${escapeSQL(receipt.result.contract_address)}, 1, ${escapeSQL(tx.entry_point_selector)}, '${receipt.result.execution_status}') ON CONFLICT DO NOTHING;"`);
          callCount++;
        }
      } catch (e) {
        // Skip on error
      }
    }
  }
  
  // Update block event count
  if (fetchEvents) {
    await execAsync(`sudo -u postgres psql -d david -c "UPDATE blocks SET event_count = ${eventCount} WHERE block_number = ${block.block_number} AND chain_id = 1;"`);
  }
  
  // Update sync state
  await execAsync(`sudo -u postgres psql -d david -c "UPDATE sync_state SET last_synced_block = ${block.block_number}, last_sync_timestamp = NOW() WHERE chain_id = 1;"`);
  
  if (fetchEvents) {
    console.log(`  ✅ Txs: ${txCount}, Wallets: ${walletCount}, Contracts: ${contractCount}, Events: ${eventCount}`);
  } else {
    console.log(`  ✅ Txs: ${txCount}, Wallets: ${walletCount}, Contracts: ${contractCount}`);
  }
  
  return true;
}

async function start() {
  console.log('🚀 Complete Starknet Indexer with Events\n');
  
  const lastSynced = await query('SELECT COALESCE(last_synced_block, 0) FROM sync_state WHERE chain_id = 1');
  const startBlock = parseInt(lastSynced[0] || '0');
  
  console.log(`📊 Starting from: ${startBlock}`);
  console.log(`📥 Phase 1: Sync 20 blocks (fast, no events)...\n`);
  
  // Phase 1: Fast sync without events
  for (let i = 1; i <= 20; i++) {
    await ingestBlock(startBlock + i, false);
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n📥 Phase 2: Sync 5 blocks WITH events (slow)...\n`);
  
  // Phase 2: Slow sync with events
  const currentBlock = parseInt((await query('SELECT last_synced_block FROM sync_state WHERE chain_id = 1'))[0]);
  for (let i = 1; i <= 5; i++) {
    await ingestBlock(currentBlock + i, true);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Compute daily metrics
  await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO starknet_daily_metrics (date, chain_id, total_transactions, successful_transactions, unique_addresses, total_gas_used) SELECT DATE(to_timestamp(timestamp)), 1, COUNT(*), COUNT(*), COUNT(DISTINCT t.sender_address), SUM(COALESCE(t.actual_fee, 0)) FROM transactions t JOIN blocks b ON t.block_number = b.block_number AND t.chain_id = b.chain_id WHERE t.chain_id = 1 GROUP BY DATE(to_timestamp(b.timestamp)) ON CONFLICT (date, chain_id) DO UPDATE SET total_transactions = EXCLUDED.total_transactions, successful_transactions = EXCLUDED.successful_transactions, unique_addresses = EXCLUDED.unique_addresses, total_gas_used = EXCLUDED.total_gas_used;"`);
  
  // Final stats
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM blocks WHERE chain_id = 1),
      (SELECT COUNT(*) FROM transactions WHERE chain_id = 1),
      (SELECT COUNT(*) FROM starknet_wallets WHERE chain_id = 1),
      (SELECT COUNT(*) FROM events WHERE chain_id = 1),
      (SELECT COUNT(*) FROM contracts WHERE chain_id = 1),
      (SELECT COUNT(*) FROM starknet_tokens WHERE chain_id = 1),
      (SELECT COUNT(*) FROM starknet_token_transfers WHERE chain_id = 1)
  `);
  
  const [blocks, txs, wallets, events, contracts, tokens, transfers] = stats[0].split('|');
  
  console.log('\n================================');
  console.log('📊 Final Stats:');
  console.log(`   Blocks: ${blocks}`);
  console.log(`   Transactions: ${txs}`);
  console.log(`   Wallets: ${wallets}`);
  console.log(`   Events: ${events}`);
  console.log(`   Contracts: ${contracts}`);
  console.log(`   Tokens: ${tokens}`);
  console.log(`   Token Transfers: ${transfers}`);
  console.log('================================\n');
}

start().catch(console.error);
