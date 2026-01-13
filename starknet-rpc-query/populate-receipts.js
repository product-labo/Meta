const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function populateTransactionReceipts() {
  try {
    console.log('🔧 Populating Transaction Receipts...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // Get transactions that we know have receipts (from our event processing)
    const transactions = await db.query(`
      SELECT DISTINCT t.tx_hash, t.block_number
      FROM transactions t
      JOIN events e ON t.tx_hash = e.tx_hash
      ORDER BY t.block_number DESC
      LIMIT 50
    `);
    
    console.log(`📋 Processing receipts for ${transactions.length} transactions...`);
    
    let processed = 0;
    
    for (const tx of transactions) {
      try {
        const receipt = await rpc.getTransactionReceipt(tx.tx_hash);
        
        await db.query(`
          INSERT INTO transaction_receipts (
            tx_hash, 
            block_number, 
            block_hash, 
            status, 
            actual_fee, 
            execution_status
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (tx_hash) DO NOTHING
        `, [
          tx.tx_hash,
          tx.block_number,
          receipt.block_hash || '0x0',
          receipt.finality_status || 'ACCEPTED_ON_L2',
          receipt.actual_fee?.amount || '0',
          receipt.execution_status || 'SUCCEEDED'
        ]);
        
        processed++;
        
        if (processed % 10 === 0) {
          console.log(`📊 Processed ${processed}/${transactions.length} receipts...`);
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to process receipt for ${tx.tx_hash}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const count = await db.query('SELECT COUNT(*) as count FROM transaction_receipts');
    console.log(`🎉 Transaction receipts populated: ${count[0].count}`);
    
  } catch (error) {
    console.error('❌ Receipt processing failed:', error.message);
  }
}

populateTransactionReceipts();
