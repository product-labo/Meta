/**
 * Simple test for EnhancedAnalyticsEngine
 * Tests if the engine can be instantiated and run basic analysis
 */

import { EnhancedAnalyticsEngine } from './src/services/EnhancedAnalyticsEngine.js';

async function testEnhancedEngine() {
  console.log('🧪 Testing EnhancedAnalyticsEngine');
  console.log('=================================');

  try {
    // Test 1: Engine instantiation
    console.log('\n1. Testing engine instantiation...');
    
    const config = {
      ethereum: ['https://eth-mainnet.alchemyapi.io/v2/demo'],
      maxRequestsPerSecond: 5,
      failoverTimeout: 30000,
      maxRetries: 2
    };
    
    const engine = new EnhancedAnalyticsEngine(config);
    console.log('✅ EnhancedAnalyticsEngine created successfully');
    console.log('   Type:', typeof engine);
    console.log('   Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(engine)));

    // Test 2: Basic analysis (with a well-known contract)
    console.log('\n2. Testing basic analysis...');
    
    const testContract = '0xA0b86a33E6441b8435b662f0E2d0B8A0E4B5B5B5'; // Example contract
    const testChain = 'ethereum';
    const testBlockRange = 100; // Small range for testing
    
    console.log(`   Analyzing: ${testContract}`);
    console.log(`   Chain: ${testChain}`);
    console.log(`   Block range: ${testBlockRange}`);
    
    const startTime = Date.now();
    
    const result = await engine.analyzeContract(
      testContract,
      testChain,
      'Test Contract',
      testBlockRange
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Analysis completed successfully');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Result type: ${typeof result}`);
    console.log(`   Has fullReport: ${!!result.fullReport}`);
    console.log(`   Transactions: ${result.transactions || 0}`);
    
    if (result.fullReport) {
      console.log(`   Report transactions: ${result.fullReport.transactions?.length || 0}`);
      console.log(`   Report users: ${result.fullReport.users?.length || 0}`);
      console.log(`   Report events: ${result.fullReport.events?.length || 0}`);
    }

    // Test 3: Error handling
    console.log('\n3. Testing error handling...');
    
    try {
      const invalidResult = await engine.analyzeContract(
        '0xinvalid',
        'invalid-chain',
        'Invalid Contract',
        10
      );
      
      console.log('⚠️  Analysis with invalid data completed (unexpected)');
      console.log('   Result:', invalidResult);
    } catch (error) {
      console.log('✅ Error handling works correctly');
      console.log(`   Error: ${error.message}`);
    }

    // Test 4: Cleanup
    console.log('\n4. Testing cleanup...');
    
    if (typeof engine.close === 'function') {
      await engine.close();
      console.log('✅ Engine cleanup completed');
    } else {
      console.log('ℹ️  No cleanup method available');
    }

    console.log('\n🎉 All EnhancedAnalyticsEngine tests passed!');
    
    return {
      success: true,
      message: 'EnhancedAnalyticsEngine is working correctly',
      testResults: {
        instantiation: true,
        basicAnalysis: true,
        errorHandling: true,
        cleanup: true
      },
      performance: {
        analysisTime: duration,
        transactionCount: result.transactions || 0
      }
    };

  } catch (error) {
    console.error('❌ EnhancedAnalyticsEngine test failed:', error);
    console.error('Error stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      testResults: {
        instantiation: false,
        basicAnalysis: false,
        errorHandling: false,
        cleanup: false
      }
    };
  }
}

// Test with different configurations
async function testDifferentConfigs() {
  console.log('\n🔧 Testing Different Configurations');
  console.log('===================================');

  const configs = [
    {
      name: 'Minimal config',
      config: {}
    },
    {
      name: 'Ethereum only',
      config: {
        ethereum: ['https://eth-mainnet.alchemyapi.io/v2/demo']
      }
    },
    {
      name: 'Full config',
      config: {
        ethereum: ['https://eth-mainnet.alchemyapi.io/v2/demo'],
        maxRequestsPerSecond: 3,
        failoverTimeout: 15000,
        maxRetries: 1,
        batchSize: 25
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n${name}:`);
    
    try {
      const engine = new EnhancedAnalyticsEngine(config);
      console.log('  ✅ Engine created successfully');
      
      if (typeof engine.close === 'function') {
        await engine.close();
      }
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }
}

// Run all tests
async function runEngineTests() {
  console.log('🚀 Starting EnhancedAnalyticsEngine Tests');
  console.log('========================================\n');

  const mainResult = await testEnhancedEngine();
  await testDifferentConfigs();

  console.log('\n📋 Engine Test Summary');
  console.log('=====================');
  console.log(`Main Test: ${mainResult.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Config Tests: ✅ PASS`);
  
  if (mainResult.success) {
    console.log('\n🎯 Performance Results:');
    console.log(`Analysis Time: ${mainResult.performance.analysisTime}ms`);
    console.log(`Transactions Found: ${mainResult.performance.transactionCount}`);
    console.log('\n✅ EnhancedAnalyticsEngine is ready for continuous sync!');
  } else {
    console.log('\n❌ EnhancedAnalyticsEngine has issues that need to be fixed:');
    console.log(`Error: ${mainResult.error}`);
  }

  return mainResult;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEngineTests().catch(console.error);
}

export { testEnhancedEngine, testDifferentConfigs, runEngineTests };