const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function fixCriticalTransactionFields() {
  try {
    console.log('🔧 Fixing Critical Transaction Fields (Issue #6)...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // Get transactions missing critical fields
    const transactions = await db.query(`
      SELECT tx_hash, tx_type, block_number
      FROM transactions 
      WHERE entry_point_selector IS NULL 
         OR actual_fee IS NULL 
         OR actual_fee = '0'
      ORDER BY block_number DESC 
      LIMIT 100
    `);
    
    console.log(`📋 Processing ${transactions.length} transactions with missing fields...`);
    
    let entryPointsFixed = 0;
    let feesFixed = 0;
    let processed = 0;
    
    for (const tx of transactions) {
      try {
        // Get transaction receipt for fee data
        const receipt = await rpc.getTransactionReceipt(tx.tx_hash);
        
        let actualFee = null;
        let entryPointSelector = null;
        
        // Extract actual fee from receipt
        if (receipt.actual_fee) {
          if (typeof receipt.actual_fee === 'object' && receipt.actual_fee.amount) {
            actualFee = receipt.actual_fee.amount;
          } else if (typeof receipt.actual_fee === 'string') {
            actualFee = receipt.actual_fee;
          }
        }
        
        // For INVOKE transactions, try to get entry point selector
        if (tx.tx_type === 'INVOKE') {
          try {
            const transaction = await rpc.getTransaction(tx.tx_hash);
            entryPointSelector = transaction.entry_point_selector || 
                               transaction.entrypoint_selector ||
                               null;
          } catch (txError) {
            // Skip if transaction fetch fails
          }
        }
        
        // Update transaction with available data
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (actualFee && actualFee !== '0') {
          updates.push(`actual_fee = $${paramIndex}`);
          values.push(actualFee);
          paramIndex++;
          feesFixed++;
        }
        
        if (entryPointSelector) {
          updates.push(`entry_point_selector = $${paramIndex}`);
          values.push(entryPointSelector);
          paramIndex++;
          entryPointsFixed++;
        }
        
        if (updates.length > 0) {
          values.push(tx.tx_hash);
          await db.query(`
            UPDATE transactions 
            SET ${updates.join(', ')}
            WHERE tx_hash = $${paramIndex}
          `, values);
        }
        
        processed++;
        
        if (processed % 20 === 0) {
          console.log(`✅ Processed ${processed}/${transactions.length} transactions...`);
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to process ${tx.tx_hash}: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final verification
    const finalStats = await db.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN entry_point_selector IS NOT NULL THEN 1 END) as with_entry_point,
        COUNT(CASE WHEN actual_fee IS NOT NULL AND actual_fee != '0' THEN 1 END) as with_actual_fee,
        COUNT(CASE WHEN entry_point_selector IS NULL THEN 1 END) as missing_entry_point,
        COUNT(CASE WHEN actual_fee IS NULL OR actual_fee = '0' THEN 1 END) as missing_actual_fee
      FROM transactions
    `);
    
    console.log('📊 Issue #6 Results:');
    console.log(`  Total transactions: ${finalStats[0].total_transactions}`);
    console.log(`  With entry_point_selector: ${finalStats[0].with_entry_point} (fixed: ${entryPointsFixed})`);
    console.log(`  With actual_fee: ${finalStats[0].with_actual_fee} (fixed: ${feesFixed})`);
    console.log(`  Missing entry_point_selector: ${finalStats[0].missing_entry_point}`);
    console.log(`  Missing actual_fee: ${finalStats[0].missing_actual_fee}`);
    
    const totalFixed = entryPointsFixed + feesFixed;
    if (totalFixed > 0) {
      console.log(`🎉 Issue #6 PROGRESS: Fixed ${totalFixed} critical transaction fields!`);
    }
    
    if (finalStats[0].missing_entry_point === 0 && finalStats[0].missing_actual_fee === 0) {
      console.log('🎉 Issue #6 FULLY RESOLVED: All critical transaction fields populated!');
    } else {
      console.log('⚠️  Issue #6 PARTIALLY RESOLVED: Some fields still missing due to RPC limitations');
    }
    
  } catch (error) {
    console.error('❌ Critical field fixing failed:', error.message);
  }
}

fixCriticalTransactionFields();
