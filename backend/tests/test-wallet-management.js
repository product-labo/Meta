/**
 * Test Wallet Management Backend
 * Tests wallet creation, validation, and type detection
 */

import { validateZcashAddress, detectAddressType, getAddressTypeName } from '../src/utils/zcashAddress.js';

console.log('=== Testing Zcash Address Validation and Type Detection ===\n');

// Test cases
const testCases = [
  // Mainnet transparent addresses
  { address: 't1abc123def456ghi789jkl012mno345pqr', network: 'mainnet', expectedType: 't', expectedValid: true },
  { address: 't3xyz987wvu654tsr321qpo098nml765kji', network: 'mainnet', expectedType: 't', expectedValid: true },
  
  // Testnet transparent addresses
  { address: 'tmYXBYJj1K7o4pXiCiEjse1fGCeZ9t4M5Cs', network: 'testnet', expectedType: 't', expectedValid: true },
  { address: 't2UNzUUx8mWBCRYPRezvA363EYXyEpHokyi', network: 'testnet', expectedType: 't', expectedValid: true },
  
  // Mainnet shielded addresses (78 chars exactly)
  { address: 'zs1' + 'a'.repeat(75), network: 'mainnet', expectedType: 'z', expectedValid: true },
  
  // Testnet shielded addresses
  { address: 'ztestsapling1abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz012345678901234567890', network: 'testnet', expectedType: 'z', expectedValid: true },
  
  // Mainnet unified addresses (100+ chars)
  { address: 'u1' + 'a'.repeat(100), network: 'mainnet', expectedType: 'u', expectedValid: true },
  
  // Testnet unified addresses
  { address: 'utest1' + 'a'.repeat(100), network: 'testnet', expectedType: 'u', expectedValid: true },
  
  // Invalid addresses
  { address: '', network: 'mainnet', expectedType: null, expectedValid: false },
  { address: 'invalid', network: 'mainnet', expectedType: null, expectedValid: false },
  { address: 'x1invalidprefix', network: 'mainnet', expectedType: null, expectedValid: false },
  { address: 't1short', network: 'mainnet', expectedType: 't', expectedValid: false }, // Too short
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.address.substring(0, 30)}${testCase.address.length > 30 ? '...' : ''}`);
  console.log(`  Network: ${testCase.network}`);
  
  // Test type detection
  const detectedType = detectAddressType(testCase.address, testCase.network);
  console.log(`  Detected Type: ${detectedType || 'null'} (expected: ${testCase.expectedType || 'null'})`);
  
  // Test validation
  const validation = validateZcashAddress(testCase.address, testCase.network);
  console.log(`  Valid: ${validation.valid} (expected: ${testCase.expectedValid})`);
  
  if (validation.error) {
    console.log(`  Error: ${validation.error}`);
  }
  
  if (validation.type) {
    const typeName = getAddressTypeName(validation.type);
    console.log(`  Type Name: ${typeName}`);
  }
  
  // Check if test passed
  const typeMatch = detectedType === testCase.expectedType;
  const validMatch = validation.valid === testCase.expectedValid;
  
  if (typeMatch && validMatch) {
    console.log('  ✓ PASSED\n');
    passed++;
  } else {
    console.log('  ✗ FAILED\n');
    failed++;
  }
});

console.log('=== Test Summary ===');
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed!');
  process.exit(1);
}
