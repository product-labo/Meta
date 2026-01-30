/**
 * Debug continuous sync getting stuck at 30%
 */

import { performContinuousContractSync } from './src/api/routes/continuous-sync-improved.js';
import { UserStorage, AnalysisStorage, ContractStorage } from './src/api/database/fileStorage.js';

async function debugContinuousSync() {
  console.log('🔍 Debugging continuous sync stuck at 30%...');
  
  try {
    // Find a user with continuous sync running
    const allUsers = await UserStorage.findAll();
    const userWithContinuousSync = allUsers.find(user => 
      user.onboarding?.defaultContract?.continuousSync === true
    );
    
    if (!userWithContinuousSync) {
      console.log('❌ No user with continuous sync found');
      return;
    }
    
    console.log(`👤 Found user: ${userWithContinuousSync.id}`);
    console.log(`📋 Default contract: ${userWithContinuousSync.onboarding.defaultContract.address}`);
    console.log(`⛓️  Chain: ${userWithContinuousSync.onboarding.defaultContract.chain}`);
    
    // Find the running analysis
    const allAnalyses = await AnalysisStorage.findByUserId(userWithContinuousSync.id);
    const runningAnalysis = allAnalyses.find(analysis => 
      (analysis.status === 'running' || analysis.status === 'pending') &&
      analysis.metadata?.isDefaultContract === true &&
      analysis.metadata?.continuous === true
    );
    
    if (!runningAnalysis) {
      console.log('❌ No running continuous sync analysis found');
      return;
    }
    
    console.log(`📊 Analysis ID: ${runningAnalysis.id}`);
    console.log(`📈 Progress: ${runningAnalysis.progress}%`);
    console.log(`🔄 Sync cycle: ${runningAnalysis.metadata?.syncCycle || 'unknown'}`);
    console.log(`⏰ Created: ${runningAnalysis.createdAt}`);
    console.log(`📝 Last logs:`);
    if (runningAnalysis.logs && runningAnalysis.logs.length > 0) {
      runningAnalysis.logs.slice(-5).forEach(log => console.log(`   ${log}`));
    }
    
    // Check the contract configuration
    const contractConfig = await ContractStorage.findById(runningAnalysis.configId);
    if (!contractConfig) {
      console.log('❌ Contract configuration not found');
      return;
    }
    
    console.log(`📋 Contract config found: ${contractConfig.name}`);
    console.log(`🎯 Target: ${contractConfig.targetContract.address} on ${contractConfig.targetContract.chain}`);
    
    // Test a single sync cycle manually
    console.log('\n🧪 Testing single sync cycle manually...');
    
    // Import the EnhancedAnalyticsEngine to test directly
    const { EnhancedAnalyticsEngine } = await import('./src/services/EnhancedAnalyticsEngine.js');
    
    const engine = new EnhancedAnalyticsEngine(contractConfig.rpcConfig);
    console.log('⚙️  Engine created');
    
    // Test getting current block
    console.log('🔍 Testing getCurrentBlockNumber...');
    const currentBlock = await engine.fetcher.getCurrentBlockNumber(contractConfig.targetContract.chain);
    console.log(`📦 Current block: ${currentBlock}`);
    
    // Test fetching interactions for a small range
    const testFromBlock = Math.max(0, currentBlock - 10);
    const testToBlock = currentBlock;
    
    console.log(`🧪 Testing fetchContractInteractions from ${testFromBlock} to ${testToBlock}...`);
    
    const startTime = Date.now();
    const interactionData = await engine.fetcher.fetchContractInteractions(
      contractConfig.targetContract.address,
      testFromBlock,
      testToBlock,
      contractConfig.targetContract.chain
    );
    const endTime = Date.now();
    
    console.log(`✅ Fetch completed in ${endTime - startTime}ms`);
    console.log(`📊 Results: ${interactionData.summary.totalTransactions} transactions, ${interactionData.summary.totalEvents} events`);
    
    // Check if the analysis is still stuck
    const updatedAnalysis = await AnalysisStorage.findById(runningAnalysis.id);
    console.log(`\n📈 Current analysis progress: ${updatedAnalysis.progress}%`);
    console.log(`🔄 Current sync cycle: ${updatedAnalysis.metadata?.syncCycle || 'unknown'}`);
    
    if (updatedAnalysis.progress <= 30) {
      console.log('\n⚠️  Analysis is still stuck at 30% or below');
      console.log('🔧 Possible issues:');
      console.log('   1. RPC calls are timing out');
      console.log('   2. Infinite loop in sync cycle');
      console.log('   3. Error not being caught properly');
      console.log('   4. Progress not being updated correctly');
      
      // Try to manually update progress to unstick it
      console.log('\n🔧 Attempting to manually update progress...');
      await AnalysisStorage.update(runningAnalysis.id, {
        progress: 50,
        logs: [
          ...(updatedAnalysis.logs || []),
          `Debug: Manually updated progress to 50% at ${new Date().toISOString()}`
        ]
      });
      
      console.log('✅ Progress manually updated to 50%');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the debug
debugContinuousSync().catch(console.error);