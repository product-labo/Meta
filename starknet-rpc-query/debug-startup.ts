import { loadConfig } from './src/utils/config';
import { Database } from './src/database/Database';
import { StarknetRPCClient } from './src/services/rpc/StarknetRPCClient';

async function debugStartup() {
  try {
    console.log('1. Loading config...');
    const config = loadConfig();
    console.log('Config loaded:', {
      db: { host: config.database.host, name: config.database.name, user: config.database.user },
      rpc: { url: config.rpc.url, timeout: config.rpc.timeout }
    });

    console.log('2. Creating database connection...');
    const db = new Database(config.database);
    
    console.log('3. Testing database connection...');
    await db.connect();
    console.log('Database connected successfully');

    console.log('4. Creating RPC client...');
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    
    console.log('5. Testing RPC connection...');
    const blockNumber = await rpc.getBlockNumber();
    console.log('RPC connected, current block:', blockNumber);

    console.log('6. Running migrations...');
    await db.runMigrations();
    console.log('Migrations completed');

    console.log('All components initialized successfully!');
    
    await db.disconnect();
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

debugStartup();
