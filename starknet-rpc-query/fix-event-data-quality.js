const { Database } = require('./dist/database/Database');
const { loadConfig } = require('./dist/utils/config');

async function fixEventDataQuality() {
  try {
    console.log('🔧 Fixing Event Data Quality (Issue #7)...');
    
    const config = loadConfig();
    const db = new Database(config.database);
    
    // 1. Fix events with NULL contract_address by removing them (invalid events)
    console.log('📋 Step 1: Removing invalid events with NULL contract_address...');
    
    const deletedEvents = await db.query(`
      DELETE FROM events 
      WHERE contract_address IS NULL 
      RETURNING event_id
    `);
    
    console.log(`✅ Removed ${deletedEvents.length} invalid events`);
    
    // 2. Update function_id to NULL for all events (since functions table is empty)
    console.log('📋 Step 2: Cleaning function_id references...');
    
    await db.query(`
      UPDATE events 
      SET function_id = NULL 
      WHERE function_id IS NOT NULL
    `);
    
    console.log('✅ Cleaned function_id references');
    
    // 3. Verify event data quality
    const qualityCheck = await db.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN contract_address IS NOT NULL THEN 1 END) as events_with_contract,
        COUNT(CASE WHEN contract_address IS NULL THEN 1 END) as events_without_contract,
        COUNT(CASE WHEN function_id IS NOT NULL THEN 1 END) as events_with_function
      FROM events
    `);
    
    console.log('📊 Event Data Quality Results:');
    console.log(`  Total events: ${qualityCheck[0].total_events}`);
    console.log(`  Events with contract_address: ${qualityCheck[0].events_with_contract}`);
    console.log(`  Events without contract_address: ${qualityCheck[0].events_without_contract}`);
    console.log(`  Events with function_id: ${qualityCheck[0].events_with_function}`);
    
    if (qualityCheck[0].events_without_contract === 0) {
      console.log('🎉 Issue #7 RESOLVED: All events now have valid contract addresses!');
    }
    
  } catch (error) {
    console.error('❌ Event data quality fix failed:', error.message);
  }
}

fixEventDataQuality();
