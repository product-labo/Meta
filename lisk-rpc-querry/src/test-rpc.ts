import 'dotenv/config';
import { RpcClient } from './rpc/client';
import { logger } from './utils/logger';

async function testRpc() {
  try {
    const rpc = new RpcClient();
    
    logger.info('Testing RPC endpoints...');
    logger.info(`Available endpoints: ${rpc.getAllRpcUrls().join(', ')}`);
    
    const blockNumber = await rpc.getCurrentBlockNumber();
    logger.info(`✅ Current block: ${blockNumber} (using ${rpc.getCurrentRpcUrl()})`);
    
    // Test fallback by making multiple requests
    for (let i = 0; i < 3; i++) {
      try {
        const block = await rpc.getBlockByNumber(blockNumber - i, false);
        logger.info(`✅ Block ${blockNumber - i}: ${block?.hash || 'N/A'} (using ${rpc.getCurrentRpcUrl()})`);
      } catch (error) {
        logger.error(`❌ Failed to get block ${blockNumber - i}:`, error);
      }
    }
    
  } catch (error) {
    logger.error('❌ All RPC endpoints failed:', error);
  }
}

testRpc();
