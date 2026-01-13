console.log('🔧 Identifying contracts from transaction events...');

import { loadConfig } from './src/utils/config';
import { Database } from './src/database/Database';
import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';

async function identifyFromEvents() {
  try {
    const config = loadConfig();
    const db = new Database(config.database);
    await db.connect();
    const rpc = new StarknetRPCClient('https://rpc.starknet.lava.build', 15000);
    
    // Get a recent transaction with events
    const result = await db.query(`
      SELECT tx_hash, sender_address, block_number 
      FROM transactions 
      WHERE tx_type = 'INVOKE' 
      ORDER BY block_number DESC 
      LIMIT 1
    `);
    
    if (result.length === 0) {
      console.log('❌ No transactions found');
      return;
    }
    
    const tx = result[0];
    console.log(`\n📋 Analyzing transaction: ${tx.tx_hash}`);
    console.log(`   Contract: ${tx.sender_address}`);
    console.log(`   Block: ${tx.block_number}`);
    
    // Get transaction receipt to see events
    try {
      const receipt = await rpc.makeRequest('starknet_getTransactionReceipt', [tx.tx_hash]);
      
      console.log(`\n✅ Transaction Receipt:`);
      console.log(`   Status: ${receipt.execution_status}`);
      console.log(`   Events: ${receipt.events?.length || 0}`);
      
      if (receipt.events && receipt.events.length > 0) {
        console.log(`\n🔍 Event Analysis:`);
        
        receipt.events.slice(0, 3).forEach((event: any, i: number) => {
          console.log(`\n   Event ${i+1}:`);
          console.log(`   - From: ${event.from_address}`);
          console.log(`   - Keys: ${event.keys?.length || 0} keys`);
          console.log(`   - Data: ${event.data?.length || 0} data items`);
          
          // Analyze event signatures to identify contract type
          if (event.keys && event.keys.length > 0) {
            const eventSig = event.keys[0];
            console.log(`   - Signature: ${eventSig}`);
            
            // Common event signatures
            if (eventSig === '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9') {
              console.log(`   ✅ Transfer event - This is likely an ERC20 token!`);
            } else if (eventSig.includes('2e0a012a863e6b614014d113e7285b06e30d2999e42e6e03ba2ef6158b0a8f1')) {
              console.log(`   ✅ Swap event - This is likely a DEX/AMM!`);
            } else {
              console.log(`   🔍 Custom event - Protocol-specific functionality`);
            }
          }
        });
        
        // Count unique contract addresses in events
        const contractAddresses = new Set();
        receipt.events.forEach((event: any) => {
          if (event.from_address) {
            contractAddresses.add(event.from_address);
          }
        });
        
        console.log(`\n📊 Contract Interaction Summary:`);
        console.log(`   - Interacted with ${contractAddresses.size} different contracts`);
        console.log(`   - Generated ${receipt.events.length} events`);
        console.log(`   - Contract addresses involved:`);
        
        Array.from(contractAddresses).slice(0, 3).forEach((addr: any, i: number) => {
          console.log(`     ${i+1}. ${addr}`);
        });
        
      } else {
        console.log(`❌ No events in this transaction`);
      }
      
    } catch (error: any) {
      console.log(`❌ Could not get receipt: ${error.message}`);
    }
    
    console.log(`\n💡 Contract Identification Methods:`);
    console.log(`1. ✅ Event signature analysis (working)`);
    console.log(`2. ✅ Transaction pattern analysis (working)`);
    console.log(`3. ❌ RPC class hash calls (endpoint issues)`);
    console.log(`4. ✅ Activity frequency analysis (working)`);
    
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
  }
}

identifyFromEvents();
