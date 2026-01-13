const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'david',
  user: 'david_user',
  password: 'Davidsoyaya@1015'
});

async function fixBlockProcessing() {
  console.log('🔧 FIXING BLOCK PROCESSING ORDER');
  
  try {
    // Get the current max block
    const maxBlock = await pool.query('SELECT MAX(block_number) as max_block FROM blocks');
    const currentMax = parseInt(maxBlock.rows[0].max_block);
    
    console.log(`Current max block: ${currentMax}`);
    
    // Check for missing blocks in sequence
    const missingBlocks = await pool.query(`
      SELECT block_number + 1 as missing_block
      FROM blocks b1
      WHERE NOT EXISTS (
        SELECT 1 FROM blocks b2 
        WHERE b2.block_number = b1.block_number + 1
      )
      AND block_number < $1
      ORDER BY block_number
      LIMIT 10
    `, [currentMax]);
    
    if (missingBlocks.rows.length > 0) {
      console.log('❌ Found missing blocks:', missingBlocks.rows.map(r => r.missing_block));
    } else {
      console.log('✅ No missing blocks found');
    }
    
    // Temporarily disable foreign key constraints for cleanup
    await pool.query('SET session_replication_role = replica;');
    
    // Delete orphaned transactions
    const orphanedTxs = await pool.query(`
      DELETE FROM transactions 
      WHERE block_number NOT IN (SELECT block_number FROM blocks)
      RETURNING tx_hash
    `);
    
    console.log(`🧹 Cleaned up ${orphanedTxs.rows.length} orphaned transactions`);
    
    // Re-enable constraints
    await pool.query('SET session_replication_role = DEFAULT;');
    
    console.log('✅ Block processing order fixed');
    
  } catch (error) {
    console.error('Fix error:', error.message);
  } finally {
    await pool.end();
  }
}

fixBlockProcessing();
