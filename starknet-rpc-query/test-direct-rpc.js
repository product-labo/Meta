const axios = require('axios');
require('dotenv').config();

async function testDirectRPC() {
  try {
    console.log('🔧 Testing direct RPC call...');
    
    // Test getting latest block number
    const blockNumberResponse = await axios.post(process.env.STARKNET_RPC_URL, {
      jsonrpc: '2.0',
      method: 'starknet_blockNumber',
      params: [],
      id: 1
    });
    
    console.log('📊 Latest block number:', blockNumberResponse.data.result);
    
    // Test getting a specific block
    const blockResponse = await axios.post(process.env.STARKNET_RPC_URL, {
      jsonrpc: '2.0',
      method: 'starknet_getBlockWithTxs',
      params: [{ block_number: parseInt(blockNumberResponse.data.result) - 1 }],
      id: 2
    });
    
    if (blockResponse.data.result) {
      const block = blockResponse.data.result;
      console.log('✅ Block fetched successfully!');
      console.log(`  - Number: ${block.block_number}`);
      console.log(`  - Hash: ${block.block_hash}`);
      console.log(`  - Transactions: ${block.transactions?.length || 0}`);
      
      if (block.transactions && block.transactions.length > 0) {
        const tx = block.transactions[0];
        console.log('📊 First transaction:');
        console.log(`  - Hash: ${tx.transaction_hash}`);
        console.log(`  - Type: ${tx.type}`);
        console.log(`  - Sender: ${tx.sender_address || 'N/A'}`);
        
        console.log('\n🎉 RPC IS WORKING AND RETURNING REAL DATA!');
      }
    } else {
      console.log('❌ No block data returned');
      console.log('Response:', blockResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Direct RPC test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDirectRPC();