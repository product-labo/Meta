#!/usr/bin/env node

/**
 * Multi-Chain Smart Contract Analytics Platform
 * Quick Start Script
 */

import { AnalyticsEngine } from './src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function quickStart() {
  console.log('🚀 Multi-Chain Smart Contract Analytics Platform');
  console.log('================================================\n');

  try {
    // Initialize analytics engine
    const engine = new AnalyticsEngine();

    // Get configuration from environment
    const config = {
      contractAddress: process.env.CONTRACT_ADDRESS,
      contractChain: process.env.CONTRACT_CHAIN || 'lisk',
      contractName: process.env.CONTRACT_NAME || 'Target Contract'
    };

    if (!config.contractAddress) {
      console.error('❌ CONTRACT_ADDRESS not configured in .env file');
      console.log('\n💡 Please configure your contract in .env file:');
      console.log('   CONTRACT_ADDRESS=0xYourContractAddress');
      console.log('   CONTRACT_CHAIN=lisk');
      console.log('   CONTRACT_NAME=YourContractName');
      process.exit(1);
    }

    console.log(`📊 Analyzing: ${config.contractName}`);
    console.log(`📍 Address: ${config.contractAddress}`);
    console.log(`🌐 Chain: ${config.contractChain}\n`);

    // Run analysis
    const result = await engine.analyzeContract(
      config.contractAddress,
      config.contractChain,
      config.contractName
    );

    console.log('\n✅ Analysis Complete!');
    console.log(`📊 Transactions: ${result.transactions}`);
    console.log(`👥 Users: ${result.behavior?.userCount || 0}`);
    console.log(`💰 Total Value: ${result.metrics?.totalValue?.toFixed(4) || 0} ETH`);

    if (result.reportPaths) {
      console.log('\n📁 Reports Generated:');
      if (result.reportPaths.json?.success) {
        console.log(`   📊 JSON: ${result.reportPaths.json.path}`);
      }
      if (result.reportPaths.markdown?.success) {
        console.log(`   📝 Markdown: ${result.reportPaths.markdown.path}`);
      }
    }

    console.log('\n💡 Next Steps:');
    console.log('   npm run analyze:competitors  # Analyze competitors');
    console.log('   npm run reports list         # View all reports');
    console.log('   npm start                    # Start API server');

  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run quick start
quickStart().catch(console.error);