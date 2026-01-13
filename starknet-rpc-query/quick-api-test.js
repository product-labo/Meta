const axios = require('axios');

async function quickTest() {
  try {
    console.log('Testing API...');
    const response = await axios.get('http://localhost:3003/health');
    console.log('✅ API Health:', response.data);
    
    const businessResponse = await axios.get('http://localhost:3003/api/contract-business?limit=3');
    console.log('✅ Business Data:', businessResponse.data.success);
    console.log('📊 Found businesses:', businessResponse.data.data.total_businesses);
    
    if (businessResponse.data.data.businesses.length > 0) {
      const first = businessResponse.data.data.businesses[0];
      console.log('🏢 First business:', first.business_name);
      console.log('👥 Customers:', first.total_customers);
      console.log('💸 Transactions:', first.total_transactions);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

quickTest();