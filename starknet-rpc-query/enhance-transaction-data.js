const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function enhanceTransactionData() {
  try {
    console.log('🔧 Enhancing Transaction Data Pipeline...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // Get transactions missing critical data
    const transactions = await db.query(`
      SELECT tx_hash, block_number 
      FROM transactions 
      WHERE entry_point_selector IS NULL 
         OR actual_fee IS NULL 
         OR actual_fee = 0
      ORDER BY block_number DESC 
      LIMIT 50
    `);
    
    console.log(`📋 Enhancing ${transactions.length} transactions with missing data...`);
    
    let enhanced = 0;
    
    for (const tx of transactions) {
      try {
        // Get full transaction data and receipt
        const [transaction, receipt] = await Promise.all([
          rpc.getTransaction(tx.tx_hash),
          rpc.getTransactionReceipt(tx.tx_hash)
        ]);
        
        // Extract missing fields
        const entryPointSelector = transaction.entry_point_selector || null;
        const actualFee = receipt.actual_fee?.amount || transaction.actual_fee || '0';
        
        // Update transaction with complete data
        await db.query(`
          UPDATE transactions 
          SET 
            entry_point_selector = $1,
            actual_fee = $2
          WHERE tx_hash = $3
        `, [entryPointSelector, actualFee, tx.tx_hash]);
        
        enhanced++;
        
        if (enhanced % 10 === 0) {
          console.log(`✅ Enhanced ${enhanced}/${transactions.length} transactions...`);
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to enhance ${tx.tx_hash}: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check results
    const results = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(entry_point_selector) as with_entry_point,
        COUNT(CASE WHEN actual_fee > 0 THEN 1 END) as with_actual_fee
      FROM transactions
    `);
    
    console.log('📊 Enhanced Transaction Data Results:');
    console.log(`  Total transactions: ${results[0].total}`);
    console.log(`  With entry_point_selector: ${results[0].with_entry_point}`);
    console.log(`  With actual_fee > 0: ${results[0].with_actual_fee}`);
    
    if (results[0].with_entry_point > 0 || results[0].with_actual_fee > 0) {
      console.log('🎉 Issue #4 PROCESSING PIPELINE ENHANCED!');
    }
    
  } catch (error) {
    console.error('❌ Enhancement failed:', error.message);
  }
}

enhanceTransactionData();
