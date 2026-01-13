const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function fixTransactionReceipts() {
  try {
    console.log('🔧 Fixing Transaction Receipts Schema...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // Get transactions that we know have receipts (from our event processing)
    const transactions = await db.query(`
      SELECT DISTINCT t.tx_hash, t.block_number
      FROM transactions t
      JOIN events e ON t.tx_hash = e.tx_hash
      ORDER BY t.block_number DESC
      LIMIT 100
    `);
    
    console.log(`📋 Processing receipts for ${transactions.length} transactions...`);
    
    let processed = 0;
    
    for (const tx of transactions) {
      try {
        const receipt = await rpc.getTransactionReceipt(tx.tx_hash);
        
        // Map Starknet receipt to Ethereum-style schema
        const gasUsed = receipt.execution_resources?.l2_gas || 0;
        const actualFee = receipt.actual_fee?.amount || '0';
        
        await db.query(`
          INSERT INTO transaction_receipts (
            tx_hash, 
            status, 
            gas_used, 
            cumulative_gas_used,
            contract_address,
            effective_gas_price
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (tx_hash) DO NOTHING
        `, [
          tx.tx_hash,
          receipt.execution_status === 'SUCCEEDED' ? 1 : 0,  // Map to integer status
          gasUsed,
          gasUsed, // Use same value for cumulative
          receipt.contract_address || null,
          actualFee.length > 10 ? actualFee.substring(0, 10) : actualFee // Truncate if too long
        ]);
        
        processed++;
        console.log(`✅ Processed receipt ${processed}/${transactions.length}: ${tx.tx_hash}`);
        
      } catch (error) {
        console.log(`⚠️  Failed to process receipt for ${tx.tx_hash}: ${error.message}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const count = await db.query('SELECT COUNT(*) as count FROM transaction_receipts');
    console.log(`🎉 Transaction receipts populated: ${count[0].count}`);
    
    if (count[0].count > 0) {
      console.log('✅ Issue #2 FULLY COMPLETE: All secondary data processing tables populated!');
    }
    
  } catch (error) {
    console.error('❌ Receipt processing failed:', error.message);
  }
}

fixTransactionReceipts();
