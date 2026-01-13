import 'dotenv/config';
import { DatabaseManager } from './database/manager';
import { logger } from './utils/logger';

async function monitorProgress() {
  const db = new DatabaseManager();
  
  const getProgress = async () => {
    try {
      const [stats, recent, daily] = await Promise.all([
        db.query(`
          SELECT 
            COUNT(*) as total_blocks,
            MIN(block_number) as earliest,
            MAX(block_number) as latest,
            (SELECT COUNT(*) FROM lisk_transactions) as total_txs,
            (SELECT COUNT(*) FROM lisk_transaction_receipts) as total_receipts
          FROM lisk_blocks
        `),
        db.query(`
          SELECT block_number, transaction_count, 
                 to_timestamp(timestamp) as block_time
          FROM lisk_blocks 
          ORDER BY block_number DESC LIMIT 3
        `),
        db.query(`
          SELECT 
            DATE(to_timestamp(timestamp)) as date,
            COUNT(*) as blocks,
            SUM(transaction_count) as txs
          FROM lisk_blocks 
          GROUP BY DATE(to_timestamp(timestamp))
          ORDER BY date DESC LIMIT 5
        `)
      ]);

      const s = stats.rows[0];
      const target = 302400; // 1 week target
      const progress = ((s.total_blocks / target) * 100).toFixed(3);
      
      console.clear();
      console.log('🔄 LISK 1-WEEK HISTORICAL FETCH MONITOR');
      console.log('═'.repeat(50));
      console.log(`📊 Progress: ${s.total_blocks}/${target} blocks (${progress}%)`);
      console.log(`💰 Transactions: ${s.total_txs}`);
      console.log(`📋 Receipts: ${s.total_receipts}`);
      console.log(`📈 Block Range: ${s.earliest} → ${s.latest}`);
      console.log('');
      
      console.log('📅 DAILY BREAKDOWN:');
      daily.rows.forEach(row => {
        console.log(`  ${row.date}: ${row.blocks} blocks, ${row.txs} txs`);
      });
      console.log('');
      
      console.log('🕐 LATEST BLOCKS:');
      recent.rows.forEach(row => {
        const time = new Date(row.block_time).toLocaleTimeString();
        console.log(`  Block ${row.block_number}: ${row.transaction_count} txs at ${time}`);
      });
      console.log('');
      console.log(`⏰ Last updated: ${new Date().toLocaleTimeString()}`);
      
    } catch (error) {
      console.error('Monitor error:', error);
    }
  };

  // Initial display
  await getProgress();
  
  // Update every 10 seconds
  setInterval(getProgress, 10000);
}

monitorProgress();
