const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function enrichContractData() {
  try {
    console.log('🔧 Enriching Contract Data...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    
    // Get top contracts by activity
    const contracts = await db.query(`
      SELECT contract_address, COUNT(*) as event_count
      FROM events 
      WHERE contract_address IS NOT NULL
      GROUP BY contract_address
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);
    
    console.log(`📋 Enriching ${contracts.length} most active contracts...`);
    
    let enriched = 0;
    
    for (const contract of contracts) {
      try {
        console.log(`🔍 Getting class hash for ${contract.contract_address}...`);
        
        // Get contract class hash
        const classHash = await rpc.getStorageAt(
          contract.contract_address, 
          '0x0', // Class hash storage slot
          'latest'
        );
        
        if (classHash && classHash !== '0x0') {
          await db.query(`
            UPDATE contracts 
            SET class_hash = $1 
            WHERE contract_address = $2
          `, [classHash, contract.contract_address]);
          
          console.log(`✅ Updated ${contract.contract_address} with class hash`);
          enriched++;
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to get class hash for ${contract.contract_address}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Enriched ${enriched} contracts with class hashes`);
    
    // Get final contract stats
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_contracts,
        COUNT(CASE WHEN class_hash != '0x0' THEN 1 END) as contracts_with_class_hash,
        COUNT(CASE WHEN deployment_tx_hash IS NOT NULL THEN 1 END) as contracts_with_deployment
      FROM contracts
    `);
    
    console.log('📊 Contract Statistics:');
    console.log(`  Total contracts: ${stats[0].total_contracts}`);
    console.log(`  With class hash: ${stats[0].contracts_with_class_hash}`);
    console.log(`  With deployment info: ${stats[0].contracts_with_deployment}`);
    
  } catch (error) {
    console.error('❌ Contract enrichment failed:', error.message);
  }
}

enrichContractData();
