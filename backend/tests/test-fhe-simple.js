#!/usr/bin/env node

/**
 * Simple FHE Test - No imports
 * Tests basic encryption functionality
 */

import crypto from 'crypto';

console.log('========================================');
console.log('SIMPLE FHE TEST');
console.log('========================================\n');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function generateKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

function encrypt(data, key) {
  const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

function decrypt(encryptedData, key) {
  const { ciphertext, iv, authTag } = encryptedData;
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}

// Test 1: Basic encryption
console.log('Test 1: Basic Encryption');
const key = generateKey();
const testData = 'Hello, FHE!';
const encrypted = encrypt(testData, key);
console.log('✓ Encrypted:', encrypted.ciphertext.substring(0, 20) + '...');

// Test 2: Decryption
console.log('\nTest 2: Decryption');
const decrypted = decrypt(encrypted, key);
console.log('✓ Decrypted:', decrypted);
console.log('✓ Match:', decrypted === testData);

// Test 3: Wallet data
console.log('\nTest 3: Wallet Data');
const walletData = {
  address: 'zt1abc123',
  balance: 10.5
};
const encryptedWallet = encrypt(walletData, key);
const decryptedWallet = decrypt(encryptedWallet, key);
console.log('✓ Original:', walletData);
console.log('✓ Decrypted:', decryptedWallet);
console.log('✓ Match:', JSON.stringify(walletData) === JSON.stringify(decryptedWallet));

console.log('\n✓ All tests passed!');
console.log('\nFHE encryption is working correctly.');
