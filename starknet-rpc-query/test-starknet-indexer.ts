import { Database } from './database/Database';

async function testStarknetIndexer() {
  console.log('🧪 Testing Starknet Indexer Connection...');
  
  const db = new Database({
    host: 'localhost',
    port: 5432,
    name: 'david',
    user: 'david_user',
    password: 'Davidsoyaya@1015',
    maxConnections: 10,
    connectionTimeout: 5000,
    url: 'postgresql://david_user:Davidsoyaya@1015@localhost:5432/david'
  });

  try {
    await db.connect();
    console.log('✅ Database connected');

    // Test RPC connection
    const response = await fetch('https://starknet-rpc.publicnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'starknet_blockNumber',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    console.log('✅ Starknet RPC connected - Latest block:', data.result);

    // Get a recent block
    const blockResponse = await fetch('https://starknet-rpc.publicnode.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'starknet_getBlockWithTxs',
        params: [{ block_number: parseInt(data.result) - 1 }],
        id: 2
      })
    });

    const blockData = await blockResponse.json();
    console.log('✅ Block fetched:', blockData.result?.block_number);
    console.log('📊 Transactions in block:', blockData.result?.transactions?.length || 0);

    // Test inserting into Starknet tables
    if (blockData.result?.transactions?.length > 0) {
      const tx = blockData.result.transactions[0];
      
      await db.query(`
        INSERT INTO starknet_transactions (
          tx_hash, block_number, from_address, to_address, 
          value, max_fee, actual_fee, nonce, version, signature, 
          calldata, execution_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (tx_hash) DO NOTHING
      `, [
        tx.transaction_hash,
        blockData.result.block_number,
        tx.sender_address || '0x0',
        tx.contract_address || '0x0',
        0,
        tx.max_fee || '0',
        tx.actual_fee || '0',
        tx.nonce || '0',
        tx.version || '0x1',
        JSON.stringify(tx.signature || []),
        JSON.stringify(tx.calldata || []),
        'SUCCEEDED'
      ]);

      console.log('✅ Test transaction inserted into starknet_transactions');
      
      // Check if it triggered unified insert
      const unifiedCheck = await db.query(`
        SELECT COUNT(*) as count FROM transactions WHERE chain_id = 2 AND tx_hash = $1
      `, [tx.transaction_hash]);
      
      console.log('🔗 Unified trigger result:', unifiedCheck.rows[0].count > 0 ? 'SUCCESS' : 'FAILED');
    }

    await db.disconnect();
    console.log('🎉 Starknet indexer test completed successfully!');

  } catch (error) {
    console.error('❌ Starknet indexer test failed:', error);
  }
}

testStarknetIndexer();
