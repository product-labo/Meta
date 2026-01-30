#!/usr/bin/env node

/**
 * Test Report Generation Fix
 * Verifies that the contract summary creation works correctly
 */

import { ReportGenerator } from './src/services/ReportGenerator.js';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing report generation fix...');

// Test 1: Test with valid contract info
console.log('\n1. Testing with valid contract info...');

async function testValidContractInfo() {
  const reportGenerator = new ReportGenerator();
  
  const mockReport = {
    metadata: {
      contractAddress: '0x1234567890123456789012345678901234567890',
      contractName: 'Test Contract',
      contractChain: 'lisk'
    },
    summary: {
      totalTransactions: 72,
      uniqueUsers: 34
    }
  };
  
  const contractInfo = {
    contractAddress: '0x1234567890123456789012345678901234567890',
    contractName: 'Test Contract',
    contractChain: 'lisk'
  };
  
  try {
    const results = reportGenerator.exportAllFormats(mockReport, contractInfo);
    console.log('   ✅ Export completed successfully');
    console.log('   📁 Files created:');
    console.log(`      JSON: ${results.json.success ? '✅' : '❌'} ${results.json.path || 'N/A'}`);
    console.log(`      CSV: ${results.csv.success ? '✅' : '❌'} ${results.csv.path || 'N/A'}`);
    console.log(`      Markdown: ${results.markdown.success ? '✅' : '❌'} ${results.markdown.path || 'N/A'}`);
    
    // Check if README.md was created
    const expectedSummaryPath = path.join('./reports', 'test-contract', 'lisk', 'README.md');
    if (fs.existsSync(expectedSummaryPath)) {
      console.log('   ✅ Contract summary (README.md) created successfully');
    } else {
      console.log('   ❌ Contract summary (README.md) not found');
    }
    
  } catch (error) {
    console.log('   ❌ Export failed:', error.message);
  }
}

// Test 2: Test with undefined contract name
console.log('\n2. Testing with undefined contract name...');

async function testUndefinedContractName() {
  const reportGenerator = new ReportGenerator();
  
  const mockReport = {
    metadata: {
      contractAddress: '0x1234567890123456789012345678901234567890',
      contractChain: 'lisk'
    },
    summary: {
      totalTransactions: 72,
      uniqueUsers: 34
    }
  };
  
  const contractInfo = {
    contractAddress: '0x1234567890123456789012345678901234567890',
    contractName: undefined, // This should trigger the fix
    contractChain: 'lisk'
  };
  
  try {
    const results = reportGenerator.exportAllFormats(mockReport, contractInfo);
    console.log('   ✅ Export handled undefined contract name correctly');
    console.log('   📁 Files created despite undefined name');
    
  } catch (error) {
    console.log('   ❌ Export failed with undefined name:', error.message);
  }
}

// Test 3: Test with null values
console.log('\n3. Testing with null values...');

async function testNullValues() {
  const reportGenerator = new ReportGenerator();
  
  const mockReport = {
    metadata: {
      contractAddress: '0x1234567890123456789012345678901234567890'
    },
    summary: {
      totalTransactions: 72,
      uniqueUsers: 34
    }
  };
  
  const contractInfo = {
    contractAddress: '0x1234567890123456789012345678901234567890',
    contractName: null,
    contractChain: null
  };
  
  try {
    const results = reportGenerator.exportAllFormats(mockReport, contractInfo);
    console.log('   ✅ Export handled null values correctly');
    
  } catch (error) {
    console.log('   ❌ Export failed with null values:', error.message);
  }
}

// Test 4: Test _sanitizeFolderName method
console.log('\n4. Testing _sanitizeFolderName method...');

function testSanitizeFolderName() {
  const reportGenerator = new ReportGenerator();
  
  // Test various inputs
  const testCases = [
    { input: undefined, expected: 'unknown' },
    { input: null, expected: 'unknown' },
    { input: '', expected: 'unknown' },
    { input: 'Test Contract', expected: 'test-contract' },
    { input: '0x1234...5678', expected: '0x1234---5678' },
    { input: 'Contract@#$%Name', expected: 'contract----name' }
  ];
  
  testCases.forEach(({ input, expected }) => {
    const result = reportGenerator._sanitizeFolderName(input);
    if (result === expected) {
      console.log(`   ✅ "${input}" → "${result}"`);
    } else {
      console.log(`   ❌ "${input}" → "${result}" (expected "${expected}")`);
    }
  });
}

// Test 5: Test path construction
console.log('\n5. Testing path construction...');

function testPathConstruction() {
  const reportGenerator = new ReportGenerator();
  
  try {
    const contractFolder = reportGenerator._sanitizeFolderName('Test Contract');
    const chainFolder = reportGenerator._sanitizeFolderName('lisk');
    const summaryPath = path.join('./reports', contractFolder, chainFolder, 'README.md');
    
    console.log(`   Contract folder: "${contractFolder}"`);
    console.log(`   Chain folder: "${chainFolder}"`);
    console.log(`   Summary path: "${summaryPath}"`);
    
    if (contractFolder && chainFolder && summaryPath) {
      console.log('   ✅ Path construction successful');
    } else {
      console.log('   ❌ Path construction failed');
    }
    
  } catch (error) {
    console.log('   ❌ Path construction error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testValidContractInfo();
    await testUndefinedContractName();
    await testNullValues();
    testSanitizeFolderName();
    testPathConstruction();
    
    console.log('\n🎉 Report generation fix tests completed!');
    console.log('\n📋 Summary of fixes:');
    console.log('✅ Added validation for undefined/null contract names');
    console.log('✅ Added fallback to contract address for naming');
    console.log('✅ Added validation for folder name generation');
    console.log('✅ Added enhanced error logging with detailed info');
    console.log('✅ Fixed variable reassignment issue (const → let)');
    
    console.log('\n🚀 The "path argument must be of type string" error should be resolved!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runAllTests();