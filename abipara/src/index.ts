#!/usr/bin/env tsx

import { runAnalytics } from './lib/analytics';
import { setupContractRegistry } from './lib/contract-registry';

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      console.log('🚀 Setting up contract registry...');
      await setupContractRegistry();
      console.log('✅ Setup complete!');
      break;
      
    case 'analytics':
      console.log('📊 Running analytics...');
      await runAnalytics();
      break;
      
    default:
      console.log('Available commands:');
      console.log('  setup     - Setup contract registry');
      console.log('  analytics - Run analytics queries');
      console.log('');
      console.log('Indexer commands:');
      console.log('  npm run indexer:evm      - Start EVM indexer');
      console.log('  npm run indexer:starknet - Start Starknet indexer');
      console.log('  npm run indexer:beacon   - Start Beacon indexer');
  }
}

main().catch(console.error);
