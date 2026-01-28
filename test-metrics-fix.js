#!/usr/bin/env node

/**
 * Quick test to verify metrics are now available
 */

import dotenv from 'dotenv';
import { AnalyticsEngine } from './src/index.js';

dotenv.config();

async function testMetricsGeneration() {
  console.log('🧪 Testing metrics generation after provider fix...');
  
  try {
    const engine = new AnalyticsEngine({
      maxRequestsPerSecond: 5,
      failoverTimeout: 10000, // Shorter timeout for test
      maxRetries: 1
    });
    
    console.log('✅ AnalyticsEngine created successfully');
    
    // Test with a simple Ethereum contract (UNI token)
    console.log('🔍 Testing Ethereum analysis...');
    const results = await engine.analyzeContract(
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI token
      'ethereum',
      'Uniswap Token',
      100 // Small block range for quick test
    );
    
    console.log('📊 Analysis Results:');
    console.log('- Contract:', results.contract);
    console.log('- Chain:', results.chain);
    console.log('- Transactions:', results.transactions);
    console.log('- Has Metrics:', !!results.metrics && !results.metrics.error);
    console.log('- Has Full Report:', !!results.fullReport);
    
    if (results.metrics && !results.metrics.error) {
      console.log('✅ SUCCESS: Metrics generated successfully!');
      console.log('- DeFi Metrics available:', !!results.fullReport?.defiMetrics);
      console.log('- User Behavior available:', !!results.fullReport?.userBehavior);
      console.log('- TVL:', results.fullReport?.defiMetrics?.tvl);
      console.log('- DAU:', results.fullReport?.defiMetrics?.dau);
    } else {
      console.log('❌ FAILED: Metrics error:', results.metrics?.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run with timeout
const timeout = setTimeout(() => {
  console.log('⏰ Test timeout - taking too long');
  process.exit(1);
}, 30000); // 30 second timeout

testMetricsGeneration()
  .then(() => {
    clearTimeout(timeout);
    console.log('🎉 Test completed');
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(timeout);
    console.error('💥 Test error:', error);
    process.exit(1);
  });