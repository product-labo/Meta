const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');

async function testLavaRPC() {
  try {
    console.log('🔧 Testing Starknet Lava RPC Client...');
    
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 30000);
    
    // Test with the DEPLOY_ACCOUNT transaction that we know works
    const testTx = '0x6b69d4ed8d22c01050d738fd62924a0b77503a0a6d4e4ced0ce8d7441ff4e14';
    console.log(`📋 Testing receipt for: ${testTx}`);
    
    const receipt = await rpc.getTransactionReceipt(testTx);
    console.log('✅ Receipt fetched successfully!');
    console.log('📊 Events in receipt:', receipt.events?.length || 0);
    console.log('📊 Contract address:', receipt.contract_address);
    console.log('📊 Execution status:', receipt.execution_status);
    
    if (receipt.events && receipt.events.length > 0) {
      console.log('🎉 RPC IS WORKING! Events found:');
      receipt.events.forEach((event, i) => {
        console.log(`  Event ${i + 1}: from ${event.from_address}, keys: ${event.keys?.length || 0}`);
      });
    }
    
    // Test with recent transaction
    const recentTx = '0x6850b44d242214632f94fea96457ef336429afb27770872582068a1ab4810db';
    console.log(`📋 Testing recent transaction: ${recentTx}`);
    
    const recentReceipt = await rpc.getTransactionReceipt(recentTx);
    console.log('✅ Recent receipt fetched successfully!');
    console.log('📊 Recent events:', recentReceipt.events?.length || 0);
    
  } catch (error) {
    console.error('❌ RPC Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testLavaRPC();
