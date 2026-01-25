#!/usr/bin/env node

import fetch from 'node-fetch';

async function testServerEnv() {
  console.log('🔍 Testing Server Environment Variables...\n');
  
  try {
    // Create a simple endpoint to check environment variables
    const response = await fetch('http://localhost:5000/health');
    const data = await response.json();
    
    console.log('✅ Server is running');
    
    // Test contract creation to see what values are used
    const userResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `envtest${Date.now()}@example.com`,
        password: 'password123',
        name: 'Env Test User'
      })
    });
    
    const userData = await userResponse.json();
    console.log('✅ User registered');
    
    // Create contract to see the actual values being used
    const contractResponse = await fetch('http://localhost:5000/api/contracts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.token}`
      },
      body: JSON.stringify({
        name: 'Env Test Contract',
        description: 'Testing environment variables'
      })
    });
    
    const contractData = await contractResponse.json();
    console.log('\n📋 Contract Analysis Params:');
    console.log('Block Range:', contractData.analysisParams?.blockRange);
    console.log('Failover Timeout:', contractData.analysisParams?.failoverTimeout);
    console.log('Max Retries:', contractData.analysisParams?.maxRetries);
    
    // Check if these match our expected values
    const expectedBlockRange = 10000;
    const expectedTimeout = 60000;
    
    if (contractData.analysisParams?.blockRange === expectedBlockRange) {
      console.log('✅ Block range matches expected value');
    } else {
      console.log(`❌ Block range mismatch: expected ${expectedBlockRange}, got ${contractData.analysisParams?.blockRange}`);
    }
    
    if (contractData.analysisParams?.failoverTimeout === expectedTimeout) {
      console.log('✅ Failover timeout matches expected value');
    } else {
      console.log(`❌ Failover timeout mismatch: expected ${expectedTimeout}, got ${contractData.analysisParams?.failoverTimeout}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testServerEnv().catch(console.error);