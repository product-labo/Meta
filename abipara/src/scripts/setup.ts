#!/usr/bin/env tsx

import { setupContractRegistry } from '../lib/contract-registry';
import { db } from '../lib/database';

async function main() {
  console.log('🚀 Setting up blockchain analytics database...');
  
  try {
    // Setup contract registry
    await setupContractRegistry();
    
    console.log('✅ Database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run indexers: npm run indexer:evm');
    console.log('2. Or start all: npm run indexer:starknet & npm run indexer:beacon');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
