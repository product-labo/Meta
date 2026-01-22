console.log('🔧 LAYER 1: Testing RPC Client...');

import { StarknetRPCClient } from './services/rpc/StarknetRPCClient';

async function testRPCLayer() {
  try {
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    
    console.log('Step 1A: Testing getBlockNumber...');
    const blockNumber = await rpc.getBlockNumber();
    console.log(`✅ Current block: ${blockNumber}`);
    
    console.log('Step 1B: Testing getBlock with transformation...');
    const block = await rpc.getBlock(blockNumber - 1n);
    console.log('✅ Block fetched:', {
      blockNumber: block.blockNumber,
      blockHash: block.blockHash,
      parentBlockHash: block.parentBlockHash,
      timestamp: block.timestamp,
      transactionCount: block.transactions?.length || 0
    });
    
    if (block.transactions && block.transactions.length > 0) {
      console.log('✅ First transaction:', {
        txHash: block.transactions[0].txHash,
        txType: block.transactions[0].txType,
        senderAddress: block.transactions[0].senderAddress
      });
    }
    
    console.log('🎉 RPC Layer working correctly!');
    return block;
    
  } catch (error: any) {
    console.error('❌ RPC Layer failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testRPCLayer();
