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

function escapeSQL(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

async function ingestBlock(blockNumber) {
  console.log(`\n📦 Block ${blockNumber}...`);
  
  const response = await fetchBlock(blockNumber);
  if (!response.result) {
    console.log(`  ❌ Failed`);
    return false;
  }
  
  const block = response.result;
  
  // Insert block
  await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO blocks (block_number, block_hash, parent_block_hash, timestamp, finality_status, chain_id, transaction_count, event_count, is_active) VALUES (${block.block_number}, '${block.block_hash}', '${block.parent_hash}', ${block.timestamp}, '${block.status || 'ACCEPTED_ON_L2'}', 1, ${block.transactions?.length || 0}, 0, true) ON CONFLICT (block_number) DO NOTHING;"`);
  
  let txCount = 0, walletCount = 0, contractCount = 0;
  
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
      
      // Track contract class
      if (tx.class_hash) {
        await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO contract_classes (class_hash, chain_id, declared_tx_hash, declared_block) VALUES ('${tx.class_hash}', 1, '${tx.transaction_hash}', ${block.block_number}) ON CONFLICT (class_hash, chain_id) DO NOTHING;"`);
      }
    }
    
    // Track wallet-contract interaction
    if (tx.sender_address && tx.contract_address) {
      await execAsync(`sudo -u postgres psql -d david -c "INSERT INTO wallet_interactions (wallet_address, contract_address, tx_hash, block_number, chain_id, interaction_type) VALUES ('${tx.sender_address}', '${tx.contract_address}', '${tx.transaction_hash}', ${block.block_number}, 1, '${tx.type}') ON CONFLICT DO NOTHING;"`);
    }
  }
  
  // Update sync state
  await execAsync(`sudo -u postgres psql -d david -c "UPDATE sync_state SET last_synced_block = ${block.block_number}, last_sync_timestamp = NOW() WHERE chain_id = 1;"`);
  
  console.log(`  ✅ Txs: ${txCount}, Wallets: ${walletCount}, Contracts: ${contractCount}`);
  return true;
}

async function start() {
  console.log('🚀 Complete Starknet Indexer\n');
  
  const lastSynced = await query('SELECT COALESCE(last_synced_block, 0) FROM sync_state WHERE chain_id = 1');
  const startBlock = parseInt(lastSynced[0] || '0');
  
  console.log(`📊 Starting from: ${startBlock}`);
  console.log(`📥 Syncing 10 blocks...\n`);
  
  for (let i = 1; i <= 10; i++) {
    await ingestBlock(startBlock + i);
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Final stats
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM blocks WHERE chain_id = 1) as blocks,
      (SELECT COUNT(*) FROM transactions WHERE chain_id = 1) as txs,
      (SELECT COUNT(*) FROM starknet_wallets WHERE chain_id = 1) as wallets,
      (SELECT COUNT(*) FROM contracts WHERE chain_id = 1) as contracts,
      (SELECT COUNT(*) FROM contract_classes WHERE chain_id = 1) as classes,
      (SELECT COUNT(*) FROM events WHERE chain_id = 1) as events
  `);
  
  const [blocks, txs, wallets, contracts, classes, events] = stats[0].split('|');
  
  console.log('\n================================');
  console.log('📊 Final Stats:');
  console.log(`   Blocks: ${blocks}`);
  console.log(`   Transactions: ${txs}`);
  console.log(`   Wallets: ${wallets}`);
  console.log(`   Contracts: ${contracts}`);
  console.log(`   Contract Classes: ${classes}`);
  console.log(`   Events: ${events} (skipped - too slow)`);
  console.log('================================\n');
}

start().catch(console.error);
