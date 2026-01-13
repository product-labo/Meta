import 'dotenv/config';
import { RpcClient } from './rpc/client';
import { logger } from './utils/logger';

async function debugRpc() {
  try {
    const rpc = new RpcClient();
    
    logger.info('🔍 Debugging RPC endpoints...');
    
    // Test each endpoint individually
    const endpoints = rpc.getAllRpcUrls();
    
    for (const endpoint of endpoints) {
      logger.info(`Testing: ${endpoint}`);
      
      try {
        // Create a direct axios call to test
        const axios = require('axios');
        const response = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        logger.info(`✅ ${endpoint}: Block ${parseInt(response.data.result, 16)}`);
        
        // Test getting a block
        const blockResponse = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', false],
          id: 2
        }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (blockResponse.data.result) {
          logger.info(`✅ ${endpoint}: Block data available`);
        } else {
          logger.warn(`⚠️ ${endpoint}: No block data - ${JSON.stringify(blockResponse.data)}`);
        }
        
      } catch (error: any) {
        logger.error(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
  } catch (error) {
    logger.error('Debug failed:', error);
  }
}

debugRpc();
