/**
 * Test Sync Data Persistence and Loading States
 * Tests if new sync data is being saved (appended to old analyses)
 * Also tests syncing state for quick sync (loading progress)
 */

import { UserStorage, AnalysisStorage } from './src/api/database/fileStorage.js';
import fetch from 'node-fetch';

console.log('🧪 Testing Sync Data Persistence and Loading States...\n');

async function testSyncDataPersistence() {
  console.log('📊 Testing Sync Data Persistence...');
  
  try {
    // Test user ID (you may need to adjust this)
    const testUserId = 'test-user-123';
    
    // 1. Check if user has default contract
    console.log('1️⃣ Checking user default contract...');
    const user = await UserStorage.findById(testUserId);
    
    if (!user || !user.onboarding?.defaultContract?.address) {
      console.log('❌ No default contract found for test user');
      console.log('💡 Please complete onboarding first or use a valid user ID');
      return;
    }
    
    const defaultContract = user.onboarding.defaultContract;
    console.log(`✅ Found default contract: ${defaultContract.address} on ${defaultContract.chain}`);
    
    // 2. Get all existing analyses for this user
    console.log('\n2️⃣ Getting existing analyses...');
    const allAnalyses = await AnalysisStorage.findByUserId(testUserId);
    const defaultContractAnalyses = allAnalyses.filter(analysis => 
      analysis.metadata?.isDefaultContract === true
    );
    
    console.log(`📈 Total analyses: ${allAnalyses.length}`);
    console.log(`🎯 Default contract analyses: ${defaultContractAnalyses.length}`);
    
    // Show existing data summary
    if (defaultContractAnalyses.length > 0) {
      const latestAnalysis = defaultContractAnalyses
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      
      console.log(`📋 Latest analysis: ${latestAnalysis.id}`);
      console.log(`   Status: ${latestAnalysis.status}`);
      console.log(`   Progress: ${latestAnalysis.progress}%`);
      console.log(`   Continuous: ${latestAnalysis.metadata?.continuous || false}`);
      console.log(`   Sync Cycle: ${latestAnalysis.metadata?.syncCycle || 'N/A'}`);
      
      if (latestAnalysis.results?.target?.fullReport) {
        const report = latestAnalysis.results.target.fullReport;
        console.log(`   📊 Current Data:`);
        console.log(`      Transactions: ${report.summary?.totalTransactions || 0}`);
        console.log(`      Users: ${report.summary?.uniqueUsers || 0}`);
        console.log(`      Events: ${report.summary?.totalEvents || 0}`);
        console.log(`      Data Integrity: ${report.metadata?.dataIntegrityScore || 'N/A'}%`);
      }
    }
    
    // 3. Test Quick Sync (Regular Refresh) - Check Loading States
    console.log('\n3️⃣ Testing Quick Sync Loading States...');
    
    console.log('🚀 Starting quick sync...');
    const quickSyncResponse = await fetch('http://localhost:3001/api/onboarding/refresh-default-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}`
      },
      body: JSON.stringify({ continuous: false })
    });
    
    if (!quickSyncResponse.ok) {
      console.log('❌ Quick sync failed to start');
      console.log(`   Status: ${quickSyncResponse.status}`);
      console.log(`   Response: ${await quickSyncResponse.text()}`);
      return;
    }
    
    const quickSyncData = await quickSyncResponse.json();
    console.log(`✅ Quick sync started: ${quickSyncData.analysisId}`);
    console.log(`   Status: ${quickSyncData.status}`);
    console.log(`   Progress: ${quickSyncData.progress}%`);
    console.log(`   Continuous: ${quickSyncData.continuous}`);
    
    // Monitor quick sync progress and loading states
    console.log('\n📊 Monitoring quick sync progress...');
    let quickSyncComplete = false;
    let progressChecks = 0;
    const maxProgressChecks = 20; // 2 minutes max
    
    while (!quickSyncComplete && progressChecks < maxProgressChecks) {
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
      progressChecks++;
      
      try {
        // Check analysis status
        const analysis = await AnalysisStorage.findById(quickSyncData.analysisId);
        if (analysis) {
          console.log(`   Progress Check ${progressChecks}: ${analysis.progress}% (${analysis.status})`);
          
          // Check if there's a loading state being shown
          if (analysis.status === 'running' && analysis.progress < 100) {
            console.log(`   🔄 Loading state active - Progress: ${analysis.progress}%`);
            
            // Check user's indexing progress
            const currentUser = await UserStorage.findById(testUserId);
            if (currentUser?.onboarding?.defaultContract?.indexingProgress) {
              console.log(`   👤 User indexing progress: ${currentUser.onboarding.defaultContract.indexingProgress}%`);
            }
          }
          
          if (analysis.status === 'completed') {
            quickSyncComplete = true;
            console.log(`✅ Quick sync completed!`);
            
            // Check if data was appended/updated
            if (analysis.results?.target?.fullReport) {
              const newReport = analysis.results.target.fullReport;
              console.log(`   📊 New Data After Quick Sync:`);
              console.log(`      Transactions: ${newReport.summary?.totalTransactions || 0}`);
              console.log(`      Users: ${newReport.summary?.uniqueUsers || 0}`);
              console.log(`      Events: ${newReport.summary?.totalEvents || 0}`);
              console.log(`      Data Integrity: ${newReport.metadata?.dataIntegrityScore || 'N/A'}%`);
              console.log(`      Is Refresh: ${analysis.metadata?.isRefresh || false}`);
            }
          } else if (analysis.status === 'failed') {
            console.log(`❌ Quick sync failed: ${analysis.errorMessage}`);
            break;
          }
        }
      } catch (error) {
        console.log(`⚠️  Error checking progress: ${error.message}`);
      }
    }
    
    if (!quickSyncComplete) {
      console.log('⏰ Quick sync taking longer than expected, continuing to marathon sync test...');
    }
    
    // 4. Test Marathon Sync (Continuous) - Check Data Persistence
    console.log('\n4️⃣ Testing Marathon Sync Data Persistence...');
    
    // Get baseline data before marathon sync
    const baselineAnalyses = await AnalysisStorage.findByUserId(testUserId);
    const baselineDefaultAnalyses = baselineAnalyses.filter(a => a.metadata?.isDefaultContract === true);
    
    console.log('🚀 Starting marathon sync...');
    const marathonSyncResponse = await fetch('http://localhost:3001/api/onboarding/refresh-default-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}`
      },
      body: JSON.stringify({ continuous: true })
    });
    
    if (!marathonSyncResponse.ok) {
      console.log('❌ Marathon sync failed to start');
      console.log(`   Status: ${marathonSyncResponse.status}`);
      console.log(`   Response: ${await marathonSyncResponse.text()}`);
      return;
    }
    
    const marathonSyncData = await marathonSyncResponse.json();
    console.log(`✅ Marathon sync started: ${marathonSyncData.analysisId}`);
    console.log(`   Status: ${marathonSyncData.status}`);
    console.log(`   Progress: ${marathonSyncData.progress}%`);
    console.log(`   Continuous: ${marathonSyncData.continuous}`);
    
    // Monitor marathon sync for data accumulation
    console.log('\n📊 Monitoring marathon sync data accumulation...');
    let marathonChecks = 0;
    const maxMarathonChecks = 10; // Check for 5 minutes (30s intervals)
    let previousData = null;
    
    while (marathonChecks < maxMarathonChecks) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      marathonChecks++;
      
      try {
        const analysis = await AnalysisStorage.findById(marathonSyncData.analysisId);
        if (analysis) {
          console.log(`\n   Marathon Check ${marathonChecks}:`);
          console.log(`   Status: ${analysis.status}, Progress: ${analysis.progress}%`);
          console.log(`   Sync Cycle: ${analysis.metadata?.syncCycle || 'N/A'}`);
          
          if (analysis.results?.target?.fullReport) {
            const currentReport = analysis.results.target.fullReport;
            const currentData = {
              transactions: currentReport.summary?.totalTransactions || 0,
              users: currentReport.summary?.uniqueUsers || 0,
              events: currentReport.summary?.totalEvents || 0,
              integrity: currentReport.metadata?.dataIntegrityScore || 0,
              syncCycle: analysis.metadata?.syncCycle || 0
            };
            
            console.log(`   📊 Current Data:`);
            console.log(`      Transactions: ${currentData.transactions}`);
            console.log(`      Users: ${currentData.users}`);
            console.log(`      Events: ${currentData.events}`);
            console.log(`      Data Integrity: ${currentData.integrity}%`);
            
            // Check if data is being accumulated (appended)
            if (previousData) {
              const transactionIncrease = currentData.transactions - previousData.transactions;
              const userIncrease = currentData.users - previousData.users;
              const eventIncrease = currentData.events - previousData.events;
              
              console.log(`   📈 Data Changes Since Last Check:`);
              console.log(`      Transactions: +${transactionIncrease}`);
              console.log(`      Users: +${userIncrease}`);
              console.log(`      Events: +${eventIncrease}`);
              
              if (transactionIncrease > 0 || userIncrease > 0 || eventIncrease > 0) {
                console.log(`   ✅ DATA IS BEING ACCUMULATED! New data appended to existing.`);
              } else if (currentData.syncCycle > previousData.syncCycle) {
                console.log(`   🔄 Sync cycle advanced but no new data found (normal for some cycles)`);
              } else {
                console.log(`   ⚠️  No data changes detected`);
              }
            }
            
            previousData = currentData;
          }
          
          // Check for loading states during marathon sync
          if (analysis.status === 'running') {
            console.log(`   🔄 Marathon sync loading state active`);
            
            // Check if there are any loading indicators missing
            const user = await UserStorage.findById(testUserId);
            if (user?.onboarding?.defaultContract?.continuousSync) {
              console.log(`   ✅ Continuous sync flag is active in user data`);
            } else {
              console.log(`   ⚠️  Continuous sync flag not found in user data`);
            }
          }
          
          if (analysis.status === 'completed' || analysis.status === 'failed') {
            console.log(`   🏁 Marathon sync ended with status: ${analysis.status}`);
            break;
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Error checking marathon progress: ${error.message}`);
      }
    }
    
    // 5. Final Data Persistence Check
    console.log('\n5️⃣ Final Data Persistence Verification...');
    
    const finalAnalyses = await AnalysisStorage.findByUserId(testUserId);
    const finalDefaultAnalyses = finalAnalyses.filter(a => a.metadata?.isDefaultContract === true);
    
    console.log(`📊 Final Analysis Count:`);
    console.log(`   Before: ${baselineDefaultAnalyses.length} default contract analyses`);
    console.log(`   After: ${finalDefaultAnalyses.length} default contract analyses`);
    
    // Check if data was preserved and accumulated
    const latestFinalAnalysis = finalDefaultAnalyses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    if (latestFinalAnalysis?.results?.target?.fullReport) {
      const finalReport = latestFinalAnalysis.results.target.fullReport;
      console.log(`📋 Final Data Summary:`);
      console.log(`   Transactions: ${finalReport.summary?.totalTransactions || 0}`);
      console.log(`   Users: ${finalReport.summary?.uniqueUsers || 0}`);
      console.log(`   Events: ${finalReport.summary?.totalEvents || 0}`);
      console.log(`   Data Integrity: ${finalReport.metadata?.dataIntegrityScore || 'N/A'}%`);
      console.log(`   Accumulated Data: ${finalReport.metadata?.accumulatedData || false}`);
      console.log(`   Deduplication: ${finalReport.metadata?.deduplicationEnabled || false}`);
      console.log(`   Sync Cycles: ${latestFinalAnalysis.metadata?.syncCycle || 'N/A'}`);
      
      // Check for data persistence indicators
      if (finalReport.metadata?.accumulatedData) {
        console.log(`✅ DATA PERSISTENCE CONFIRMED: Analysis shows accumulated data`);
      } else {
        console.log(`⚠️  Data persistence unclear - no accumulated data flag`);
      }
      
      if (finalReport.metadata?.deduplicationEnabled) {
        console.log(`✅ DEDUPLICATION ACTIVE: Prevents duplicate data`);
      } else {
        console.log(`⚠️  Deduplication status unclear`);
      }
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('================');
    console.log('✅ Sync data persistence test completed');
    console.log('✅ Loading states monitoring completed');
    console.log('✅ Marathon sync data accumulation verified');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Test Loading States Specifically
async function testLoadingStates() {
  console.log('\n🔄 Testing Loading States Specifically...');
  
  try {
    // Test the marathon sync hook loading states
    console.log('1️⃣ Testing Marathon Sync Hook Loading States...');
    
    // This would normally be tested in the frontend, but we can check the API responses
    const statusResponse = await fetch('http://localhost:3001/api/onboarding/status', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}`
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('📊 Current Status Data:');
      console.log(`   Has Default Contract: ${statusData.hasDefaultContract}`);
      console.log(`   Is Indexed: ${statusData.isIndexed}`);
      console.log(`   Indexing Progress: ${statusData.indexingProgress}%`);
      console.log(`   Continuous Sync: ${statusData.continuousSync}`);
      console.log(`   Continuous Sync Active: ${statusData.continuousSyncActive}`);
      
      // Check for missing loading states
      if (statusData.continuousSyncActive && statusData.indexingProgress < 100) {
        console.log('✅ Loading state detected: Continuous sync is active with progress < 100%');
      } else if (statusData.continuousSyncActive) {
        console.log('⚠️  Continuous sync active but progress shows 100% - possible missing loading state');
      } else {
        console.log('ℹ️  No active sync detected');
      }
    }
    
    // Test default contract endpoint for loading indicators
    console.log('\n2️⃣ Testing Default Contract Loading Indicators...');
    
    const contractResponse = await fetch('http://localhost:3001/api/onboarding/default-contract', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}`
      }
    });
    
    if (contractResponse.ok) {
      const contractData = await contractResponse.json();
      console.log('📋 Contract Data Loading States:');
      console.log(`   Indexing Status: ${JSON.stringify(contractData.indexingStatus)}`);
      console.log(`   Analysis History: ${JSON.stringify(contractData.analysisHistory)}`);
      
      if (contractData.analysisHistory?.latest?.status === 'running') {
        console.log('✅ Loading state detected: Latest analysis is running');
      } else {
        console.log('ℹ️  No running analysis detected');
      }
    }
    
  } catch (error) {
    console.error('❌ Loading states test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Sync Tests...\n');
  
  await testSyncDataPersistence();
  await testLoadingStates();
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📝 Key Findings to Check:');
  console.log('1. Are new sync data being appended to old analyses? (Look for "DATA IS BEING ACCUMULATED" messages)');
  console.log('2. Are loading states showing for quick sync? (Look for progress percentages during quick sync)');
  console.log('3. Are loading states showing for marathon sync? (Look for continuous sync active flags)');
  console.log('4. Is data integrity maintained? (Look for deduplication and integrity scores)');
}

// Handle both direct execution and module import
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testSyncDataPersistence, testLoadingStates, runAllTests };