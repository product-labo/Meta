import { rpcClient } from './rpc/LiskRPCClient';

async function testRPC() {
  console.log('🔌 Testing Lisk RPC Connection...\n');
  
  try {
    console.log('Fetching latest block number...');
    const blockNumber = await rpcClient.getBlockNumber();
    console.log(`✅ Latest block: ${blockNumber}`);
    
    console.log('\nFetching block 1...');
    const block = await rpcClient.getBlockByNumber(1, false);
    console.log(`✅ Block 1 hash: ${block.hash}`);
    console.log(`   Timestamp: ${new Date(parseInt(block.timestamp, 16) * 1000).toISOString()}`);
    console.log(`   Transactions: ${block.transactions.length}`);
    
    console.log('\n✅ RPC connection working!');
    console.log('\n🚀 Ready to start indexing!');
    
  } catch (error) {
    console.error('❌ RPC Error:', error);
    process.exit(1);
  }
}

testRPC();
