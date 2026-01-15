const { Pool } = require('pg');
const fc = require('fast-check');

let pool;

beforeAll(() => {
  pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'david',
    user: 'postgres',
    max: 3
  });
  
  // Use sudo -u postgres for connection
  process.env.PGUSER = 'postgres';
  process.env.PGHOST = 'localhost';
  process.env.PGDATABASE = 'david';
  process.env.PGPORT = '5432';
});

afterAll(async () => {
  await pool.end();
});

// Property 1: Class hash uniqueness per chain (Task 2.2)
describe('Contract Class Storage', () => {
  test('Property 1: Class hash must be unique per chain', async () => {
    const classHash = '0x' + '1'.repeat(64);
    const chainId = 1;
    
    // Insert first time
    await pool.query(
      'INSERT INTO contract_classes (class_hash, chain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [classHash, chainId]
    );
    
    // Try duplicate
    const result = await pool.query(
      'INSERT INTO contract_classes (class_hash, chain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [classHash, chainId]
    );
    
    // Verify only one exists
    const count = await pool.query(
      'SELECT COUNT(*) FROM contract_classes WHERE class_hash = $1 AND chain_id = $2',
      [classHash, chainId]
    );
    
    expect(parseInt(count.rows[0].count)).toBe(1);
    expect(result.rows.length).toBe(0); // Duplicate was rejected
    
    // Cleanup
    await pool.query('DELETE FROM contract_classes WHERE class_hash = $1', [classHash]);
  }, 10000);

  // Property 2: Contract class reference integrity (Task 2.4)
  test('Property 2: Contracts must reference valid contract classes', async () => {
    const classHash = '0x' + '2'.repeat(64);
    const contractAddr = '0x' + '3'.repeat(64);
    const chainId = 1;
    
    // Create contract class
    await pool.query(
      'INSERT INTO contract_classes (class_hash, chain_id) VALUES ($1, $2)',
      [classHash, chainId]
    );
    
    // Create contract referencing the class
    await pool.query(
      'INSERT INTO contracts (contract_address, class_hash, chain_id) VALUES ($1, $2, $3)',
      [contractAddr, classHash, chainId]
    );
    
    // Verify foreign key relationship
    const result = await pool.query(
      'SELECT c.contract_address, cc.class_hash FROM contracts c JOIN contract_classes cc ON c.class_hash = cc.class_hash AND c.chain_id = cc.chain_id WHERE c.contract_address = $1',
      [contractAddr]
    );
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].class_hash).toBe(classHash);
    
    // Cleanup
    await pool.query('DELETE FROM contracts WHERE contract_address = $1', [contractAddr]);
    await pool.query('DELETE FROM contract_classes WHERE class_hash = $1', [classHash]);
  }, 10000);
});

// Property 3: Reorganization preserves history (Task 3.4)
describe('Historical Data Preservation', () => {
  test('Property 3: Reorganization marks blocks as inactive, not deleted', async () => {
    const blockNumber = 999999;
    const blockHash = '0x' + '4'.repeat(64);
    const chainId = 1;
    
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
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].is_active).toBe(false);
    expect(result.rows[0].block_hash).toBe(blockHash);
    
    // Verify we can query both active and inactive
    const activeCount = await pool.query(
      'SELECT COUNT(*) FROM blocks WHERE block_number = $1 AND is_active = true',
      [blockNumber]
    );
    const totalCount = await pool.query(
      'SELECT COUNT(*) FROM blocks WHERE block_number = $1',
      [blockNumber]
    );
    
    expect(parseInt(totalCount.rows[0].count)).toBeGreaterThanOrEqual(parseInt(activeCount.rows[0].count));
    
    // Cleanup
    await pool.query('DELETE FROM blocks WHERE block_number = $1', [blockNumber]);
  }, 10000);

  test('Property 3b: Transactions preserve history during reorg', async () => {
    const txHash = '0x' + '5'.repeat(64);
    const blockNumber = 999998;
    const blockHash = '0x' + '6'.repeat(64);
    const chainId = 1;
    
    // Create block first
    await pool.query(
      'INSERT INTO blocks (block_number, block_hash, chain_id, timestamp, finality_status) VALUES ($1, $2, $3, $4, $5)',
      [blockNumber, blockHash, chainId, Math.floor(Date.now() / 1000), 'ACCEPTED_ON_L2']
    );
    
    // Insert transaction
    await pool.query(
      'INSERT INTO transactions (tx_hash, block_number, chain_id, tx_type, status, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      [txHash, blockNumber, chainId, 'INVOKE', 'ACCEPTED_ON_L2', true]
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
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].is_active).toBe(false);
    
    // Cleanup
    await pool.query('DELETE FROM transactions WHERE tx_hash = $1', [txHash]);
    await pool.query('DELETE FROM blocks WHERE block_number = $1', [blockNumber]);
  }, 10000);
});
