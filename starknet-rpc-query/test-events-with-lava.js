const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { EventProcessor } = require('./dist/services/ingestion/EventProcessor');
const { loadConfig } = require('./dist/utils/config');

async function processEventsWithWorkingRPC() {
  try {
    console.log('🔧 Processing Events with Working Lava RPC...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    const eventProcessor = new EventProcessor(rpc, db);
    
    // Get transactions that should have events
    const transactions = await db.query(`
      SELECT tx_hash, block_number 
      FROM transactions 
      WHERE tx_type IN ('DEPLOY_ACCOUNT', 'INVOKE')
      ORDER BY block_number DESC 
      LIMIT 5
    `);
    
    console.log(`📋 Found ${transactions.length} transactions to process`);
    
    // Count events before
    const eventsBefore = await db.query('SELECT COUNT(*) as count FROM events');
    console.log(`📊 Events before: ${eventsBefore[0].count}`);
    
    // Process each transaction
    for (const tx of transactions) {
      console.log(`🔄 Processing ${tx.tx_hash}...`);
      try {
        await eventProcessor.processTransactionEvents(tx.tx_hash, BigInt(tx.block_number));
        console.log(`✅ Processed ${tx.tx_hash}`);
      } catch (error) {
        console.log(`⚠️  Failed ${tx.tx_hash}: ${error.message}`);
      }
    }
    
    // Count events after
    const eventsAfter = await db.query('SELECT COUNT(*) as count FROM events');
    console.log(`📊 Events after: ${eventsAfter[0].count}`);
    
    const newEvents = eventsAfter[0].count - eventsBefore[0].count;
    console.log(`🎉 NEW EVENTS PROCESSED: ${newEvents}`);
    
    if (newEvents > 0) {
      console.log('✅ Issue #1 CONFIRMED FIXED: Event processing working with Lava RPC!');
      
      // Show sample events
      const sampleEvents = await db.query('SELECT * FROM events ORDER BY event_id DESC LIMIT 3');
      console.log('📋 Sample new events:');
      sampleEvents.forEach(event => {
        console.log(`  Event ${event.event_id}: ${event.tx_hash} -> ${event.contract_address}`);
      });
    }
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

processEventsWithWorkingRPC();
