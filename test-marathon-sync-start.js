/**
 * Test Marathon Sync Start Process
 * Debug why marathon sync isn't starting as continuous
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYzA3ZTY2NC03ZTg2LTQ3YzUtOGE4Ni0zM2RlYTA1M2NmOWQiLCJlbWFpbCI6ImVsZ3Jhdmljb2Rlc2hAZ21haWwuY29tIiwidGllciI6ImZyZWUiLCJpYXQiOjE3Njk2MTI5OTMsImV4cCI6MTc3MDIxNzc5M30.5xL7kjCZKES7G9D4PX5oq_tNtY5eWuAemvdunpXLiiI';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`,
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

console.log('🚀 Testing Marathon Sync Start Process...\n');

// Test 1: Start marathon sync with explicit continuous flag
console.log('1. Starting marathon sync with continuous=true...');
try {
  const { status, data } = await apiRequest('/api/onboarding/refresh-default-contract', {
    method: 'POST',
    body: JSON.stringify({ continuous: true })
  });
  
  console.log(`   Status: ${status}`);
  console.log(`   Message: ${data.message}`);
  console.log(`   Analysis ID: ${data.analysisId}`);
  console.log(`   Continuous: ${data.continuous}`);
  console.log(`   Is Update: ${data.isUpdate}`);
  
  if (data.analysisId) {
    console.log('\n   Waiting 10 seconds to monitor progress...');
    
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check status
      const { status: statusCheck, data: statusData } = await apiRequest('/api/onboarding/status');
      console.log(`   Check ${i+1}: Progress ${statusData.indexingProgress}%, Continuous: ${statusData.continuousSyncActive}`);
      
      // Check default contract
      const { status: contractStatus, data: contractData } = await apiRequest('/api/onboarding/default-contract');
      if (contractStatus === 200) {
        const latest = contractData.analysisHistory?.latest;
        console.log(`   Analysis Status: ${latest?.status}, Continuous: ${contractData.contract?.continuousSync}`);
        
        if (contractData.fullResults?.fullReport?.metadata) {
          const metadata = contractData.fullResults.fullReport.metadata;
          console.log(`   Sync Cycle: ${metadata.syncCycle}, Continuous: ${metadata.continuous}`);
        }
      }
    }
  }
  
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
}

console.log('\n🎯 Test Complete!');