import axios from 'axios';

const RPC_ENDPOINTS = [
  'https://rpc.api.lisk.com',
  'https://lisk.drpc.org',
  'https://lisk-mainnet.public.blastapi.io',
  'https://lisk.gateway.tenderly.co',
];

async function testRPC(url: string): Promise<boolean> {
  try {
    console.log(`\n🔌 Testing: ${url}`);
    
    // Test 1: Get block number
    const blockNumResponse = await axios.post(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_blockNumber',
      params: []
    }, { timeout: 10000 });
    
    if (blockNumResponse.data.error) {
      console.log(`  ❌ Error: ${blockNumResponse.data.error.message}`);
      return false;
    }
    
    const blockNum = parseInt(blockNumResponse.data.result, 16);
    console.log(`  ✅ Latest block: ${blockNum}`);
    
    // Test 2: Get a recent block
    const testBlock = blockNum - 10;
    const blockHex = '0x' + testBlock.toString(16);
    
    const blockResponse = await axios.post(url, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBlockByNumber',
      params: [blockHex, false]
    }, { timeout: 10000 });
    
    if (blockResponse.data.error) {
      console.log(`  ❌ Block fetch error: ${blockResponse.data.error.message}`);
      return false;
    }
    
    if (!blockResponse.data.result) {
      console.log(`  ❌ No block data returned`);
      return false;
    }
    
    console.log(`  ✅ Block ${testBlock} fetched successfully`);
    console.log(`  ✅ Hash: ${blockResponse.data.result.hash}`);
    console.log(`  ✅ Transactions: ${blockResponse.data.result.transactions.length}`);
    
    return true;
    
  } catch (error: any) {
    console.log(`  ❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Lisk RPC Endpoints\n');
  console.log('='.repeat(60));
  
  const results: { url: string; working: boolean }[] = [];
  
  for (const url of RPC_ENDPOINTS) {
    const working = await testRPC(url);
    results.push({ url, working });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESULTS:\n');
  
  const workingRPCs = results.filter(r => r.working);
  const failedRPCs = results.filter(r => !r.working);
  
  if (workingRPCs.length > 0) {
    console.log('✅ Working RPCs:');
    workingRPCs.forEach(r => console.log(`   - ${r.url}`));
    
    console.log('\n🎯 Recommended RPC:');
    console.log(`   ${workingRPCs[0].url}`);
    
    console.log('\n📝 Update .env with:');
    console.log(`   LISK_MAINNET_RPC=${workingRPCs[0].url}`);
  }
  
  if (failedRPCs.length > 0) {
    console.log('\n❌ Failed RPCs:');
    failedRPCs.forEach(r => console.log(`   - ${r.url}`));
  }
  
  console.log('\n' + '='.repeat(60));
}

main();
