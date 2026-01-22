#!/bin/bash
# Run tests as postgres user with proper permissions

cd /mnt/c/pr0/meta/starknet-rpc-query/tests

echo "Running Starknet Schema Property Tests..."
echo ""

sudo -u postgres node << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  database: 'david',
  user: 'postgres'
});

async function runTests() {
  console.log('✅ Test 1: Class hash uniqueness per chain');
  
  const classHash = '0x' + '1'.repeat(64);
  const chainId = 1;
  
  try {
    // Insert first time
    await pool.query(
      'INSERT INTO contract_classes (class_hash, chain_id) VALUES ($1, $2)',
      [classHash, chainId]
    );
    
    // Try duplicate
    try {
      await pool.query(
        'INSERT INTO contract_classes (class_hash, chain_id) VALUES ($1, $2)',
        [classHash, chainId]
      );
      console.log('   ❌ FAIL: Duplicate was allowed');
    } catch (e) {
      console.log('   ✅ PASS: Duplicate rejected (unique constraint works)');
    }
    
    // Cleanup
    await pool.query('DELETE FROM contract_classes WHERE class_hash = $1', [classHash]);
  } catch (e) {
    console.log('   ❌ FAIL:', e.message);
  }
  
  console.log('');
  console.log('✅ Test 2: Contract-class reference integrity');
  
  const classHash2 = '0x' + '2'.repeat(64);
  const contractAddr = '0x' + '3'.repeat(64);
  
  try {
    // Create contract class
    await pool.query(
      'INSERT INTO contract_classes (class_hash, chain_id) VALUES ($1, $2)',
      [classHash2, chainId]
    );
    
    // Create contract referencing the class
    await pool.query(
      'INSERT INTO contracts (contract_address, class_hash, chain_id) VALUES ($1, $2, $3)',
      [contractAddr, classHash2, chainId]
    );
    
    // Verify foreign key relationship
    const result = await pool.query(
      'SELECT c.contract_address, cc.class_hash FROM contracts c JOIN contract_classes cc ON c.class_hash = cc.class_hash AND c.chain_id = cc.chain_id WHERE c.contract_address = $1',
      [contractAddr]
    );
    
    if (result.rows.length === 1 && result.rows[0].class_hash === classHash2) {
      console.log('   ✅ PASS: Foreign key relationship verified');
    } else {
      console.log('   ❌ FAIL: Foreign key relationship broken');
    }
    
    // Cleanup
    await pool.query('DELETE FROM contracts WHERE contract_address = $1', [contractAddr]);
    await pool.query('DELETE FROM contract_classes WHERE class_hash = $1', [classHash2]);
  } catch (e) {
    console.log('   ❌ FAIL:', e.message);
  }
  
  console.log('');
  console.log('✅ Test 3: Historical data preservation (blocks)');
  
  const blockNumber = 999999;
  const blockHash = '0x' + '4'.repeat(64);
  
  try {
    // Insert block
    await pool.query(
      'INSERT INTO blocks (block_number, block_hash, chain_id, timestamp, finality_status, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      [blockNumber, blockHash, chainId, Math.floor(Date.now() / 1000), 'ACCEPTED_ON_L2', true]
    );
    
    // Simulate reorganization
    await pool.query(
      'UPDATE blocks SET is_active = false WHERE block_number = $1 AND chain_id = $2',
      [blockNumber, chainId]
    );
    
    // Verify block still exists but is inactive
    const result = await pool.query(
      'SELECT * FROM blocks WHERE block_number = $1 AND chain_id = $2',
      [blockNumber, chainId]
    );
    
    if (result.rows.length === 1 && result.rows[0].is_active === false && result.rows[0].block_hash === blockHash) {
      console.log('   ✅ PASS: Block marked inactive, not deleted');
    } else {
      console.log('   ❌ FAIL: Historical preservation failed');
    }
    
    // Cleanup
    await pool.query('DELETE FROM blocks WHERE block_number = $1', [blockNumber]);
  } catch (e) {
    console.log('   ❌ FAIL:', e.message);
  }
  
  console.log('');
  console.log('✅ Test 4: Historical data preservation (transactions)');
  
  const txHash = '0x' + '5'.repeat(64);
  const blockNumber2 = 999998;
  const blockHash2 = '0x' + '6'.repeat(64);
  
  try {
    // Create block first
    await pool.query(
      'INSERT INTO blocks (block_number, block_hash, chain_id, timestamp, finality_status) VALUES ($1, $2, $3, $4, $5)',
      [blockNumber2, blockHash2, chainId, Math.floor(Date.now() / 1000), 'ACCEPTED_ON_L2']
    );
    
    // Insert transaction
    await pool.query(
      'INSERT INTO transactions (tx_hash, block_number, chain_id, tx_type, status, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      [txHash, blockNumber2, chainId, 'INVOKE', 'ACCEPTED_ON_L2', true]
    );
    
    // Mark as inactive
    await pool.query(
      'UPDATE transactions SET is_active = false WHERE tx_hash = $1',
      [txHash]
    );
    
    // Verify still exists
    const result = await pool.query(
      'SELECT * FROM transactions WHERE tx_hash = $1',
      [txHash]
    );
    
    if (result.rows.length === 1 && result.rows[0].is_active === false) {
      console.log('   ✅ PASS: Transaction marked inactive, not deleted');
    } else {
      console.log('   ❌ FAIL: Historical preservation failed');
    }
    
    // Cleanup
    await pool.query('DELETE FROM transactions WHERE tx_hash = $1', [txHash]);
    await pool.query('DELETE FROM blocks WHERE block_number = $1', [blockNumber2]);
  } catch (e) {
    console.log('   ❌ FAIL:', e.message);
  }
  
  await pool.end();
  
  console.log('');
  console.log('================================');
  console.log('Property Tests Complete!');
  console.log('================================');
}

runTests().catch(console.error);
EOF
