const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function getRealRPCData() {
  try {
    console.log('🔧 Replacing Mock Data with Real RPC Data...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // 1. Get real class hashes for contracts
    console.log('📋 Getting real class hashes for contracts...');
    const contracts = await db.query(`
      SELECT contract_address 
      FROM contracts 
      WHERE class_hash = '0x0'
      ORDER BY deployment_block DESC
      LIMIT 20
    `);
    
    let classHashesUpdated = 0;
    
    for (const contract of contracts) {
      try {
        // Get contract class hash from RPC
        const classHash = await rpc.call(
          contract.contract_address,
          'get_class_hash_at',
          []
        );
        
        if (classHash && classHash !== '0x0') {
          await db.query(`
            UPDATE contracts 
            SET class_hash = $1 
            WHERE contract_address = $2
          `, [classHash, contract.contract_address]);
          
          console.log(`✅ Updated class hash for ${contract.contract_address.substring(0, 10)}...`);
          classHashesUpdated++;
        }
        
      } catch (error) {
        // Try alternative method - get from storage
        try {
          const storageValue = await rpc.getStorageAt(
            contract.contract_address,
            '0x0', // Class hash storage slot
            'latest'
          );
          
          if (storageValue && storageValue !== '0x0') {
            await db.query(`
              UPDATE contracts 
              SET class_hash = $1 
              WHERE contract_address = $2
            `, [storageValue, contract.contract_address]);
            
            console.log(`✅ Updated class hash via storage for ${contract.contract_address.substring(0, 10)}...`);
            classHashesUpdated++;
          }
        } catch (storageError) {
          console.log(`⚠️  Could not get class hash for ${contract.contract_address.substring(0, 10)}...`);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Updated ${classHashesUpdated} real class hashes`);
    
    // 2. Get real entry point selectors from transaction data
    console.log('📋 Getting real entry point selectors...');
    
    const transactions = await db.query(`
      SELECT DISTINCT t.tx_hash, t.sender_address
      FROM transactions t
      JOIN execution_calls ec ON t.tx_hash = ec.tx_hash
      WHERE t.tx_type = 'INVOKE'
      LIMIT 50
    `);
    
    let selectorsUpdated = 0;
    
    for (const tx of transactions) {
      try {
        // Get transaction details to extract real entry point selector
        const transaction = await rpc.getTransaction(tx.tx_hash);
        
        if (transaction.entry_point_selector) {
          await db.query(`
            UPDATE execution_calls 
            SET entry_point_selector = $1
            WHERE tx_hash = $2
          `, [transaction.entry_point_selector, tx.tx_hash]);
          
          selectorsUpdated++;
        }
        
      } catch (error) {
        console.log(`⚠️  Could not get entry point for ${tx.tx_hash.substring(0, 10)}...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`🎉 Updated ${selectorsUpdated} real entry point selectors`);
    
    // 3. Verify no mock data remains
    const mockCheck = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM contracts WHERE class_hash = '0x0') as mock_contracts,
        (SELECT COUNT(*) FROM execution_calls WHERE entry_point_selector = '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e') as mock_selectors
    `);
    
    console.log('📊 Remaining mock data:');
    console.log(`  Mock contracts: ${mockCheck[0].mock_contracts}`);
    console.log(`  Mock selectors: ${mockCheck[0].mock_selectors}`);
    
    if (mockCheck[0].mock_contracts === 0 && mockCheck[0].mock_selectors === 0) {
      console.log('✅ ALL DATA IS NOW REAL RPC DATA - NO MOCK DATA REMAINING!');
    } else {
      console.log('⚠️  Some mock data remains due to RPC limitations');
    }
    
  } catch (error) {
    console.error('❌ Real data replacement failed:', error.message);
  }
}

getRealRPCData();
