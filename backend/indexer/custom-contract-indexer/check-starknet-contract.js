#!/usr/bin/env node

import { RpcProvider } from 'starknet';
import dotenv from 'dotenv';

dotenv.config();

async function checkStarknetContract(address) {
  console.log(`🔍 Checking Starknet contract: ${address}`);
  
  const rpcs = [
    'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
    'https://rpc.starknet.lava.build',
    'https://free-rpc.nethermind.io/mainnet-juno',
    'https://starknet-mainnet.infura.io/v3/YOUR_KEY'
  ];

  for (const rpc of rpcs) {
    try {
      console.log(`\n📡 Testing RPC: ${rpc}`);
      const provider = new RpcProvider({ nodeUrl: rpc });
      
      // Test connection
      const chainId = await provider.getChainId();
      console.log(`✅ Connected to chain: ${chainId}`);
      
      // Check if contract exists
      const classHash = await provider.getClassHashAt(address);
      console.log(`📋 Class hash: ${classHash}`);
      
      if (classHash && classHash !== '0x0') {
        console.log(`✅ Contract found on Starknet mainnet!`);
        
        // Get contract class info
        try {
          const contractClass = await provider.getClass(classHash);
          console.log(`📊 Contract type: ${contractClass.contract_class_version || 'Cairo 0'}`);
          console.log(`📊 Entry points: ${contractClass.entry_points_by_type?.EXTERNAL?.length || 0} external functions`);
          
          return {
            found: true,
            chainId,
            classHash,
            rpc,
            contractClass
          };
        } catch (error) {
          console.log(`⚠️ Could not fetch contract class: ${error.message}`);
          return {
            found: true,
            chainId,
            classHash,
            rpc
          };
        }
      } else {
        console.log(`❌ Contract not found on this network`);
      }
      
    } catch (error) {
      console.log(`❌ RPC failed: ${error.message}`);
    }
  }
  
  // Try Sepolia testnet
  console.log(`\n🔍 Checking Starknet Sepolia testnet...`);
  
  const sepoliaRpcs = [
    'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
    'https://rpc.sepolia.starknet.lava.build',
    'https://free-rpc.nethermind.io/sepolia-juno'
  ];

  for (const rpc of sepoliaRpcs) {
    try {
      console.log(`\n📡 Testing Sepolia RPC: ${rpc}`);
      const provider = new RpcProvider({ nodeUrl: rpc });
      
      const chainId = await provider.getChainId();
      console.log(`✅ Connected to Sepolia chain: ${chainId}`);
      
      const classHash = await provider.getClassHashAt(address);
      console.log(`📋 Class hash: ${classHash}`);
      
      if (classHash && classHash !== '0x0') {
        console.log(`✅ Contract found on Starknet Sepolia!`);
        return {
          found: true,
          network: 'sepolia',
          chainId,
          classHash,
          rpc
        };
      }
      
    } catch (error) {
      console.log(`❌ Sepolia RPC failed: ${error.message}`);
    }
  }
  
  return { found: false };
}

// CLI usage
const address = process.argv[2];

if (!address) {
  console.log('Usage: node check-starknet-contract.js <contract_address>');
  console.log('Example: node check-starknet-contract.js 0x04bb1a742ac72a9a72beebe1f608c508fce6dfa9250b869018b6e157dccb46e8');
  process.exit(1);
}

checkStarknetContract(address)
  .then(result => {
    console.log('\n🎉 Final Result:');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('❌ Check failed:', error.message);
  });
