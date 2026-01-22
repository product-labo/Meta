const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'david',
  user: 'david_user',
  password: 'Davidsoyaya@1015'
});

async function validateDataAccuracy() {
  console.log('🔍 COMPREHENSIVE DATA ACCURACY VALIDATION');
  console.log('==========================================');
  
  try {
    // 1. Check for orphaned records
    const orphanedEvents = await pool.query(`
      SELECT COUNT(*) as count FROM events e 
      LEFT JOIN transactions t ON e.tx_hash = t.tx_hash 
      WHERE t.tx_hash IS NULL
    `);
    
    const orphanedTxs = await pool.query(`
      SELECT COUNT(*) as count FROM transactions t 
      LEFT JOIN blocks b ON t.block_number = b.block_number 
      WHERE b.block_number IS NULL
    `);
    
    // 2. Validate hash formats
    const invalidHashes = await pool.query(`
      SELECT 
        'transactions' as table_name,
        COUNT(*) as invalid_count
      FROM transactions 
      WHERE tx_hash NOT LIKE '0x%' OR LENGTH(tx_hash) < 60
      UNION ALL
      SELECT 
        'blocks' as table_name,
        COUNT(*) as invalid_count
      FROM blocks 
      WHERE block_hash NOT LIKE '0x%' OR LENGTH(block_hash) < 60
    `);
    
    // 3. Check data completeness
    const completeness = await pool.query(`
      SELECT 
        'Transactions with fees' as metric,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions), 2) as percentage
      FROM transactions 
      WHERE actual_fee IS NOT NULL AND actual_fee != '0'
      UNION ALL
      SELECT 
        'Events with valid data' as metric,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events), 2) as percentage
      FROM events 
      WHERE contract_address IS NOT NULL
      UNION ALL
      SELECT 
        'Contracts with class hash' as metric,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contracts), 2) as percentage
      FROM contracts 
      WHERE class_hash IS NOT NULL
    `);
    
    // 4. Recent data quality
    const recentQuality = await pool.query(`
      SELECT 
        b.block_number,
        COUNT(t.tx_hash) as tx_count,
        COUNT(e.event_id) as event_count,
        COUNT(CASE WHEN t.actual_fee IS NOT NULL AND t.actual_fee != '0' THEN 1 END) as txs_with_fees
      FROM blocks b
      LEFT JOIN transactions t ON b.block_number = t.block_number
      LEFT JOIN events e ON t.tx_hash = e.tx_hash
      WHERE b.block_number > (SELECT MAX(block_number) - 5 FROM blocks)
      GROUP BY b.block_number
      ORDER BY b.block_number DESC
    `);
    
    console.log('\n🚨 ORPHANED RECORDS CHECK:');
    console.log(`Events without transactions: ${orphanedEvents.rows[0].count}`);
    console.log(`Transactions without blocks: ${orphanedTxs.rows[0].count}`);
    
    console.log('\n❌ INVALID HASH FORMATS:');
    invalidHashes.rows.forEach(row => {
      console.log(`${row.table_name}: ${row.invalid_count} invalid hashes`);
    });
    
    console.log('\n📊 DATA COMPLETENESS:');
    completeness.rows.forEach(row => {
      console.log(`${row.metric}: ${row.count} (${row.percentage}%)`);
    });
    
    console.log('\n📈 RECENT BLOCKS QUALITY:');
    recentQuality.rows.forEach(row => {
      console.log(`Block ${row.block_number}: ${row.tx_count} txs, ${row.event_count} events, ${row.txs_with_fees} with fees`);
    });
    
    // Overall health score
    const totalOrphans = parseInt(orphanedEvents.rows[0].count) + parseInt(orphanedTxs.rows[0].count);
    const totalInvalid = invalidHashes.rows.reduce((sum, row) => sum + parseInt(row.invalid_count), 0);
    
    console.log('\n🏥 OVERALL HEALTH SCORE:');
    if (totalOrphans === 0 && totalInvalid === 0) {
      console.log('✅ EXCELLENT - No data integrity issues found');
    } else if (totalOrphans < 10 && totalInvalid < 10) {
      console.log('⚠️  GOOD - Minor issues detected');
    } else {
      console.log('❌ POOR - Significant data integrity issues');
    }
    
  } catch (error) {
    console.error('Validation error:', error.message);
  } finally {
    await pool.end();
  }
}

validateDataAccuracy();
