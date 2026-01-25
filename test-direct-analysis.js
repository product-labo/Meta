#!/usr/bin/env node

import { AnalyticsEngine } from './src/index.js';

async function testDirectAnalysis() {
  console.log('🧪 Testing Direct Analysis Engine...\n');
  
  const engine = new AnalyticsEngine({
    maxRequestsPerSecond: 3,
    failoverTimeout: 60000,
    maxRetries: 1
  });
  
  try {
    const contractAddress = '0x05D032ac25d322df992303dCa074EE7392C117b9';
    const chain = 'lisk';
    const blockRange = 10000;
    
    console.log(`🔍 Analyzing contract: ${contractAddress}`);
    console.log(`🌐 Chain: ${chain}`);
    console.log(`📦 Block range: ${blockRange}\n`);
    
    const startTime = Date.now();
    const result = await engine.analyzeContract(contractAddress, chain, blockRange);
    const endTime = Date.now();
    
    console.log(`\n⏱️  Analysis completed in ${endTime - startTime}ms`);
    console.log(`📊 Results:`);
    console.log(`   - Target transactions: ${result.target?.transactions || 0}`);
    console.log(`   - Has metrics: ${!!result.target?.metrics}`);
    console.log(`   - Has behavior: ${!!result.target?.behavior}`);
    
    if (result.target?.metrics?.error) {
      console.log(`   ❌ Error: ${result.target.metrics.error}`);
    } else {
      console.log(`   ✅ Analysis successful`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testDirectAnalysis().catch(console.error);