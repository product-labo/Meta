const axios = require('axios');

async function testBusinessAPI() {
  const baseURL = 'http://localhost:3003';
  
  console.log('🔧 Testing Starknet Business Metrics API...\n');
  
  try {
    // Test health endpoint
    console.log('📊 Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test business directory
    console.log('\n📊 Testing business directory...');
    const businessResponse = await axios.get(`${baseURL}/api/contract-business`);
    console.log('✅ Business directory response:');
    console.log(`  - Success: ${businessResponse.data.success}`);
    console.log(`  - Total businesses: ${businessResponse.data.data.total_businesses}`);
    
    if (businessResponse.data.data.businesses.length > 0) {
      const firstBusiness = businessResponse.data.data.businesses[0];
      console.log('  - First business:', firstBusiness.business_name);
      console.log('  - Contract:', firstBusiness.contract_address.substring(0, 20) + '...');
      console.log('  - Customers:', firstBusiness.total_customers);
      console.log('  - Transactions:', firstBusiness.total_transactions);
      console.log('  - Category:', firstBusiness.category);
      
      // Test individual contract details
      console.log('\n📊 Testing contract details...');
      const contractResponse = await axios.get(`${baseURL}/api/contract-business/${firstBusiness.contract_address}`);
      console.log('✅ Contract details response:');
      console.log(`  - Success: ${contractResponse.data.success}`);
      console.log(`  - Business name: ${contractResponse.data.data.business_name}`);
      console.log(`  - Recent transactions: ${contractResponse.data.data.recent_transactions?.length || 0}`);
    }
    
    // Test network stats
    console.log('\n📊 Testing network statistics...');
    const statsResponse = await axios.get(`${baseURL}/api/stats/network`);
    console.log('✅ Network stats response:');
    console.log(`  - Network: ${statsResponse.data.data.network}`);
    console.log(`  - Total blocks: ${statsResponse.data.data.total_blocks.toLocaleString()}`);
    console.log(`  - Total transactions: ${statsResponse.data.data.total_transactions.toLocaleString()}`);
    console.log(`  - Total contracts: ${statsResponse.data.data.total_contracts.toLocaleString()}`);
    console.log(`  - Indexer status: ${statsResponse.data.data.indexer_status}`);
    
    console.log('\n🎉 Business Metrics API is working perfectly!');
    console.log('💡 The frontend can now connect to this API to display real Starknet business data.');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Business API server is not running on port 3003');
      console.log('💡 Try starting it with: node create-business-metrics-api.js');
    } else {
      console.error('❌ API test failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

testBusinessAPI();