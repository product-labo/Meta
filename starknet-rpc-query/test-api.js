const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:3001';
  
  console.log('🔧 Testing Starknet Explorer API...\n');
  
  try {
    // Test health endpoint
    console.log('📊 Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test latest block
    console.log('\n📊 Testing latest block endpoint...');
    const latestBlockResponse = await axios.get(`${baseURL}/api/blocks`);
    console.log('✅ Latest block:', latestBlockResponse.data);
    
    // Test specific block
    console.log('\n📊 Testing specific block endpoint...');
    const blockResponse = await axios.get(`${baseURL}/api/blocks/4699300`);
    console.log('✅ Block 4699300:', blockResponse.data);
    
    // Test transactions for a block
    console.log('\n📊 Testing block transactions endpoint...');
    const txResponse = await axios.get(`${baseURL}/api/blocks/4699300/transactions`);
    console.log('✅ Block transactions:', txResponse.data.length, 'transactions');
    
    if (txResponse.data.length > 0) {
      const firstTx = txResponse.data[0];
      console.log('   First transaction:', firstTx.tx_hash);
      
      // Test specific transaction
      console.log('\n📊 Testing transaction endpoint...');
      const txDetailResponse = await axios.get(`${baseURL}/api/transactions/${firstTx.tx_hash}`);
      console.log('✅ Transaction details:', txDetailResponse.data);
    }
    
    console.log('\n🎉 API Explorer is working! All endpoints responding correctly.');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ API server is not running on port 3001');
      console.log('💡 Try starting it with: npm run server');
    } else {
      console.error('❌ API test failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

testAPI();