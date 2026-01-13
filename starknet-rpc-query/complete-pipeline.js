const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function completeProcessingPipeline() {
  try {
    console.log('🔧 Completing Processing Pipeline...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // 1. Fix entry point selectors for INVOKE transactions
    console.log('📋 Step 1: Fixing entry point selectors...');
    
    const invokeTransactions = await db.query(`
      SELECT tx_hash 
      FROM transactions 
      WHERE tx_type = 'INVOKE' 
        AND entry_point_selector IS NULL
      LIMIT 20
    `);
    
    let selectorFixed = 0;
    
    for (const tx of invokeTransactions) {
      try {
        const transaction = await rpc.getTransaction(tx.tx_hash);
        
        if (transaction.entry_point_selector) {
          await db.query(`
            UPDATE transactions 
            SET entry_point_selector = $1 
            WHERE tx_hash = $2
          `, [transaction.entry_point_selector, tx.tx_hash]);
          
          selectorFixed++;
        }
        
      } catch (error) {
        // Skip failed transactions
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`✅ Fixed ${selectorFixed} entry point selectors`);
    
    // 2. Get real contract class hashes from contract addresses
    console.log('📋 Step 2: Getting real contract class hashes...');
    
    const contractsWithoutClass = await db.query(`
      SELECT contract_address 
      FROM contracts 
      WHERE class_hash IS NULL 
      LIMIT 10
    `);
    
    let classHashFixed = 0;
    
    for (const contract of contractsWithoutClass) {
      try {
        // Try to get class hash from contract
        const classHash = await rpc.getStorageAt(
          contract.contract_address,
          '0x0', // Standard class hash storage slot
          'latest'
        );
        
        if (classHash && classHash !== '0x0') {
          await db.query(`
            UPDATE contracts 
            SET class_hash = $1 
            WHERE contract_address = $2
          `, [classHash, contract.contract_address]);
          
          classHashFixed++;
        }
        
      } catch (error) {
        // Skip failed contracts
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Fixed ${classHashFixed} contract class hashes`);
    
    // 3. Final verification
    const finalStats = await db.query(`
      SELECT 
        'FINAL PIPELINE STATUS' as status,
        (SELECT COUNT(*) FROM transactions WHERE entry_point_selector IS NOT NULL) as transactions_with_selectors,
        (SELECT COUNT(*) FROM transactions WHERE actual_fee > 0) as transactions_with_fees,
        (SELECT COUNT(*) FROM contracts WHERE class_hash IS NOT NULL) as contracts_with_class_hash,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM execution_calls) as total_execution_calls
    `);
    
    console.log('📊 Final Processing Pipeline Status:');
    console.log(`  Transactions with entry_point_selector: ${finalStats[0].transactions_with_selectors}`);
    console.log(`  Transactions with actual_fee: ${finalStats[0].transactions_with_fees}`);
    console.log(`  Contracts with class_hash: ${finalStats[0].contracts_with_class_hash}`);
    console.log(`  Total events: ${finalStats[0].total_events}`);
    console.log(`  Total execution calls: ${finalStats[0].total_execution_calls}`);
    
    console.log('🎉 Issue #4 PROCESSING PIPELINE COMPLETION ATTEMPTED!');
    
  } catch (error) {
    console.error('❌ Pipeline completion failed:', error.message);
  }
}

completeProcessingPipeline();
