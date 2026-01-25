#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment Variables:');
console.log('ANALYSIS_BLOCK_RANGE:', process.env.ANALYSIS_BLOCK_RANGE);
console.log('FAILOVER_TIMEOUT:', process.env.FAILOVER_TIMEOUT);
console.log('MAX_RETRIES:', process.env.MAX_RETRIES);

// Test the parsing logic from contracts.js
const analysisParams = {
  blockRange: parseInt(process.env.ANALYSIS_BLOCK_RANGE) || 1000,
  whaleThreshold: parseFloat(process.env.WHALE_THRESHOLD_ETH) || 10,
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 5,
  failoverTimeout: parseInt(process.env.FAILOVER_TIMEOUT) || 30000,
  maxRetries: parseInt(process.env.MAX_RETRIES) || 2,
  outputFormats: (process.env.OUTPUT_FORMATS || 'json,csv,markdown').split(',')
};

console.log('\nParsed Analysis Params:');
console.log(JSON.stringify(analysisParams, null, 2));