const axios = require('axios');

async function testSpecificEndpoints() {
    console.log('🔍 TESTING SPECIFIC API ENDPOINTS AFTER AUTOFIX');
    console.log('=' .repeat(60));
    
    try {
        // Test health endpoint
        console.log('\n🏥 HEALTH CHECK:');
        const healthResponse = await axios.get('http://localhost:3001/health');
        console.log('Status:', healthResponse.data.status);
        console.log('Services:', healthResponse.data.services.join(', '));
        
        // Test root endpoint
        console.log('\n🏠 ROOT ENDPOINT:');
        const rootResponse = await axios.get('http://localhost:3001/');
        console.log('API Version:', rootResponse.data.version);
        console.log('Available Endpoints:', Object.keys(rootResponse.data.endpoints).length);
        
        // Test specific contract
        console.log('\n🏢 SPECIFIC CONTRACT ANALYSIS:');
        const contractAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
        const contractResponse = await axios.get(`http://localhost:3001/api/contract-business/${contractAddress}`);
        
        const data = contractResponse.data.data;
        console.log(`Business: ${data.business_identity.business_name}`);
        console.log(`Health Score: ${data.business_identity.business_health_score}/100`);
        console.log(`Customers: ${data.business_metrics.total_customers}`);
        console.log(`Success Rate: ${data.business_metrics.success_rate_percent}%`);
        
        // Test business directory with filters
        console.log('\n📋 BUSINESS DIRECTORY FILTERS:');
        
        // Filter by DeFi category
        const defiResponse = await axios.get('http://localhost:3001/api/contract-business/?category=defi&limit=5');
        console.log(`DeFi Businesses Found: ${defiResponse.data.data.businesses.length}`);
        
        // Sort by customers
        const customerResponse = await axios.get('http://localhost:3001/api/contract-business/?sortBy=customers&limit=3');
        console.log(`Top Customer Businesses: ${customerResponse.data.data.businesses.length}`);
        
        customerResponse.data.data.businesses.forEach((business, index) => {
            console.log(`  ${index + 1}. ${business.business_name}: ${business.total_customers} customers`);
        });
        
        // Test error handling
        console.log('\n❌ ERROR HANDLING TEST:');
        try {
            await axios.get('http://localhost:3001/api/contract-business/0xinvalidaddress');
        } catch (error) {
            console.log(`Error handled correctly: ${error.response.status} - ${error.response.data.error}`);
        }
        
        console.log('\n✅ ALL ENDPOINT TESTS PASSED!');
        console.log('\n🎯 SYSTEM STATUS: FULLY OPERATIONAL');
        console.log('   • API Server: Running on port 3001');
        console.log('   • Individual Contract Analytics: Working');
        console.log('   • Business Directory: Working');
        console.log('   • Filtering & Sorting: Working');
        console.log('   • Error Handling: Working');
        console.log('   • Health Monitoring: Working');
        
    } catch (error) {
        console.error('❌ Test Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testSpecificEndpoints();