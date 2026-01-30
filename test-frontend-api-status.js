/**
 * Test what the frontend API endpoints are returning
 */

import fetch from 'node-fetch';

async function testFrontendAPI() {
  console.log('🔍 Testing frontend API endpoints...');
  
  const baseUrl = 'http://localhost:5000';
  
  // We need to simulate a logged-in user - let's use the test user
  const testUserId = 'test-user-sync-123';
  
  try {
    // Test onboarding status endpoint
    console.log('\n📊 Testing /api/onboarding/status...');
    
    const statusResponse = await fetch(`${baseUrl}/api/onboarding/status`, {
      headers: {
        'Authorization': `Bearer test-token`,
        'Content-Type': 'application/json',
        // Simulate the user ID in headers (this is how the auth middleware would set it)
        'x-user-id': testUserId
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status response:', JSON.stringify(statusData, null, 2));
    } else {
      console.log('❌ Status request failed:', statusResponse.status, statusResponse.statusText);
      const errorText = await statusResponse.text();
      console.log('Error details:', errorText);
    }
    
    // Test default contract endpoint
    console.log('\n📋 Testing /api/onboarding/default-contract...');
    
    const contractResponse = await fetch(`${baseUrl}/api/onboarding/default-contract`, {
      headers: {
        'Authorization': `Bearer test-token`,
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      }
    });
    
    if (contractResponse.ok) {
      const contractData = await contractResponse.json();
      console.log('✅ Contract response:');
      console.log('   Contract:', contractData.contract?.name, contractData.contract?.address);
      console.log('   Indexing Status:', contractData.indexingStatus);
      console.log('   Analysis History:', contractData.analysisHistory);
      console.log('   Metrics available:', !!contractData.metrics);
      console.log('   Full results available:', !!contractData.fullResults);
      
      if (contractData.analysisHistory?.latest) {
        console.log('   Latest analysis:', {
          id: contractData.analysisHistory.latest.id,
          status: contractData.analysisHistory.latest.status,
          createdAt: contractData.analysisHistory.latest.createdAt,
          hasError: contractData.analysisHistory.latest.hasError
        });
      }
    } else {
      console.log('❌ Contract request failed:', contractResponse.status, contractResponse.statusText);
      const errorText = await contractResponse.text();
      console.log('Error details:', errorText);
    }
    
    // Test debug analysis endpoint
    console.log('\n🔍 Testing /api/onboarding/debug-analysis...');
    
    const debugResponse = await fetch(`${baseUrl}/api/onboarding/debug-analysis`, {
      headers: {
        'Authorization': `Bearer test-token`,
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      }
    });
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('✅ Debug response:');
      console.log('   User onboarding:', debugData.user?.onboarding?.defaultContract);
      console.log('   Analyses:', debugData.analyses);
      console.log('   Running analyses:', debugData.runningAnalyses?.length || 0);
      console.log('   Continuous analyses:', debugData.continuousAnalyses?.length || 0);
      
      if (debugData.runningAnalyses?.length > 0) {
        console.log('   Running analysis details:');
        debugData.runningAnalyses.forEach(analysis => {
          console.log(`     ${analysis.id}: ${analysis.status} ${analysis.progress}% (continuous: ${analysis.continuous})`);
        });
      }
    } else {
      console.log('❌ Debug request failed:', debugResponse.status, debugResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFrontendAPI().catch(console.error);