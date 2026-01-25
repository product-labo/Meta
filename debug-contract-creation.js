#!/usr/bin/env node

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function debugContractCreation() {
  console.log('🔍 Debug Contract Creation...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('ANALYSIS_BLOCK_RANGE:', process.env.ANALYSIS_BLOCK_RANGE);
  console.log('FAILOVER_TIMEOUT:', process.env.FAILOVER_TIMEOUT);
  console.log('MAX_RETRIES:', process.env.MAX_RETRIES);
  
  // Test the API endpoint directly
  try {
    // First register a user
    const userResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `debug${Date.now()}@example.com`,
        password: 'password123',
        name: 'Debug User'
      })
    });
    
    const userData = await userResponse.json();
    console.log('\n✅ User registered:', userData.user.email);
    
    // Create contract configuration
    const contractResponse = await fetch('http://localhost:5000/api/contracts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.token}`
      },
      body: JSON.stringify({
        name: 'Debug Contract',
        description: 'Debug contract for testing'
      })
    });
    
    const contractData = await contractResponse.json();
    console.log('\n📋 Contract Configuration Created:');
    console.log('Block Range:', contractData.analysisParams?.blockRange);
    console.log('Failover Timeout:', contractData.analysisParams?.failoverTimeout);
    console.log('Max Retries:', contractData.analysisParams?.maxRetries);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugContractCreation().catch(console.error);