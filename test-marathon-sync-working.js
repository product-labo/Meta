/**
 * Test Marathon Sync Working Status
 * Check if marathon sync is actually working with continuous cycles
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

console.log('🚀 Testing Marathon Sync Functionality...\n');

// Step 1: Start marathon sync
console.log('1. Starting marathon sync...');
const { status: startStatus, data: startData } = await apiRequest('/api/onboarding/refresh-default-contract', {
  method: 'POST',
  body: JSON.stringify({ continuous: true })
});

console.log(`   Status: ${startStatus}`);
console.log(`   Message: "${startData.message}"`);
console.log(`   Continuous: ${startData.continuous}`);
console.log(`   Analysis ID: ${startData.analysisId}`);

if (startStatus === 200 && startData.continuous === true) {
  console.log('   ✅ Marathon sync started successfully!');
  
  // Step 2: Monitor progress for 2 minutes
  console.log('\n2. Monitoring progress for 2 minutes...');
  
  let previousCycle = 0;
  let previousTransactions = 0;
  let cycleChanges = 0;
  
  for (let i = 0; i < 8; i++) { // 8 checks over 2 minutes (15 seconds each)
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
    
    // Check status
    const { status: statusCheck, data: statusData } = await apiRequest('/api/onboarding/status');
    const { status: contractStatus, data: contractData } = await apiRequest('/api/onboarding/default-contract');
    
    if (statusCheck === 200 && contractStatus === 200) {
      const progress = statusData.indexingProgress || 0;
      const isActive = statusData.continuousSyncActive;
      const fullReport = contractData.fullResults?.fullReport;
      const currentCycle = fullReport?.metadata?.syncCycle || 0;
      const currentTransactions = fullReport?.summary?.totalTransactions || 0;
      
      console.log(`   Check ${i+1}: Progress ${progress}%, Active: ${isActive}, Cycle: ${currentCycle}, Transactions: ${currentTransactions}`);
      
      // Track cycle changes
      if (currentCycle > previousCycle) {
        cycleChanges++;
        console.log(`     🔄 Cycle increased from ${previousCycle} to ${currentCycle}!`);
      }
      
      // Track transaction changes
      if (currentTransactions > previousTransactions) {
        console.log(`     📈 Transactions increased from ${previousTransactions} to ${currentTransactions}!`);
      }
      
      previousCycle = currentCycle;
      previousTransactions = currentTransactions;
    } else {
      console.log(`   Check ${i+1}: API Error - Status: ${statusCheck}, Contract: ${contractStatus}`);
    }
  }
  
  // Step 3: Analyze results
  console.log('\n3. Analysis Results:');
  console.log(`   Cycle Changes Detected: ${cycleChanges}`);
  
  if (cycleChanges > 0) {
    console.log('   ✅ SUCCESS: Marathon sync is working! Cycles are incrementing.');
    console.log('   🎯 The improved continuous sync function is active.');
  } else {
    console.log('   ❌ ISSUE: No cycle changes detected in 2 minutes.');
    console.log('   🔍 This suggests the old function might still be running.');
  }
  
  // Step 4: Try to stop (this might fail with 404 until server restart)
  console.log('\n4. Attempting to stop marathon sync...');
  const { status: stopStatus, data: stopData } = await apiRequest('/api/onboarding/stop-continuous-sync', {
    method: 'POST'
  });
  
  console.log(`   Stop Status: ${stopStatus}`);
  if (stopStatus === 404) {
    console.log('   ❌ Stop endpoint still returns 404 - server needs full restart');
    console.log('   💡 Marathon sync is running but stop functionality needs server restart');
  } else {
    console.log(`   ✅ Stop endpoint works: ${stopData.message}`);
  }
  
} else {
  console.log('   ❌ Failed to start marathon sync properly');
}

console.log('\n🎯 Test Complete!');
console.log('\n📋 Summary:');
console.log('- If cycles increment: Marathon sync is working with improved function');
console.log('- If no cycle changes: Old function still being used');
console.log('- If stop returns 404: Server needs restart for stop functionality');