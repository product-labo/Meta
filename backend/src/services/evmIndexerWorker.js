/**
 * EVM Indexer Worker
 * 
 * Handles indexing of EVM-compatible blockchain transactions for wallet addresses.
 * Uses optimized version with batch processing, connection pooling, and caching.
 * 
 * Requirements: 4.1, 4.2, 4.3, 11.1, 11.2, 11.3
 */

import { OptimizedEVMIndexerWorker } from './optimizedEvmIndexerWorker.js';

// Export the optimized version as the default EVM indexer
export { OptimizedEVMIndexerWorker as EVMIndexerWorker };

// Default RPC endpoints for common chains
export const DEFAULT_RPC_ENDPOINTS = {
  ethereum: [
    'https://eth-mainnet.g.alchemy.com/v2/demo',
    'https://mainnet.infura.io/v3/demo',
    'https://ethereum.publicnode.com'
  ],
  polygon: [
    'https://polygon-rpc.com',
    'https://rpc-mainnet.maticvigil.com',
    'https://polygon.llamarpc.com'
  ],
  lisk: [
    'https://rpc.sepolia-api.lisk.com',
    'https://rpc.api.lisk.com'
  ],
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum.llamarpc.com'
  ],
  optimism: [
    'https://mainnet.optimism.io',
    'https://optimism.llamarpc.com'
  ],
  bsc: [
    'https://bsc-dataseed.binance.org',
    'https://bsc.publicnode.com'
  ]
};

export default OptimizedEVMIndexerWorker;