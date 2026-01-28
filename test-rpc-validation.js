#!/usr/bin/env node

/**
 * RPC Client Validation Test
 * Quick validation that all RPC clients are working correctly
 */

import dotenv from 'dotenv';
import { LiskRpcClient } from './src/services/LiskRpcClient_Optimized.js';
import { EthereumRpcClient } from './src/services/EthereumRpcClient.js';
import { StarknetRpcClient } from './src/services/StarknetRpcClient.js';

dotenv.config();

async function validateRpcClient(chainName, client) {
  console.log(`\n🔍 Validating ${chainName.toUpperCase()} RPC Client`);
  console.log(`🌐 URL: ${client.getRpcUrl()}`);
  
  try {
    // Test basic connectivity
    const blockNumber = await client.getBlockNumber();
    console.log(`✅ Connectivity: Block ${blockNumber}`);
    
    // Test block retrieval
    const block = await client.getBlock(blockNumber);
    console.log(`✅ Block retrieval: ${block.transactions?.length || 0} transactions`);
    
    return true;
  } catch (error) {
    console.log(`❌ Validation failed: ${error.message}`);
    return false;
  }
}

async function runValidation() {
  console.log('🧪 RPC CLIENT VALIDATION TEST');
  console.log('=' .repeat(40));
  
  let validClients = 0;
  let totalClients = 0;
  
  // Test Lisk
  console.log('\n🟦 LISK VALIDATION');
  const liskClient = new LiskRpcClient(process.env.LISK_RPC_URL1);
  totalClients++;
  if (await validateRpcClient('lisk', liskClient)) {
    validClients++;
  }
  
  // Test Ethereum
  console.log('\n🟨 ETHEREUM VALIDATION');
  const ethereumClient = new EthereumRpcClient(process.env.ETHEREUM_RPC_URL);
  totalClients++;
  if (await validateRpcClient('ethereum', ethereumClient)) {
    validClients++;
  }
  
  // Test Starknet
  console.log('\n🟧 STARKNET VALIDATION');
  const starknetClient = new StarknetRpcClient(process.env.STARKNET_RPC_URL1);
  totalClients++;
  if (await validateRpcClient('starknet', starknetClient)) {
    validClients++;
  }
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=' .repeat(40));
  console.log(`✅ Valid clients: ${validClients}/${totalClients}`);
  console.log(`📈 Success rate: ${((validClients / totalClients) * 100).toFixed(1)}%`);
  
  if (validClients === totalClients) {
    console.log('🎉 All RPC clients are working correctly!');
  } else {
    console.log('⚠️  Some RPC clients need attention.');
  }
}

runValidation().catch(console.error);