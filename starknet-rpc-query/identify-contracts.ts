console.log('🔧 Identifying contracts from RPC...');

import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';

async function identifyContracts() {
  try {
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    
    // Most active contract from our data
    const contractAddress = '0x48ddc53f41523d2a6b40c3dff7f69f4bbac799cd8b2e3fc50d3de1d4119441f';
    
    console.log(`\n📋 Analyzing contract: ${contractAddress}`);
    
    // 1. Get contract class hash
    try {
      const classHash = await rpc.makeRequest('starknet_getClassHashAt', [contractAddress]);
      console.log(`✅ Class Hash: ${classHash}`);
      
      // 2. Get contract class (ABI and bytecode)
      const contractClass = await rpc.makeRequest('starknet_getClass', [classHash]);
      console.log(`✅ Contract Class Info:`);
      console.log(`   - Entry Points: ${contractClass.entry_points_by_type?.EXTERNAL?.length || 0} external functions`);
      console.log(`   - Constructor: ${contractClass.entry_points_by_type?.CONSTRUCTOR?.length || 0} constructors`);
      
      // 3. Get ABI if available
      if (contractClass.abi) {
        console.log(`✅ ABI Functions:`);
        contractClass.abi.slice(0, 5).forEach((item: any, i: number) => {
          if (item.type === 'function') {
            console.log(`   ${i+1}. ${item.name} (${item.type})`);
          }
        });
      }
      
    } catch (error: any) {
      console.log(`❌ Could not get class: ${error.message}`);
    }
    
    // 4. Check if it's a known contract type by calling common functions
    console.log(`\n🔍 Testing common contract patterns:`);
    
    // Test ERC20 pattern
    try {
      const name = await rpc.makeRequest('starknet_call', [{
        contract_address: contractAddress,
        entry_point_selector: '0x361458367e696363fbcc70777d07ebbd2394e89fd0adcaf147faccd1d294d60', // name()
        calldata: []
      }, 'latest']);
      console.log(`✅ ERC20 Token Name: ${name.result}`);
    } catch (error) {
      console.log(`❌ Not an ERC20 token`);
    }
    
    // Test if it's a DEX/AMM
    try {
      const reserves = await rpc.makeRequest('starknet_call', [{
        contract_address: contractAddress,
        entry_point_selector: '0x1c5b0c4b0b8b0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a', // get_reserves()
        calldata: []
      }, 'latest']);
      console.log(`✅ DEX/AMM Reserves: ${reserves.result}`);
    } catch (error) {
      console.log(`❌ Not a standard DEX`);
    }
    
  } catch (error: any) {
    console.error('❌ Contract analysis failed:', error.message);
  }
}

identifyContracts();
