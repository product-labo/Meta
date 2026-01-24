#!/usr/bin/env node

/**
 * Multi-Chain Smart Contract Analytics Server
 * Handles contract + chain input, routes to correct RPC, fetches target + competitor data
 */

import dotenv from 'dotenv';
import { AnalyticsEngine } from './src/index.js';

dotenv.config();

// RPC Router - maps chain to correct RPC endpoint
const RPC_ROUTER = {
  ethereum: process.env.ETHEREUM_RPC_URL,
  lisk: process.env.LISK_RPC_URL1,
  starknet: process.env.STARKNET_RPC_URL1,
  polygon: process.env.POLYGON_RPC_URL,
  base: process.env.BASE_RPC_URL,
  arbitrum: process.env.ARBITRUM_RPC_URL,
  optimism: process.env.OPTIMISM_RPC_URL
};

async function analyzeWithCompetitors() {
  console.log('🚀 Multi-Chain Smart Contract Analytics\n');

  // Load target contract
  const target = {
    address: process.env.CONTRACT_ADDRESS,
    chain: process.env.CONTRACT_CHAIN || 'ethereum',
    name: process.env.CONTRACT_NAME || 'Target Contract'
  };

  // Load competitors
  const competitors = [];
  for (let i = 1; i <= 5; i++) {
    const address = process.env[`COMPETITOR_${i}_ADDRESS`];
    const chain = process.env[`COMPETITOR_${i}_CHAIN`];
    const name = process.env[`COMPETITOR_${i}_NAME`];
    
    if (address && chain) {
      competitors.push({ address, chain, name: name || `Competitor ${i}` });
    }
  }

  console.log(`📋 Target: ${target.name} (${target.address}) on ${target.chain}`);
  console.log(`📋 RPC: ${RPC_ROUTER[target.chain]}`);
  console.log(`📋 Competitors: ${competitors.length} loaded\n`);

  const engine = new AnalyticsEngine();

  // Analyze target
  console.log(`\n🎯 Analyzing TARGET: ${target.name}...`);
  console.log(`   Chain: ${target.chain}`);
  console.log(`   RPC: ${RPC_ROUTER[target.chain]}`);
  
  const targetResult = await engine.analyzeContract(target.address, target.chain);
  
  console.log(`✅ Target analyzed: ${targetResult.transactions} transactions`);
  console.log(`   Users: ${targetResult.behavior?.userCount || 0}`);
  console.log(`   Total Value: ${targetResult.metrics?.totalValue?.toFixed(4) || 0} ETH`);

  // Analyze competitors
  const competitorResults = [];
  
  for (const comp of competitors) {
    console.log(`\n🏆 Analyzing COMPETITOR: ${comp.name}...`);
    console.log(`   Chain: ${comp.chain}`);
    console.log(`   RPC: ${RPC_ROUTER[comp.chain]}`);
    
    try {
      const result = await engine.analyzeContract(comp.address, comp.chain);
      competitorResults.push({ ...comp, result });
      
      console.log(`✅ ${comp.name} analyzed: ${result.transactions} transactions`);
      console.log(`   Users: ${result.behavior?.userCount || 0}`);
      console.log(`   Total Value: ${result.metrics?.totalValue?.toFixed(4) || 0} ETH`);
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
      competitorResults.push({ ...comp, result: { error: error.message } });
    }
  }

  // Comparative summary
  console.log('\n\n📊 COMPARATIVE ANALYSIS');
  console.log('═'.repeat(60));
  console.log(`\n${target.name} (${target.chain}):`);
  console.log(`  Transactions: ${targetResult.transactions}`);
  console.log(`  Users: ${targetResult.behavior?.userCount || 0}`);
  console.log(`  Value: ${targetResult.metrics?.totalValue?.toFixed(4) || 0} ETH`);
  
  console.log('\nCompetitors:');
  competitorResults.forEach(comp => {
    if (!comp.result.error) {
      console.log(`\n${comp.name} (${comp.chain}):`);
      console.log(`  Transactions: ${comp.result.transactions}`);
      console.log(`  Users: ${comp.result.behavior?.userCount || 0}`);
      console.log(`  Value: ${comp.result.metrics?.totalValue?.toFixed(4) || 0} ETH`);
    } else {
      console.log(`\n${comp.name}: ❌ ${comp.result.error}`);
    }
  });

  console.log('\n✅ Analysis complete!\n');
}

// Run
analyzeWithCompetitors().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
