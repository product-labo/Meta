const { StarknetRPCClient } = require('./dist/services/rpc/StarknetRPCClient');
const { Database } = require('./dist/database/Database');
const { EventProcessor } = require('./dist/services/ingestion/EventProcessor');
const { loadConfig } = require('./dist/utils/config');

async function testEventProcessing() {
  try {
    console.log('🔧 Testing Event Processing Fix...');
    
    const config = loadConfig();
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    const db = new Database(config.database);
    const eventProcessor = new EventProcessor(rpc, db);
    
    // Get a recent transaction hash from database
    const result = await db.query('SELECT tx_hash, block_number FROM transactions ORDER BY block_number DESC LIMIT 1');
    
    if (result.length === 0) {
      console.log('❌ No transactions found in database');
      return;
    }
    
    const { tx_hash, block_number } = result[0];
    console.log(`📋 Testing with transaction: ${tx_hash}`);
    
    // Count events before
    const eventsBefore = await db.query('SELECT COUNT(*) as count FROM events');
    console.log(`📊 Events before: ${eventsBefore[0].count}`);
    
    // Process events for this transaction
    await eventProcessor.processTransactionEvents(tx_hash, BigInt(block_number));
    
    // Count events after
    const eventsAfter = await db.query('SELECT COUNT(*) as count FROM events');
    console.log(`📊 Events after: ${eventsAfter[0].count}`);
    
    const newEvents = eventsAfter[0].count - eventsBefore[0].count;
    console.log(`✅ New events processed: ${newEvents}`);
    
    if (newEvents > 0) {
      console.log('🎉 Issue #1 FIX CONFIRMED: Event processing is working!');
    } else {
      console.log('⚠️  No new events - may be duplicate or no events in this transaction');
    }
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEventProcessing();
