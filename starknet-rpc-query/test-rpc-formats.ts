console.log('🔧 Testing RPC calls with known Starknet contracts...');

import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';

async function testRPCFormats() {
  try {
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    
    // Test with ETH token contract (known address)
    const ethContract = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    
    console.log(`\n📋 Testing with ETH contract: ${ethContract}`);
    
    // Test different parameter formats for getClassHashAt
    const formats = [
      [ethContract, 'latest'],
      [ethContract],
      [{ contract_address: ethContract }, 'latest'],
      [{ contract_address: ethContract, block_id: 'latest' }]
    ];
    
    for (let i = 0; i < formats.length; i++) {
      try {
        console.log(`\n🔍 Format ${i+1}: ${JSON.stringify(formats[i])}`);
        const result = await rpc.makeRequest('starknet_getClassHashAt', formats[i]);
        console.log(`✅ Success! Class hash: ${result}`);
        break; // Stop on first success
      } catch (error: any) {
        console.log(`❌ Format ${i+1} failed: ${error.message}`);
      }
    }
    
    // Test our contract with the working format
    console.log(`\n📋 Testing our contract with working format...`);
    const ourContract = '0x48ddc53f41523d2a6b40c3dff7f69f4bbac799cd8b2e3fc50d3de1d4119441f';
    
    try {
      const classHash = await rpc.makeRequest('starknet_getClassHashAt', [ourContract, 'latest']);
      console.log(`✅ Our contract class hash: ${classHash}`);
      
      // Get the contract class
      const contractClass = await rpc.makeRequest('starknet_getClass', [classHash, 'latest']);
      console.log(`✅ Contract class retrieved`);
      console.log(`   - Has ABI: ${!!contractClass.abi}`);
      console.log(`   - External functions: ${contractClass.entry_points_by_type?.EXTERNAL?.length || 0}`);
      
    } catch (error: any) {
      console.log(`❌ Our contract failed: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testRPCFormats();
