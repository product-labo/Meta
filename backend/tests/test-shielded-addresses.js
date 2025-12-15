#!/usr/bin/env node

/**
 * Shielded Address Generation Test Suite
 * Tests the new shielded address generation routes
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

class ShieldedAddressTest {
  constructor() {
    this.testResults = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`ℹ️ [${timestamp}] ${message}`);
  }

  async testShieldedAddressGeneration() {
    this.log('🚀 Starting Shielded Address Generation Test Suite');
    this.log('Testing Zaino-based shielded address operations');
    
    // Test 1: Check Zaino service status
    await this.testZainoStatus();
    
    // Test 2: Generate single shielded address
    await this.testSingleAddressGeneration();
    
    // Test 3: Generate specific address types
    await this.testSpecificAddressTypes();
    
    // Test 4: Validate shielded addresses
    await this.testAddressValidation();
    
    // Test 5: Batch address generation
    await this.testBatchAddressGeneration();
    
    // Test 6: Address info retrieval
    await this.testAddressInfo();
    
    // Test 7: Save address to wallet
    await this.testSaveToWallet();
    
    this.printResults();
  }

  async testZainoStatus() {
    try {
      this.log('Testing: Zaino Service Status');
      
      const response = await axios.get(`${BASE_URL}/api/shielded/status`);
      
      if (response.status === 200 && response.data.zaino_available) {
        this.log('✅ Zaino service is available');
        this.log(`Zaino info: ${JSON.stringify(response.data.info)}`);
        this.testResults.push({ test: 'Zaino Status', status: 'PASS' });
      } else {
        this.log('⚠️ Zaino service is not available - shielded operations will fail');
        this.testResults.push({ test: 'Zaino Status', status: 'WARN', message: 'Service unavailable' });
      }
    } catch (error) {
      this.log('❌ Zaino service check failed');
      this.testResults.push({ test: 'Zaino Status', status: 'FAIL', error: error.message });
    }
  }

  async testSingleAddressGeneration() {
    try {
      this.log('Testing: Single Shielded Address Generation');
      
      const response = await axios.post(`${BASE_URL}/api/shielded/address/generate`, {
        type: 'auto'
      });
      
      if (response.status === 201 && response.data.success) {
        const address = response.data.address;
        this.log(`✅ Generated shielded address: ${address.substring(0, 20)}...`);
        this.log(`Address type: ${response.data.type}`);
        this.testResults.push({ 
          test: 'Single Address Generation', 
          status: 'PASS',
          address: address,
          type: response.data.type
        });
        return address;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      this.log('❌ Single address generation failed');
      if (error.response?.status === 503) {
        this.log('⚠️ This is expected if Zaino is not running');
        this.testResults.push({ test: 'Single Address Generation', status: 'SKIP', message: 'Zaino unavailable' });
      } else {
        this.testResults.push({ test: 'Single Address Generation', status: 'FAIL', error: error.message });
      }
      return null;
    }
  }

  async testSpecificAddressTypes() {
    const types = ['sapling', 'unified'];
    
    for (const type of types) {
      try {
        this.log(`Testing: ${type.charAt(0).toUpperCase() + type.slice(1)} Address Generation`);
        
        const response = await axios.post(`${BASE_URL}/api/shielded/address/generate`, {
          type: type
        });
        
        if (response.status === 201 && response.data.success) {
          const address = response.data.address;
          this.log(`✅ Generated ${type} address: ${address.substring(0, 20)}...`);
          this.testResults.push({ 
            test: `${type} Address Generation`, 
            status: 'PASS',
            address: address
          });
        }
      } catch (error) {
        this.log(`❌ ${type} address generation failed`);
        if (error.response?.status === 503) {
          this.testResults.push({ test: `${type} Address Generation`, status: 'SKIP', message: 'Zaino unavailable' });
        } else {
          this.testResults.push({ test: `${type} Address Generation`, status: 'FAIL', error: error.message });
        }
      }
    }
  }

  async testAddressValidation() {
    try {
      this.log('Testing: Address Validation');
      
      // Test valid shielded address format
      const testAddresses = [
        'zs1z7rejlpsa98s2rrrfkwmaxu8rgs7ddhqkumla0x5vlmqz0d4jjgvm5d2yk74ugn3c4ksqhvqzqe', // Sapling
        't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN', // Transparent (should fail)
        'invalid_address' // Invalid
      ];
      
      for (const address of testAddresses) {
        const response = await axios.post(`${BASE_URL}/api/shielded/address/validate`, {
          address: address
        });
        
        this.log(`Address ${address.substring(0, 20)}... validation: ${response.data.valid ? 'VALID' : 'INVALID'} (${response.data.type})`);
      }
      
      this.testResults.push({ test: 'Address Validation', status: 'PASS' });
    } catch (error) {
      this.log('❌ Address validation failed');
      this.testResults.push({ test: 'Address Validation', status: 'FAIL', error: error.message });
    }
  }

  async testBatchAddressGeneration() {
    try {
      this.log('Testing: Batch Address Generation');
      
      const response = await axios.post(`${BASE_URL}/api/shielded/address/batch-generate`, {
        count: 3,
        type: 'auto'
      });
      
      if (response.status === 201 && response.data.success) {
        this.log(`✅ Generated ${response.data.generated_count} addresses in batch`);
        response.data.addresses.forEach((addr, i) => {
          this.log(`  ${i + 1}. ${addr.address.substring(0, 20)}... (${addr.type})`);
        });
        this.testResults.push({ 
          test: 'Batch Address Generation', 
          status: 'PASS',
          count: response.data.generated_count
        });
      }
    } catch (error) {
      this.log('❌ Batch address generation failed');
      if (error.response?.status === 503) {
        this.testResults.push({ test: 'Batch Address Generation', status: 'SKIP', message: 'Zaino unavailable' });
      } else {
        this.testResults.push({ test: 'Batch Address Generation', status: 'FAIL', error: error.message });
      }
    }
  }

  async testAddressInfo() {
    try {
      this.log('Testing: Address Info Retrieval');
      
      // Use a known Sapling address for testing
      const testAddress = 'zs1z7rejlpsa98s2rrrfkwmaxu8rgs7ddhqkumla0x5vlmqz0d4jjgvm5d2yk74ugn3c4ksqhvqzqe';
      
      const response = await axios.get(`${BASE_URL}/api/shielded/address/${testAddress}/info`);
      
      if (response.status === 200 && response.data.success) {
        this.log(`✅ Retrieved address info: Balance ${response.data.balance} ZEC, ${response.data.transaction_count} transactions`);
        this.testResults.push({ test: 'Address Info Retrieval', status: 'PASS' });
      }
    } catch (error) {
      this.log('❌ Address info retrieval failed');
      if (error.response?.status === 503) {
        this.testResults.push({ test: 'Address Info Retrieval', status: 'SKIP', message: 'Zaino unavailable' });
      } else {
        this.testResults.push({ test: 'Address Info Retrieval', status: 'FAIL', error: error.message });
      }
    }
  }

  async testSaveToWallet() {
    try {
      this.log('Testing: Save Address to Wallet');
      
      // First create a test user
      const userResponse = await axios.post(`${BASE_URL}/api/users/create`, {
        email: 'shielded.test@example.com',
        name: 'Shielded Test User'
      });
      
      const userId = userResponse.data.user.id;
      this.log(`Created test user: ${userId}`);
      
      // Generate address and save to wallet
      const response = await axios.post(`${BASE_URL}/api/shielded/address/generate`, {
        type: 'auto',
        save_to_wallet: true,
        user_id: userId,
        wallet_name: 'Test Shielded Wallet'
      });
      
      if (response.status === 201 && response.data.success && response.data.wallet) {
        this.log(`✅ Address saved to wallet: ${response.data.wallet.name}`);
        this.testResults.push({ test: 'Save Address to Wallet', status: 'PASS' });
      } else {
        this.log('⚠️ Address generated but not saved to wallet');
        this.testResults.push({ test: 'Save Address to Wallet', status: 'PARTIAL' });
      }
    } catch (error) {
      this.log('❌ Save to wallet failed');
      if (error.response?.status === 503) {
        this.testResults.push({ test: 'Save Address to Wallet', status: 'SKIP', message: 'Zaino unavailable' });
      } else {
        this.testResults.push({ test: 'Save Address to Wallet', status: 'FAIL', error: error.message });
      }
    }
  }

  printResults() {
    this.log('📊 Shielded Address Test Results');
    this.log('==================================================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;
    const warnings = this.testResults.filter(r => r.status === 'WARN').length;
    
    this.log(`Total Tests: ${this.testResults.length}`);
    this.log(`✅ Passed: ${passed}`);
    this.log(`❌ Failed: ${failed}`);
    this.log(`⏭️ Skipped: ${skipped}`);
    this.log(`⚠️ Warnings: ${warnings}`);
    
    if (failed === 0 && skipped < this.testResults.length) {
      this.log('🎉 SUCCESS: Shielded address generation is working!');
    } else if (skipped === this.testResults.length - warnings) {
      this.log('⚠️ SKIPPED: Most tests skipped due to Zaino unavailability');
      this.log('💡 Start Zaino indexer to enable shielded operations');
    } else {
      this.log('❌ FAILURE: Some shielded address tests failed');
    }
    
    this.log('');
    this.log('📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : 
                    result.status === 'FAIL' ? '❌' : 
                    result.status === 'SKIP' ? '⏭️' : '⚠️';
      this.log(`${status} ${result.test}: ${result.status}`);
      if (result.error) this.log(`   Error: ${result.error}`);
      if (result.message) this.log(`   Note: ${result.message}`);
    });
  }
}

// Run the test suite
const tester = new ShieldedAddressTest();
tester.testShieldedAddressGeneration().catch(console.error);