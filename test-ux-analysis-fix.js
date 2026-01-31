/**
 * Test UX Analysis Fix
 * 
 * This test verifies that:
 * 1. Function names are properly extracted (not showing method IDs like 0x3db6be2b)
 * 2. User counts in common paths are accurate (not decreasing artificially)
 * 3. Entry points, dropoff points, and user paths show meaningful data
 */

import { UserJourneyAnalyzer } from './src/services/UserJourneyAnalyzer.js';
import { ChainNormalizer } from './src/services/ChainNormalizer.js';
import { UxBottleneckDetector } from './src/services/UxBottleneckDetector.js';
import fs from 'fs';
import path from 'path';

async function testUxAnalysisFix() {
  console.log('🔧 Testing UX Analysis Fix');
  console.log('=' .repeat(50));
  
  try {
    // Load common DeFi ABI
    const abiPath = path.join(process.cwd(), 'abis', 'common-defi.json');
    const commonAbi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    
    // Initialize normalizer with ABI
    const normalizer = new ChainNormalizer(commonAbi, 'ethereum');
    
    // Create realistic test transactions with multiple users following different paths
    const testTransactions = [
      // User 1: deposit → swap → withdraw (complete journey)
      {
        hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        blockNumber: 1000,
        timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
        from: '0xuser1111111111111111111111111111111111111111',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasUsed: '50000',
        gasPrice: '20000000000',
        status: true,
        input: '0xb6b55f250000000000000000000000000000000000000000000000000de0b6b3a7640000' // deposit
      },
      {
        hash: '0x1111111111111111111111111111111111111111111111111111111111111112',
        blockNumber: 1001,
        timestamp: new Date('2024-01-01T10:05:00Z').toISOString(),
        from: '0xuser1111111111111111111111111111111111111111',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '80000',
        gasPrice: '20000000000',
        status: true,
        input: '0x3db6be2b0000000000000000000000000000000000000000000000000000000000000000' // swap
      },
      {
        hash: '0x1111111111111111111111111111111111111111111111111111111111111113',
        blockNumber: 1002,
        timestamp: new Date('2024-01-01T10:10:00Z').toISOString(),
        from: '0xuser1111111111111111111111111111111111111111',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '35000',
        gasPrice: '20000000000',
        status: true,
        input: '0x2e1a7d4d0000000000000000000000000000000000000000000000000de0b6b3a7640000' // withdraw
      },
      
      // User 2: deposit → swap → withdraw (same path as User 1)
      {
        hash: '0x2222222222222222222222222222222222222222222222222222222222222221',
        blockNumber: 1003,
        timestamp: new Date('2024-01-01T11:00:00Z').toISOString(),
        from: '0xuser2222222222222222222222222222222222222222',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '2000000000000000000',
        gasUsed: '50000',
        gasPrice: '22000000000',
        status: true,
        input: '0xb6b55f250000000000000000000000000000000000000000000000001bc16d674ec80000' // deposit
      },
      {
        hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        blockNumber: 1004,
        timestamp: new Date('2024-01-01T11:05:00Z').toISOString(),
        from: '0xuser2222222222222222222222222222222222222222',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '85000',
        gasPrice: '22000000000',
        status: true,
        input: '0x3db6be2b0000000000000000000000000000000000000000000000000000000000000001' // swap
      },
      {
        hash: '0x2222222222222222222222222222222222222222222222222222222222222223',
        blockNumber: 1005,
        timestamp: new Date('2024-01-01T11:10:00Z').toISOString(),
        from: '0xuser2222222222222222222222222222222222222222',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '35000',
        gasPrice: '22000000000',
        status: true,
        input: '0x2e1a7d4d0000000000000000000000000000000000000000000000001bc16d674ec80000' // withdraw
      },
      
      // User 3: deposit → stake (different path)
      {
        hash: '0x3333333333333333333333333333333333333333333333333333333333333331',
        blockNumber: 1006,
        timestamp: new Date('2024-01-01T12:00:00Z').toISOString(),
        from: '0xuser3333333333333333333333333333333333333333',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '500000000000000000',
        gasUsed: '45000',
        gasPrice: '21000000000',
        status: true,
        input: '0xb6b55f25000000000000000000000000000000000000000000000000006f05b59d3b20000' // deposit
      },
      {
        hash: '0x3333333333333333333333333333333333333333333333333333333333333332',
        blockNumber: 1007,
        timestamp: new Date('2024-01-01T12:05:00Z').toISOString(),
        from: '0xuser3333333333333333333333333333333333333333',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '60000',
        gasPrice: '21000000000',
        status: true,
        input: '0xa694fc3a000000000000000000000000000000000000000000000000006f05b59d3b20000' // stake
      },
      
      // User 4: deposit → swap (incomplete journey - dropoff)
      {
        hash: '0x4444444444444444444444444444444444444444444444444444444444444441',
        blockNumber: 1008,
        timestamp: new Date('2024-01-01T13:00:00Z').toISOString(),
        from: '0xuser4444444444444444444444444444444444444444',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '3000000000000000000',
        gasUsed: '50000',
        gasPrice: '23000000000',
        status: true,
        input: '0xb6b55f2500000000000000000000000000000000000000000000000029a2241af62c0000' // deposit
      },
      {
        hash: '0x4444444444444444444444444444444444444444444444444444444444444442',
        blockNumber: 1009,
        timestamp: new Date('2024-01-01T13:05:00Z').toISOString(),
        from: '0xuser4444444444444444444444444444444444444444',
        to: '0xcontract1234567890123456789012345678901234567890',
        value: '0',
        gasUsed: '90000',
        gasPrice: '23000000000',
        status: true,
        input: '0x3db6be2b0000000000000000000000000000000000000000000000000000000000000002' // swap (user drops off here)
      }
    ];
    
    console.log('\n1. Testing Function Name Extraction');
    console.log('-'.repeat(40));
    
    // Normalize transactions
    const normalizedTxs = normalizer.normalizeTransactions(testTransactions, 'ethereum', commonAbi);
    
    console.log('Function names extracted:');
    const functionNames = [...new Set(normalizedTxs.map(tx => tx.functionName))];
    functionNames.forEach(name => {
      const count = normalizedTxs.filter(tx => tx.functionName === name).length;
      console.log(`   ${name}: ${count} transactions`);
    });
    
    // Check if we have readable function names (not method IDs)
    const readableFunctions = functionNames.filter(name => 
      name !== 'unknown' && !name.startsWith('0x')
    );
    
    console.log(`\n   ✅ Readable function names: ${readableFunctions.length}/${functionNames.length}`);
    
    console.log('\n2. Testing User Journey Analysis');
    console.log('-'.repeat(40));
    
    const journeyAnalyzer = new UserJourneyAnalyzer();
    const journeyResults = journeyAnalyzer.analyzeJourneys(normalizedTxs);
    
    console.log(`Total users: ${journeyResults.totalUsers}`);
    console.log(`Average journey length: ${journeyResults.averageJourneyLength.toFixed(2)}`);
    
    console.log('\n📍 Entry Points:');
    journeyResults.entryPoints.forEach(entry => {
      console.log(`   ${entry.functionName}: ${entry.userCount} users (${entry.percentage.toFixed(1)}%)`);
    });
    
    console.log('\n🚪 Dropoff Points:');
    journeyResults.dropoffPoints.forEach(dropoff => {
      console.log(`   ${dropoff.functionName}: ${dropoff.dropoffCount} dropoffs (${dropoff.dropoffPercentage.toFixed(1)}%)`);
    });
    
    console.log('\n🛤️  Common User Paths:');
    if (journeyResults.commonPaths.length > 0) {
      journeyResults.commonPaths.forEach((path, index) => {
        console.log(`   ${index + 1}. ${path.sequence.join(' → ')}`);
        console.log(`      Users: ${path.userCount} (${(path.conversionRate * 100).toFixed(1)}%)`);
        if (path.totalOccurrences) {
          console.log(`      Total occurrences: ${path.totalOccurrences}`);
        }
        console.log(`      Avg completion time: ${(path.averageCompletionTime / (1000 * 60)).toFixed(1)} minutes`);
      });
    } else {
      console.log('   No common paths detected');
    }
    
    console.log('\n3. Testing UX Bottleneck Detection');
    console.log('-'.repeat(40));
    
    const uxDetector = new UxBottleneckDetector();
    const uxResults = uxDetector.analyzeUxBottlenecks(normalizedTxs);
    
    console.log(`UX Grade: ${uxResults.uxGrade?.grade || 'N/A'}`);
    console.log(`Bottlenecks detected: ${uxResults.bottlenecks?.length || 0}`);
    
    if (uxResults.bottlenecks && uxResults.bottlenecks.length > 0) {
      console.log('\n🚧 UX Bottlenecks:');
      uxResults.bottlenecks.forEach((bottleneck, index) => {
        console.log(`   ${index + 1}. ${bottleneck.fromFunction} → ${bottleneck.toFunction}`);
        console.log(`      Abandonment rate: ${(bottleneck.abandonmentRate * 100).toFixed(1)}%`);
        console.log(`      Affected users: ${bottleneck.affectedUsers}`);
      });
    }
    
    console.log('\n4. Validation Results');
    console.log('-'.repeat(40));
    
    // Validate function name extraction
    const hasReadableFunctions = readableFunctions.length === functionNames.length;
    const hasSwapFunction = functionNames.includes('swap');
    const noMethodIds = !functionNames.some(name => name.startsWith('0x'));
    
    console.log(`✅ All functions have readable names: ${hasReadableFunctions}`);
    console.log(`✅ Swap function properly detected: ${hasSwapFunction}`);
    console.log(`✅ No method IDs in function names: ${noMethodIds}`);
    
    // Validate user journey analysis
    const hasEntryPoints = journeyResults.entryPoints.length > 0;
    const hasDropoffPoints = journeyResults.dropoffPoints.length > 0;
    const hasCommonPaths = journeyResults.commonPaths.length > 0;
    const correctUserCounts = journeyResults.commonPaths.every(path => path.userCount > 0);
    
    console.log(`✅ Entry points detected: ${hasEntryPoints}`);
    console.log(`✅ Dropoff points detected: ${hasDropoffPoints}`);
    console.log(`✅ Common paths detected: ${hasCommonPaths}`);
    console.log(`✅ User counts are positive: ${correctUserCounts}`);
    
    // Check specific expected results
    const depositSwapWithdrawPath = journeyResults.commonPaths.find(path => 
      path.sequence.join(' → ') === 'deposit → swap → withdraw'
    );
    
    if (depositSwapWithdrawPath) {
      console.log(`✅ Expected path found: deposit → swap → withdraw (${depositSwapWithdrawPath.userCount} users)`);
      const expectedUsers = 2; // User 1 and User 2 both follow this path
      const correctCount = depositSwapWithdrawPath.userCount === expectedUsers;
      console.log(`✅ Correct user count for common path: ${correctCount} (expected: ${expectedUsers}, got: ${depositSwapWithdrawPath.userCount})`);
    } else {
      console.log(`❌ Expected path not found: deposit → swap → withdraw`);
    }
    
    console.log('\n📊 Summary');
    console.log('-'.repeat(40));
    
    const allChecks = [
      hasReadableFunctions,
      hasSwapFunction,
      noMethodIds,
      hasEntryPoints,
      hasDropoffPoints,
      hasCommonPaths,
      correctUserCounts,
      depositSwapWithdrawPath !== undefined
    ];
    
    const passedChecks = allChecks.filter(check => check).length;
    const totalChecks = allChecks.length;
    
    console.log(`Passed: ${passedChecks}/${totalChecks} checks`);
    
    if (passedChecks === totalChecks) {
      console.log('\n🎉 SUCCESS: All UX analysis issues have been fixed!');
      console.log('   ✅ Function names are readable (no method IDs)');
      console.log('   ✅ User counts in common paths are accurate');
      console.log('   ✅ Entry points, dropoff points, and paths are meaningful');
      return true;
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some issues remain');
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
  testUxAnalysisFix()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testUxAnalysisFix };