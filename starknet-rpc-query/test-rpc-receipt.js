const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { loadConfig } = require('./dist/utils/config');

async function testRPCReceipt() {
  try {
    console.log('🔧 Testing RPC Receipt Fetch...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    
    // Test with a known transaction hash format
    const testTx = '0x6850b44d242214632f94fea96457ef336429afb27770872582068a1ab4810db';
    console.log(`📋 Testing receipt for: ${testTx}`);
    
    try {
      const receipt = await rpc.getTransactionReceipt(testTx);
      console.log('✅ Receipt fetched successfully');
      console.log('📊 Events in receipt:', receipt.events?.length || 0);
      
      if (receipt.events && receipt.events.length > 0) {
        console.log('🎉 Transaction has events - EventProcessor should work!');
        console.log('Sample event:', JSON.stringify(receipt.events[0], null, 2));
      } else {
        console.log('⚠️  No events in this transaction');
      }
      
    } catch (error) {
      console.log('❌ Receipt fetch failed:', error.message);
      console.log('🔍 This might be why EventProcessor is not finding events');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRPCReceipt();
