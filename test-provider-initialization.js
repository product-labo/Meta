#!/usr/bin/env node

/**
 * Test provider initialization for different chains
 */

import dotenv from 'dotenv';
import { SmartContractFetcher } from './src/services/SmartContractFetcher.js';

dotenv.config();

async function testProviderInitialization() {
  console.log('🧪 Testing provider initialization...');
  
  // Test environment variables
  console.log('\n📋 Environment Variables:');
  console.log('ETHEREUM_RPC_URL:', process.env.ETHEREUM_RPC_URL);
  console.log('ETHEREUM_RPC_URL_FALLBACK:', process.env.ETHEREUM_RPC_URL_FALLBACK);
  console.log('STARKNET_RPC_URL1:', process.env.STARKNET_RPC_URL1);
  console.log('STARKNET_RPC_URL2:', process.env.STARKNET_RPC_URL2);
  console.log('STARKNET_RPC_URL3:', process.env.STARKNET_RPC_URL3);
  console.log('ANALYZE_CHAIN_ONLY:', process.env.ANALYZE_CHAIN_ONLY);
  console.log('CONTRACT_CHAIN:', process.env.CONTRACT_CHAIN);
  
  try {
    // Create fetcher instance
    const fetcher = new SmartContractFetcher({
      maxRequestsPerSecond: 5,
      failoverTimeout: 30000,
      maxRetries: 2
    });
    
    console.log('\n🔍 Checking initialized providers:');
    console.log('Available chains:', Object.keys(fetcher.providers));
    
    for (const [chain, providers] of Object.entries(fetcher.providers)) {
      console.log(`\n${chain.toUpperCase()} providers (${providers.length}):`);
      providers.forEach(provider => {
        console.log(`  - ${provider.name}: ${provider.config.url}`);
      });
    }
    
    // Test Ethereum provider initialization
    console.log('\n🧪 Testing Ethereum provider access...');
    try {
      await fetcher.getCurrentBlockNumber('ethereum');
      console.log('✅ Ethereum providers working');
    } catch (error) {
      console.log('❌ Ethereum provider error:', error.message);
    }
    
    // Test Starknet provider initialization
    console.log('\n🧪 Testing Starknet provider access...');
    try {
      await fetcher.getCurrentBlockNumber('starknet');
      console.log('✅ Starknet providers working');
    } catch (error) {
      console.log('❌ Starknet provider error:', error.message);
    }
    
    // Test Lisk provider initialization
    console.log('\n🧪 Testing Lisk provider access...');
    try {
      await fetcher.getCurrentBlockNumber('lisk');
      console.log('✅ Lisk providers working');
    } catch (error) {
      console.log('❌ Lisk provider error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProviderInitialization().catch(console.error);