const { Client } = require('pg');
require('dotenv').config();

async function verifyDataIntegrity() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔧 Verifying data integrity...\n');
    
    // 1. Check referential integrity
    console.log('📊 REFERENTIAL INTEGRITY CHECKS:');
    
    // Check orphaned transactions (transactions without blocks)
    const orphanedTx = await client.query(`
      SELECT COUNT(*) as count 
      FROM transactions t 
      LEFT JOIN blocks b ON t.block_number = b.block_number 
      WHERE b.block_number IS NULL
    `);
    console.log('  - Orphaned transactions:', orphanedTx.rows[0].count);
    
    // Check orphaned events (events without transactions)
    const orphanedEvents = await client.query(`
      SELECT COUNT(*) as count 
      FROM events e 
      LEFT JOIN transactions t ON e.tx_hash = t.tx_hash 
      WHERE t.tx_hash IS NULL
    `);
    console.log('  - Orphaned events:', orphanedEvents.rows[0].count);
    
    // Check orphaned wallet interactions
    const orphanedInteractions = await client.query(`
      SELECT COUNT(*) as count 
      FROM wallet_interactions wi 
      LEFT JOIN transactions t ON wi.tx_hash = t.tx_hash 
      WHERE t.tx_hash IS NULL
    `);
    console.log('  - Orphaned wallet interactions:', orphanedInteractions.rows[0].count);
    
    // 2. Check data consistency
    console.log('\n📊 DATA CONSISTENCY CHECKS:');
    
    // Check block sequence
    const blockGaps = await client.query(`
      WITH block_gaps AS (
        SELECT block_number, 
               block_number - LAG(block_number) OVER (ORDER BY block_number) as gap
        FROM blocks
      )
      SELECT block_number, gap
      FROM block_gaps 
      WHERE gap > 1
      LIMIT 5
    `);
    console.log('  - Block gaps found:', blockGaps.rows.length);
    if (blockGaps.rows.length > 0) {
      blockGaps.rows.forEach(row => {
        console.log(`    Gap at block ${row.block_number} (gap size: ${row.gap})`);
      });
    }
    
    // Check transaction hash format (Starknet hashes can be shorter than 64 chars)
    const invalidTxHashes = await client.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE tx_hash !~ '^0x[a-fA-F0-9]+$' OR LENGTH(tx_hash) < 3 OR LENGTH(tx_hash) > 66
    `);
    console.log('  - Invalid transaction hashes:', invalidTxHashes.rows[0].count);
    
    // Check block hash format (Starknet hashes can be shorter than 64 chars)
    const invalidBlockHashes = await client.query(`
      SELECT COUNT(*) as count 
      FROM blocks 
      WHERE block_hash !~ '^0x[a-fA-F0-9]+$' OR LENGTH(block_hash) < 3 OR LENGTH(block_hash) > 66
    `);
    console.log('  - Invalid block hashes:', invalidBlockHashes.rows[0].count);
    
    // 3. Check data freshness
    console.log('\n📊 DATA FRESHNESS CHECKS:');
    
    const latestBlock = await client.query(`
      SELECT block_number, 
             timestamp,
             EXTRACT(EPOCH FROM NOW()) - timestamp as age_seconds
      FROM blocks 
      ORDER BY block_number DESC 
      LIMIT 1
    `);
    
    if (latestBlock.rows.length > 0) {
      const ageMinutes = Math.floor(latestBlock.rows[0].age_seconds / 60);
      console.log(`  - Latest block: ${latestBlock.rows[0].block_number}`);
      console.log(`  - Block age: ${ageMinutes} minutes`);
      console.log(`  - Data freshness: ${ageMinutes < 30 ? '✅ FRESH' : '⚠️ STALE'}`);
    }
    
    // 4. Sample data verification
    console.log('\n📊 SAMPLE DATA VERIFICATION:');
    
    // Get a recent transaction with events
    const sampleTx = await client.query(`
      SELECT t.tx_hash, t.block_number, t.sender_address, 
             COUNT(e.event_id) as event_count
      FROM transactions t
      LEFT JOIN events e ON t.tx_hash = e.tx_hash
      WHERE t.block_number > (SELECT MAX(block_number) - 10 FROM blocks)
      GROUP BY t.tx_hash, t.block_number, t.sender_address
      HAVING COUNT(e.event_id) > 0
      ORDER BY t.block_number DESC
      LIMIT 1
    `);
    
    if (sampleTx.rows.length > 0) {
      const tx = sampleTx.rows[0];
      console.log(`  - Sample transaction: ${tx.tx_hash.substring(0, 20)}...`);
      console.log(`  - Block: ${tx.block_number}`);
      console.log(`  - Sender: ${tx.sender_address.substring(0, 20)}...`);
      console.log(`  - Events: ${tx.event_count}`);
      
      // Verify this transaction exists on-chain by checking format
      const isValidFormat = /^0x[a-fA-F0-9]+$/.test(tx.tx_hash) && tx.tx_hash.length >= 3 && tx.tx_hash.length <= 66;
      console.log(`  - Hash format valid: ${isValidFormat ? '✅' : '❌'}`);
    }
    
    // 5. Performance metrics
    console.log('\n📊 PERFORMANCE METRICS:');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM blocks) as total_blocks,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM contracts) as total_contracts,
        (SELECT COUNT(*) FROM wallets) as total_wallets,
        (SELECT COUNT(*) FROM wallet_interactions) as total_interactions
    `);
    
    const s = stats.rows[0];
    console.log(`  - Blocks: ${s.total_blocks}`);
    console.log(`  - Transactions: ${s.total_transactions}`);
    console.log(`  - Events: ${s.total_events}`);
    console.log(`  - Contracts: ${s.total_contracts}`);
    console.log(`  - Wallets: ${s.total_wallets}`);
    console.log(`  - Interactions: ${s.total_interactions}`);
    
    // Calculate ratios
    const txPerBlock = (parseFloat(s.total_transactions) / parseFloat(s.total_blocks)).toFixed(2);
    const eventsPerTx = (parseFloat(s.total_events) / parseFloat(s.total_transactions)).toFixed(2);
    
    console.log(`  - Avg transactions per block: ${txPerBlock}`);
    console.log(`  - Avg events per transaction: ${eventsPerTx}`);
    
    console.log('\n✅ Data integrity verification completed!');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Data integrity check failed:', error.message);
    await client.end();
  }
}

verifyDataIntegrity();