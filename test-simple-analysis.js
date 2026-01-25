#!/usr/bin/env node

import fetch from 'node-fetch';

async function testSimpleAnalysis() {
  console.log('🧪 Simple Analysis Test...\n');
  
  try {
    // 1. Register user
    console.log('1️⃣ Registering user...');
    const userResponse = await fetch('http://localhost:5001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `simple${Date.now()}@example.com`,
        password: 'password123',
        name: 'Simple Test User'
      })
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`User registration failed: ${userResponse.status} - ${errorText}`);
    }
    
    const userData = await userResponse.json();
    console.log('✅ User registered');
    
    // 2. Create contract (use defaults from env)
    console.log('2️⃣ Creating contract...');
    const contractResponse = await fetch('http://localhost:5001/api/contracts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.token}`
      },
      body: JSON.stringify({}) // Empty body to use defaults from .env
    });
    
    if (!contractResponse.ok) {
      const errorText = await contractResponse.text();
      throw new Error(`Contract creation failed: ${contractResponse.status} - ${errorText}`);
    }
    
    const contractData = await contractResponse.json();
    console.log('✅ Contract created');
    console.log(`Contract ID: ${contractData.id || contractData.config?.id}`);
    
    // 3. Start analysis
    console.log('3️⃣ Starting analysis...');
    const configId = contractData.id || contractData.config?.id;
    const analysisResponse = await fetch('http://localhost:5001/api/analysis/start', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.token}`
      },
      body: JSON.stringify({
        configId: configId,
        analysisType: 'single'
      })
    });
    
    console.log(`Analysis response status: ${analysisResponse.status}`);
    
    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.log(`Error response: ${errorText}`);
      throw new Error(`Analysis start failed: ${analysisResponse.status} - ${errorText}`);
    }
    
    const analysisData = await analysisResponse.json();
    console.log('✅ Analysis started successfully');
    console.log(`Analysis ID: ${analysisData.analysisId}`);
    
    // 4. Check status
    console.log('4️⃣ Checking status...');
    const statusResponse = await fetch(`http://localhost:5001/api/analysis/${analysisData.analysisId}/status`, {
      headers: { 'Authorization': `Bearer ${userData.token}` }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`✅ Status: ${statusData.status} (${statusData.progress}%)`);
    }
    
    console.log('\n🎉 Simple test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

testSimpleAnalysis().catch(console.error);