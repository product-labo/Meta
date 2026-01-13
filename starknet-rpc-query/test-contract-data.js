const { Client } = require('pg');
require('dotenv').config();

async function testContractData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔧 Testing contract data for business metrics...\n');
    
    // Test the exact query we'll use in the API
    const query = `
      SELECT 
        c.contract_address,
        c.class_hash,
        c.deployment_block,
        
        -- Generate business name from contract address patterns
        CASE 
          WHEN c.contract_address = '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d' THEN 'Starknet Bridge Protocol'
          WHEN c.contract_address = '0x127021a1b5a52d3174c2ab077c2b043c80369250d29428cee956d76ee51584f' THEN 'DeFi Exchange Alpha'
          ELSE 'Starknet Contract ' || SUBSTRING(c.contract_address, 1, 10) || '...'
        END as business_name,
        
        -- Business metrics calculated from our data
        COALESCE(wi.unique_wallets, 0) as total_customers,
        COALESCE(wi.interaction_count, 0) as total_transactions
        
      FROM contracts c
      LEFT JOIN (
        SELECT 
          contract_address,
          COUNT(*) as interaction_count,
          COUNT(DISTINCT wallet_address) as unique_wallets
        FROM wallet_interactions 
        GROUP BY contract_address
      ) wi ON c.contract_address = wi.contract_address
      WHERE COALESCE(wi.interaction_count, 0) > 0
      ORDER BY COALESCE(wi.interaction_count, 0) DESC
      LIMIT 10
    `;
    
    console.log('📊 Running contract business query...');
    const result = await client.query(query);
    
    console.log(`✅ Found ${result.rows.length} contracts with interactions:`);
    result.rows.forEach((contract, i) => {
      console.log(`${i+1}. ${contract.business_name}`);
      console.log(`   Address: ${contract.contract_address.substring(0, 20)}...`);
      console.log(`   Customers: ${contract.total_customers}, Transactions: ${contract.total_transactions}`);
    });
    
    if (result.rows.length === 0) {
      console.log('⚠️ No contracts with interactions found. Let me check the data...');
      
      // Check contracts table
      const contractsResult = await client.query('SELECT COUNT(*) as count FROM contracts');
      console.log(`📊 Total contracts: ${contractsResult.rows[0].count}`);
      
      // Check wallet_interactions table
      const interactionsResult = await client.query('SELECT COUNT(*) as count FROM wallet_interactions');
      console.log(`📊 Total wallet interactions: ${interactionsResult.rows[0].count}`);
      
      if (parseInt(interactionsResult.rows[0].count) === 0) {
        console.log('💡 No wallet interactions found. This might be why no business data is available.');
        console.log('💡 The indexer might still be processing or wallet interactions might not be populated yet.');
      }
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Contract data test failed:', error.message);
    await client.end();
  }
}

testContractData();