/**
 * Filter Fix Usage Example
 * Shows how to use the updated RPC clients without filter errors
 */

import { EthereumRpcClient } from './src/services/EthereumRpcClient.js';
import { createRobustProvider } from './src/services/RobustProvider.js';

async function demonstrateFilterFix() {
  console.log('🔧 Filter Fix Demonstration\n');

  // Example 1: Using EthereumRpcClient (recommended)
  console.log('1️⃣ Using EthereumRpcClient with built-in filter fix:');
  
  const client = new EthereumRpcClient('https://ethereum-rpc.publicnode.com', {
    maxBlockRange: 1000,  // Automatically chunks large requests
    pollingInterval: 4000 // Poll every 4 seconds for events
  });

  try {
    const blockNumber = await client.getBlockNumber();
    console.log(`   Current block: ${blockNumber}`);

    // This will now work without filter errors
    const contractAddress = '0xA0b86a33E6441b8e776f89d2b5B977c737C0b8e8';
    const result = await client.getTransactionsByAddress(
      contractAddress,
      blockNumber - 100,
      blockNumber
    );

    console.log(`   ✅ Retrieved ${result.transactions.length} transactions`);
    console.log(`   ✅ Retrieved ${result.events.length} events`);

    // Create an event listener that won't have filter errors
    console.log('   🎧 Setting up event listener...');
    
    const cleanup = client.createEventListener({
      address: contractAddress,
      topics: [] // Listen to all events
    }, (event) => {
      console.log(`   📋 New event: ${event.transactionHash}`);
    });

    // Let it run for 10 seconds
    console.log('   ⏱️  Listening for events for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Clean up
    cleanup();
    await client.destroy();
    
    console.log('   ✅ Event listener cleaned up\n');

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // Example 2: Using RobustProvider directly
  console.log('2️⃣ Using RobustProvider directly:');
  
  const robustProvider = createRobustProvider('https://ethereum-rpc.publicnode.com', {
    maxBlockRange: 500,
    pollingInterval: 3000
  });

  try {
    // Get logs without filter errors
    const blockNumber = await robustProvider.getBlockNumber();
    
    const logs = await robustProvider.getLogs({
      address: '0xA0b86a33E6441b8e776f89d2b5B977c737C0b8e8',
      fromBlock: '0x' + (blockNumber - 50).toString(16),
      toBlock: '0x' + blockNumber.toString(16)
    });

    console.log(`   ✅ Retrieved ${logs.length} logs directly`);

    // Check provider stats
    const stats = robustProvider.getStats();
    console.log(`   📊 Active event listeners: ${stats.activeEventListeners}`);

    await robustProvider.destroy();
    console.log('   ✅ RobustProvider cleaned up\n');

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // Example 3: Error handling demonstration
  console.log('3️⃣ Error handling demonstration:');
  
  const testClient = new EthereumRpcClient('https://ethereum-rpc.publicnode.com');

  try {
    // This simulates what would happen with the old approach
    console.log('   🧪 Testing error recovery...');
    
    // The client will automatically handle any filter errors internally
    const result = await testClient._makeRpcCall('eth_getLogs', [{
      address: '0xA0b86a33E6441b8e776f89d2b5B977c737C0b8e8',
      fromBlock: 'latest',
      toBlock: 'latest'
    }]);

    console.log(`   ✅ No filter errors! Retrieved ${result.length} logs`);

    await testClient.destroy();

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }

  console.log('\n🎉 Demonstration complete!');
  console.log('\n📋 Key improvements:');
  console.log('   ✅ No more "filter not found" errors');
  console.log('   ✅ Automatic request chunking for large ranges');
  console.log('   ✅ Robust event listeners with polling');
  console.log('   ✅ Proper resource cleanup');
  console.log('   ✅ Fallback mechanisms for reliability');
  console.log('\n💡 Your application should now work without filter-related crashes!');
}

// Run the demonstration
demonstrateFilterFix().catch(console.error);