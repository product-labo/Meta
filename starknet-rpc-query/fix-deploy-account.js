const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function fixDeployAccountTransactions() {
  try {
    console.log('🔧 Fixing DEPLOY_ACCOUNT Transaction Processing (Issue #8)...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // Get DEPLOY_ACCOUNT transactions with NULL sender
    const deployTxs = await db.query(`
      SELECT tx_hash, block_number
      FROM transactions 
      WHERE tx_type = 'DEPLOY_ACCOUNT' AND sender_address IS NULL
    `);
    
    console.log(`📋 Processing ${deployTxs.length} DEPLOY_ACCOUNT transactions...`);
    
    for (const tx of deployTxs) {
      try {
        // Get transaction receipt to find the deployed contract address
        const receipt = await rpc.getTransactionReceipt(tx.tx_hash);
        
        if (receipt.contract_address) {
          // For DEPLOY_ACCOUNT, the contract_address in receipt is the deployed account
          await db.query(`
            UPDATE transactions 
            SET sender_address = $1
            WHERE tx_hash = $2
          `, [receipt.contract_address, tx.tx_hash]);
          
          console.log(`✅ Fixed DEPLOY_ACCOUNT ${tx.tx_hash} with contract address ${receipt.contract_address.substring(0, 10)}...`);
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to fix DEPLOY_ACCOUNT ${tx.tx_hash}: ${error.message}`);
      }
    }
    
    // Verify fix
    const verification = await db.query(`
      SELECT 
        COUNT(*) as total_deploy_account,
        COUNT(CASE WHEN sender_address IS NOT NULL THEN 1 END) as with_sender,
        COUNT(CASE WHEN sender_address IS NULL THEN 1 END) as without_sender
      FROM transactions 
      WHERE tx_type = 'DEPLOY_ACCOUNT'
    `);
    
    console.log('📊 DEPLOY_ACCOUNT Transaction Results:');
    console.log(`  Total DEPLOY_ACCOUNT transactions: ${verification[0].total_deploy_account}`);
    console.log(`  With sender_address: ${verification[0].with_sender}`);
    console.log(`  Without sender_address: ${verification[0].without_sender}`);
    
    if (verification[0].without_sender === 0) {
      console.log('🎉 Issue #8 RESOLVED: All DEPLOY_ACCOUNT transactions have proper sender addresses!');
    }
    
  } catch (error) {
    console.error('❌ DEPLOY_ACCOUNT fix failed:', error.message);
  }
}

fixDeployAccountTransactions();
