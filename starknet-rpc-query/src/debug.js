console.log('Starting debug app...');

try {
  console.log('Loading config...');
  const { loadConfig } = require('./utils/config');
  const config = loadConfig();
  console.log('Config loaded:', config);

  console.log('Loading database...');
  const { Database } = require('./database/Database');
  const db = new Database(config.database);
  console.log('Database instance created');

  console.log('Testing database connection...');
  db.connect().then(() => {
    console.log('Database connected successfully');
    
    console.log('Testing RPC client...');
    const { StarknetRPCClient } = require('./services/rpc/StarknetRPCClient');
    const rpc = new StarknetRPCClient(config.rpc.url, config.rpc.timeout);
    console.log('RPC client created');
    
    return rpc.getBlockNumber();
  }).then((blockNumber) => {
    console.log('Current block number:', blockNumber);
    console.log('All components working!');
  }).catch((error) => {
    console.error('Error during startup:', error);
    console.error('Stack trace:', error.stack);
  });

} catch (error) {
  console.error('Critical error during initialization:', error);
  console.error('Stack trace:', error.stack);
}
