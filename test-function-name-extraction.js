/**
 * Test Function Name Extraction for UX Analysis
 * 
 * This test verifies that the enhanced analytics engine properly extracts
 * human-readable function names from transactions, which is essential for
 * generating meaningful user journey analytics including entry points,
 * dropoff points, and common user paths.
 */

import { EnhancedAnalyticsEngine } from './src/services/EnhancedAnalyticsEngine.js';
import { ChainNormalizer } from './src/services/ChainNormalizer.js';
import { AbiDecoderService } from './src/services/AbiDecoderService.js';
import fs from 'fs';
import path from 'path';

async function testFunctionNameExtraction() {
  console.log('🧪 Testing Function Name Extraction for UX Analysis');
  console.log('=' .repeat(60));
  
  try {
    // Load common DeFi ABI
    const abiPath = path.join(process.cwd(), 'abis', 'common-defi.json');
    const commonAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    console.log(`📋 Loaded common DeFi ABI with ${commonAbi.length} functions/events`);
    
    // Test ABI decoder directly
    console.log('\n1. Testing ABI Decoder Service');
    console.log('-'.repeat(40));
    
    const abiDecoder = new AbiDecoderService(commonAbi, 'ethereum');
    
    // Test common method IDs
    const testMethodIds = [
      '0xa9059cbb', // transfer
      '0x095ea7b3', // approve
      '0x23b872dd', // transferFrom
      '0xb6b55f25', // deposit
      '0x2e1a7d4d', // withdraw
      '0x128acb08', // stake
      '0xa694fc3a'  // unstake
    ];
    
    for (const methodId of testMethodIds) {
      const functionName = abiDecoder.getFunctionName(methodId);
      console.log(`   ${methodId} → ${functionName}`);
    }
    
    // Test ChainNormalizer with ABI
    console.log('\n2. Testing ChainNormalizer with ABI');
    console.log('-'.repeat(40));
    
    const normalizer = new ChainNormalizer(commonAbi, 'ethereum');
    
    // Create test transactions with various method IDs
    const testTransactions = [
      {
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 1000,
        timestamp: new Date().toISOString(),
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasUsed: '21000',
        gasPrice: '20000000000',
        status: true,
        input: '0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b60000000000000000000000000000000000000000000000000de0b6b3a7640000'
      },
      {
        hash: '0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1',
        blockNumber: 1001,
        timestamp: new Date().toISOString(),
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '45000',
        gasPrice: '20000000000',
        status: true,
        input: '0xb6b55f250000000000000000000000000000000000000000000000000de0b6b3a7640000'
      },
      {
        hash: '0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12',
        blockNumber: 1002,
        timestamp: new Date().toISOString(),
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '35000',
        gasPrice: '20000000000',
        status: true,
        input: '0x2e1a7d4d0000000000000000000000000000000000000000000000000de0b6b3a7640000'
      }
    ];
    
    const normalizedTxs = normalizer.normalizeTransactions(testTransactions, 'ethereum', commonAbi);
    
    console.log(`   Normalized ${normalizedTxs.length} transactions:`);
    for (const tx of normalizedTxs) {
      console.log(`   ${tx.hash.slice(0, 10)}... → ${tx.functionName} (${tx.method_id})`);
    }
    
    // Test Enhanced Analytics Engine
    console.log('\n3. Testing Enhanced Analytics Engine');
    console.log('-'.repeat(40));
    
    // Create mock fetcher for testing
    const mockFetcher = {
      getCurrentBlockNumber: async () => 1000,
      fetchContractInteractions: async () => ({
        transactions: testTransactions,
        events: [],
        summary: {
          totalTransactions: testTransactions.length,
          totalEvents: 0,
          eventTransactions: 0,
          directTransactions: testTransactions.length
        },
        method: 'interaction-based'
      }),
      close: async () => {}
    };
    
    const engine = new EnhancedAnalyticsEngine();
    engine.fetcher = mockFetcher;
    
    // Mock the _loadContractAbi method to return our test ABI
    engine._loadContractAbi = async () => commonAbi;
    
    const results = await engine.analyzeContract(
      '0x1234567890123456789012345678901234567890',
      'ethereum',
      'TestContract'
    );
    
    console.log('\n4. User Journey Analysis Results');
    console.log('-'.repeat(40));
    
    const userJourneys = results.userJourneys;
    console.log(`   Total users: ${userJourneys.totalUsers}`);
    console.log(`   Average journey length: ${userJourneys.averageJourneyLength}`);
    
    if (userJourneys.entryPoints && userJourneys.entryPoints.length > 0) {
      console.log('\n   📍 Entry Points:');
      userJourneys.entryPoints.forEach(entry => {
        console.log(`      ${entry.functionName}: ${entry.userCount} users (${entry.percentage.toFixed(1)}%)`);
      });
    } else {
      console.log('   ❌ No entry points detected');
    }
    
    if (userJourneys.dropoffPoints && userJourneys.dropoffPoints.length > 0) {
      console.log('\n   🚪 Dropoff Points:');
      userJourneys.dropoffPoints.forEach(dropoff => {
        console.log(`      ${dropoff.functionName}: ${dropoff.dropoffCount} dropoffs (${dropoff.dropoffPercentage.toFixed(1)}%)`);
      });
    } else {
      console.log('   ❌ No dropoff points detected');
    }
    
    if (userJourneys.commonPaths && userJourneys.commonPaths.length > 0) {
      console.log('\n   🛤️  Common User Paths:');
      userJourneys.commonPaths.forEach(path => {
        console.log(`      ${path.sequence.join(' → ')}: ${path.userCount} users`);
      });
    } else {
      console.log('   ❌ No common paths detected');
    }
    
    // Test UX Analysis
    console.log('\n5. UX Analysis Results');
    console.log('-'.repeat(40));
    
    const uxAnalysis = results.uxAnalysis;
    console.log(`   UX Grade: ${uxAnalysis.uxGrade?.grade || 'N/A'}`);
    console.log(`   Bottlenecks detected: ${uxAnalysis.bottlenecks?.length || 0}`);
    
    if (uxAnalysis.bottlenecks && uxAnalysis.bottlenecks.length > 0) {
      console.log('\n   🚧 UX Bottlenecks:');
      uxAnalysis.bottlenecks.forEach(bottleneck => {
        console.log(`      ${bottleneck.fromFunction} → ${bottleneck.toFunction}: ${(bottleneck.abandonmentRate * 100).toFixed(1)}% abandonment`);
      });
    }
    
    console.log('\n✅ Function Name Extraction Test Complete');
    
    // Summary
    const functionsWithNames = normalizedTxs.filter(tx => 
      tx.functionName && 
      tx.functionName !== 'unknown' && 
      !tx.functionName.startsWith('0x')
    );
    
    console.log('\n📊 Summary:');
    console.log(`   Function name extraction success: ${functionsWithNames.length}/${normalizedTxs.length} (${((functionsWithNames.length / normalizedTxs.length) * 100).toFixed(1)}%)`);
    console.log(`   Entry points detected: ${userJourneys.entryPoints?.length || 0}`);
    console.log(`   Dropoff points detected: ${userJourneys.dropoffPoints?.length || 0}`);
    console.log(`   Common paths detected: ${userJourneys.commonPaths?.length || 0}`);
    
    if (functionsWithNames.length === normalizedTxs.length && 
        userJourneys.entryPoints?.length > 0 && 
        userJourneys.dropoffPoints?.length > 0) {
      console.log('\n🎉 SUCCESS: Function name extraction and UX analysis working correctly!');
      return true;
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some issues detected with function name extraction or UX analysis');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testFunctionNameExtraction()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testFunctionNameExtraction };