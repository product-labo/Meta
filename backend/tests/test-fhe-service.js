#!/usr/bin/env node

/**
 * FHE Service Tests
 * Tests encryption, decryption, and FHE functionality
 */

import {
  generateKey,
  encryptAES,
  decryptAES,
  encryptWalletData,
  decryptWalletData,
  encryptTransactionData,
  decryptTransactionData,
  initializeFHE
} from '../src/services/fheService.js';

console.log('========================================');
console.log('FHE SERVICE TESTS');
console.log('========================================\n');

async function testKeyGeneration() {
  console.log('=== Test 1: Key Generation ===');
  try {
    const key = generateKey();
    
    if (!key || key.length !== 32) {
      throw new Error('Key should be 32 bytes');
    }
    
    console.log('✓ Key generated successfully');
    console.log(`  Length: ${key.length} bytes (${key.length * 8} bits)`);
    console.log(`  Sample: ${key.toString('hex').substring(0, 16)}...`);
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testAESEncryptionDecryption() {
  console.log('\n=== Test 2: AES Encryption/Decryption ===');
  try {
    const key = generateKey();
    const testData = 'Sensitive wallet address: zt1abc123xyz';
    
    // Encrypt
    const encrypted = encryptAES(testData, key);
    console.log('✓ Data encrypted');
    console.log(`  Algorithm: ${encrypted.algorithm}`);
    console.log(`  Ciphertext length: ${encrypted.ciphertext.length}`);
    
    // Decrypt
    const decrypted = decryptAES(encrypted, key);
    console.log('✓ Data decrypted');
    
    // Verify
    if (decrypted !== testData) {
      throw new Error('Decrypted data does not match original');
    }
    console.log('✓ Decrypted data matches original');
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testObjectEncryption() {
  console.log('\n=== Test 3: Object Encryption ===');
  try {
    const key = generateKey();
    const testObject = {
      amount: 1.5,
      address: 'zt1test123',
      metadata: { type: 'shielded' }
    };
    
    // Encrypt
    const encrypted = encryptAES(testObject, key);
    console.log('✓ Object encrypted');
    
    // Decrypt
    const decrypted = decryptAES(encrypted, key);
    console.log('✓ Object decrypted');
    
    // Verify
    if (JSON.stringify(decrypted) !== JSON.stringify(testObject)) {
      throw new Error('Decrypted object does not match original');
    }
    console.log('✓ Decrypted object matches original');
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testWalletDataEncryption() {
  console.log('\n=== Test 4: Wallet Data Encryption ===');
  try {
    const key = generateKey();
    const walletData = {
      id: 'wallet-123',
      address: 'zt1abc123xyz',
      balance: 10.5,
      note: 'Test wallet',
      type: 'shielded',
      created_at: new Date().toISOString()
    };
    
    // Encrypt
    const encrypted = encryptWalletData(walletData, key);
    console.log('✓ Wallet data encrypted');
    console.log(`  Encrypted fields: ${encrypted.encryption_metadata.encrypted_fields.join(', ')}`);
    
    // Verify sensitive fields are encrypted
    if (encrypted.address || encrypted.balance || encrypted.note) {
      throw new Error('Sensitive fields should be removed after encryption');
    }
    console.log('✓ Sensitive fields removed from plaintext');
    
    // Verify encrypted fields exist
    if (!encrypted.encrypted_address || !encrypted.encrypted_balance || !encrypted.encrypted_note) {
      throw new Error('Encrypted fields should exist');
    }
    console.log('✓ Encrypted fields present');
    
    // Decrypt
    const decrypted = decryptWalletData(encrypted, key);
    console.log('✓ Wallet data decrypted');
    
    // Verify
    if (decrypted.address !== walletData.address) {
      throw new Error('Decrypted address does not match');
    }
    if (decrypted.balance !== walletData.balance) {
      throw new Error('Decrypted balance does not match');
    }
    if (decrypted.note !== walletData.note) {
      throw new Error('Decrypted note does not match');
    }
    console.log('✓ All decrypted fields match original');
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testTransactionDataEncryption() {
  console.log('\n=== Test 5: Transaction Data Encryption ===');
  try {
    const key = generateKey();
    const txData = {
      txid: 'tx-123',
      amount: 5.25,
      from_address: 'zt1sender',
      to_address: 'zt1receiver',
      memo: 'Payment for services',
      timestamp: new Date().toISOString()
    };
    
    // Encrypt
    const encrypted = encryptTransactionData(txData, key);
    console.log('✓ Transaction data encrypted');
    
    // Verify sensitive fields are encrypted
    if (encrypted.amount || encrypted.from_address || encrypted.to_address || encrypted.memo) {
      throw new Error('Sensitive transaction fields should be encrypted');
    }
    console.log('✓ Sensitive transaction fields encrypted');
    
    // Decrypt
    const decrypted = decryptTransactionData(encrypted, key);
    console.log('✓ Transaction data decrypted');
    
    // Verify
    if (decrypted.amount !== txData.amount) {
      throw new Error('Decrypted amount does not match');
    }
    if (decrypted.from_address !== txData.from_address) {
      throw new Error('Decrypted from_address does not match');
    }
    console.log('✓ All decrypted transaction fields match original');
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testWrongKeyDecryption() {
  console.log('\n=== Test 6: Wrong Key Decryption (Should Fail) ===');
  try {
    const key1 = generateKey();
    const key2 = generateKey();
    const testData = 'Secret data';
    
    // Encrypt with key1
    const encrypted = encryptAES(testData, key1);
    console.log('✓ Data encrypted with key1');
    
    // Try to decrypt with key2 (should fail)
    try {
      const decrypted = decryptAES(encrypted, key2);
      throw new Error('Decryption with wrong key should have failed');
    } catch (error) {
      if (error.message.includes('Decryption failed')) {
        console.log('✓ Decryption with wrong key correctly failed');
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testFHEInitialization() {
  console.log('\n=== Test 7: FHE Initialization ===');
  try {
    const status = initializeFHE();
    
    if (!status.initialized) {
      throw new Error('FHE should be initialized');
    }
    console.log('✓ FHE service initialized');
    console.log(`  Key configured: ${status.keyConfigured}`);
    console.log(`  Algorithm: ${status.algorithm}`);
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testEncryptionPerformance() {
  console.log('\n=== Test 8: Encryption Performance ===');
  try {
    const key = generateKey();
    const iterations = 1000;
    
    // Test encryption speed
    const startEncrypt = Date.now();
    for (let i = 0; i < iterations; i++) {
      encryptAES(`Test data ${i}`, key);
    }
    const encryptTime = Date.now() - startEncrypt;
    
    console.log(`✓ Encrypted ${iterations} items in ${encryptTime}ms`);
    console.log(`  Average: ${(encryptTime / iterations).toFixed(2)}ms per encryption`);
    
    // Test decryption speed
    const encrypted = encryptAES('Test data', key);
    const startDecrypt = Date.now();
    for (let i = 0; i < iterations; i++) {
      decryptAES(encrypted, key);
    }
    const decryptTime = Date.now() - startDecrypt;
    
    console.log(`✓ Decrypted ${iterations} items in ${decryptTime}ms`);
    console.log(`  Average: ${(decryptTime / iterations).toFixed(2)}ms per decryption`);
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  const tests = [
    { name: 'Key Generation', fn: testKeyGeneration },
    { name: 'AES Encryption/Decryption', fn: testAESEncryptionDecryption },
    { name: 'Object Encryption', fn: testObjectEncryption },
    { name: 'Wallet Data Encryption', fn: testWalletDataEncryption },
    { name: 'Transaction Data Encryption', fn: testTransactionDataEncryption },
    { name: 'Wrong Key Decryption', fn: testWrongKeyDecryption },
    { name: 'FHE Initialization', fn: testFHEInitialization },
    { name: 'Encryption Performance', fn: testEncryptionPerformance }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`Error running test ${test.name}:`, error.message);
      results.push({ name: test.name, passed: false });
    }
  }
  
  console.log('\n========================================');
  console.log('TEST RESULTS');
  console.log('========================================');
  
  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.name}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\nTotal: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('\n✓ All FHE service tests passed!');
    console.log('\nFHE encryption is working correctly.');
    console.log('To enable in production:');
    console.log('  1. Generate encryption key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.log('  2. Add to .env: FHE_ENCRYPTION_KEY=<generated_key>');
    console.log('  3. Enable encryption: ENABLE_FHE_ENCRYPTION=true');
  }
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
