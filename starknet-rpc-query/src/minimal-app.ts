import { loadConfig } from './utils/config';
import { logger } from './utils/logger';
import { Database } from './database/Database';

async function startMinimalApp() {
  try {
    console.log('🚀 Starting Starknet RPC Query System...');
    
    // Load config
    const config = loadConfig();
    console.log('✅ Config loaded');
    
    // Connect to database
    const db = new Database(config.database);
    await db.connect();
    console.log('✅ Database connected');
    
    // Check current data
    const blockCount = await db.query('SELECT COUNT(*) as count FROM blocks');
    const txCount = await db.query('SELECT COUNT(*) as count FROM transactions');
    
    console.log(`📊 Current data: ${blockCount[0].count} blocks, ${txCount[0].count} transactions`);
    
    // Simple monitoring loop
    console.log('🔄 Starting monitoring...');
    setInterval(async () => {
      try {
        const newBlockCount = await db.query('SELECT COUNT(*) as count FROM blocks');
        const newTxCount = await db.query('SELECT COUNT(*) as count FROM transactions');
        const latestBlock = await db.query('SELECT MAX(block_number) as latest FROM blocks');
        
        console.log(`📈 Blocks: ${newBlockCount[0].count}, Transactions: ${newTxCount[0].count}, Latest: ${latestBlock[0].latest}`);
      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    }, 5000);
    
  } catch (error) {
    console.error('💥 Startup failed:', error.message);
    process.exit(1);
  }
}

startMinimalApp();
