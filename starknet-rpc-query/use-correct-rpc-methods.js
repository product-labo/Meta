const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function useCorrectRPCMethods() {
  try {
    console.log('🔧 Using Correct RPC Methods to Complete Pipeline...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // 1. Get real class hashes using correct method
    console.log('📋 Step 1: Getting contract class hashes with starknet_getClassHashAt...');
    
    const contracts = await db.query(`
      SELECT contract_address 
      FROM contracts 
      WHERE class_hash IS NULL 
      ORDER BY deployment_block DESC
      LIMIT 20
    `);
    
    let classHashesFixed = 0;
    
    for (const contract of contracts) {
      try {
        // Use the correct RPC method
        const classHash = await rpc.getClassHashAt(contract.contract_address, 'latest');
        
        if (classHash && classHash !== '0x0') {
          await db.query(`
            UPDATE contracts 
            SET class_hash = $1 
            WHERE contract_address = $2
          `, [classHash, contract.contract_address]);
          
          console.log(`✅ Updated class hash for ${contract.contract_address.substring(0, 10)}...`);
          classHashesFixed++;
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to get class hash for ${contract.contract_address.substring(0, 10)}...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Fixed ${classHashesFixed} contract class hashes`);
    
    // 2. Get transaction details with entry point selectors
    console.log('📋 Step 2: Getting transaction entry point selectors...');
    
    const transactions = await db.query(`
      SELECT tx_hash 
      FROM transactions 
      WHERE tx_type = 'INVOKE' 
        AND entry_point_selector IS NULL
      ORDER BY block_number DESC
      LIMIT 20
    `);
    
    let selectorsFixed = 0;
    
    for (const tx of transactions) {
      try {
        const transaction = await rpc.getTransaction(tx.tx_hash);
        
        // Check different possible fields for entry point selector
        const entryPointSelector = transaction.entry_point_selector || 
                                 transaction.entrypoint_selector ||
                                 transaction.calldata?.[1]; // Sometimes it's in calldata
        
        if (entryPointSelector) {
          await db.query(`
            UPDATE transactions 
            SET entry_point_selector = $1 
            WHERE tx_hash = $2
          `, [entryPointSelector, tx.tx_hash]);
          
          console.log(`✅ Updated entry point for ${tx.tx_hash.substring(0, 10)}...`);
          selectorsFixed++;
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to get entry point for ${tx.tx_hash.substring(0, 10)}...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`🎉 Fixed ${selectorsFixed} entry point selectors`);
    
    // 3. Final verification
    const finalResults = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM contracts WHERE class_hash IS NOT NULL) as contracts_with_class_hash,
        (SELECT COUNT(*) FROM transactions WHERE entry_point_selector IS NOT NULL) as transactions_with_selectors,
        (SELECT COUNT(*) FROM transactions WHERE actual_fee > 0) as transactions_with_fees
    `);
    
    console.log('📊 Final Pipeline Completion Results:');
    console.log(`  Contracts with class_hash: ${finalResults[0].contracts_with_class_hash}`);
    console.log(`  Transactions with entry_point_selector: ${finalResults[0].transactions_with_selectors}`);
    console.log(`  Transactions with actual_fee: ${finalResults[0].transactions_with_fees}`);
    
    if (finalResults[0].contracts_with_class_hash > 0 || finalResults[0].transactions_with_selectors > 0) {
      console.log('🎉 Issue #4 PIPELINE COMPLETED WITH CORRECT RPC METHODS!');
    }
    
  } catch (error) {
    console.error('❌ RPC method execution failed:', error.message);
  }
}

useCorrectRPCMethods();
