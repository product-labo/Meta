#!/usr/bin/env node

/**
 * Lisk RPC Endpoint Tester
 * Tests all Lisk RPC endpoints configured in .env
 */

import dotenv from 'dotenv';

dotenv.config();

// Use native fetch (Node 18+) or node-fetch
const fetch = globalThis.fetch || (await import('node-fetch')).default;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results storage
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Test a Lisk Service API endpoint
 */
async function testLiskServiceAPI(url, name) {
  console.log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
  console.log(`URL: ${url}`);
  
  try {
    // Test basic connectivity
    const response = await fetch(`${url}/api/v3/network/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data) {
      console.log(`${colors.green}✓ Connected successfully${colors.reset}`);
      console.log(`  Network: ${data.data.chainID || 'Unknown'}`);
      console.log(`  Height: ${data.data.height || 'Unknown'}`);
      console.log(`  Status: ${data.meta?.ready ? 'Ready' : 'Not Ready'}`);
      
      results.passed.push({
        name,
        url,
        status: 'success',
        details: data.data
      });
      return true;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    results.failed.push({
      name,
      url,
      error: error.message
    });
    return false;
  }
}

/**
 * Test Lisk RPC endpoint (JSON-RPC style)
 */
async function testLiskRPC(url, name) {
  console.log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'chain_getBlockHash',
        params: [],
        id: 1
      }),
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.result || data.error) {
      console.log(`${colors.green}✓ RPC endpoint responding${colors.reset}`);
      if (data.result) {
        console.log(`  Latest block hash: ${data.result.substring(0, 20)}...`);
      }
      
      results.passed.push({
        name,
        url,
        status: 'success',
        type: 'rpc'
      });
      return true;
    } else {
      throw new Error('Invalid RPC response format');
    }
  } catch (error) {
    console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    results.failed.push({
      name,
      url,
      error: error.message
    });
    return false;
  }
}

/**
 * Test WebSocket endpoint
 */
async function testWebSocket(url, name) {
  console.log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
  console.log(`URL: ${url}`);
  
  try {
    // For WebSocket, we'll just check if the URL is properly formatted
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      throw new Error('Invalid WebSocket URL format');
    }
    
    console.log(`${colors.yellow}⚠ WebSocket endpoint configured (connection test requires ws library)${colors.reset}`);
    console.log(`  Format: Valid`);
    
    results.warnings.push({
      name,
      url,
      message: 'WebSocket endpoint not fully tested (requires ws library)'
    });
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    results.failed.push({
      name,
      url,
      error: error.message
    });
    return false;
  }
}

/**
 * Test smart contract RPC (Ethereum-style)
 */
async function testSmartContractRPC(url, name) {
  console.log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }),
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.result) {
      const blockNumber = parseInt(data.result, 16);
      console.log(`${colors.green}✓ Smart contract RPC responding${colors.reset}`);
      console.log(`  Current block: ${blockNumber}`);
      
      results.passed.push({
        name,
        url,
        status: 'success',
        blockNumber
      });
      return true;
    } else if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    results.failed.push({
      name,
      url,
      error: error.message
    });
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}         LISK RPC ENDPOINT CONNECTIVITY TEST${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);

  // Test Lisk Mainnet endpoints
  console.log(`\n${colors.yellow}━━━ LISK MAINNET ENDPOINTS ━━━${colors.reset}`);
  
  if (process.env.LISK_RPC_ENDPOINT) {
    await testLiskServiceAPI(process.env.LISK_RPC_ENDPOINT, 'Lisk Mainnet RPC');
  }
  
  if (process.env.LISK_API_URL) {
    await testLiskServiceAPI(process.env.LISK_API_URL, 'Lisk Mainnet API');
  }
  
  if (process.env.LISK_SERVICE_URL) {
    await testLiskServiceAPI(process.env.LISK_SERVICE_URL, 'Lisk Service URL');
  }
  
  if (process.env.LISK_WS_ENDPOINT) {
    await testWebSocket(process.env.LISK_WS_ENDPOINT, 'Lisk Mainnet WebSocket');
  }

  // Test Lisk Mainnet EVM RPC
  if (process.env.LISK_MAINNET_RPC) {
    await testSmartContractRPC(process.env.LISK_MAINNET_RPC, 'Lisk Mainnet EVM RPC');
  }

  // Test Lisk Sepolia (Testnet) endpoints
  console.log(`\n${colors.yellow}━━━ LISK SEPOLIA TESTNET ENDPOINTS ━━━${colors.reset}`);
  
  if (process.env.LISK_SEPOLIA_RPC) {
    await testSmartContractRPC(process.env.LISK_SEPOLIA_RPC, 'Lisk Sepolia RPC');
  }

  // Print summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                    TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.green}✓ Passed: ${results.passed.length}${colors.reset}`);
  results.passed.forEach(r => {
    console.log(`  - ${r.name}`);
  });
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠ Warnings: ${results.warnings.length}${colors.reset}`);
    results.warnings.forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\n${colors.red}✗ Failed: ${results.failed.length}${colors.reset}`);
    results.failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  // Configuration check
  console.log(`\n${colors.yellow}━━━ CONFIGURATION CHECK ━━━${colors.reset}`);
  console.log(`Network: ${process.env.LISK_NETWORK_IDENTIFIER || 'Not set'}`);
  console.log(`Default Fee: ${process.env.LISK_DEFAULT_FEE || 'Not set'} LSK`);
  console.log(`Confirmation Blocks: ${process.env.LISK_CONFIRMATION_BLOCKS || 'Not set'}`);
  
  if (process.env.METAGAUGE_TOKEN_ADDRESS) {
    console.log(`\n${colors.yellow}━━━ SMART CONTRACT ADDRESSES ━━━${colors.reset}`);
    console.log(`MetaGauge Token: ${process.env.METAGAUGE_TOKEN_ADDRESS}`);
    console.log(`MetaGauge Subscription: ${process.env.METAGAUGE_SUBSCRIPTION_ADDRESS || 'Not set'}`);
  }

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Exit with appropriate code
  if (results.failed.length > 0) {
    console.log(`${colors.red}Some endpoints failed. Please check your configuration.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}All endpoints are working correctly!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
