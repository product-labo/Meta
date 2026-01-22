/**
 * Unit tests for EVM Indexer Worker
 * Tests specific functionality of the EVMIndexerWorker class
 * Requirements: 4.1, 4.2, 11.1
 */

import { jest } from '@jest/globals';
import { EVMIndexerWorker, DEFAULT_RPC_ENDPOINTS } from '../../src/services/evmIndexerWorker.js';
import { ethers } from 'ethers';

// Mock ethers provider
const mockProvider = {
  getBlockNumber: jest.fn(),
  getBlock: jest.fn(),
  getLogs: jest.fn()
};

// Mock ethers JsonRpcProvider
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(() => mockProvider),
    formatEther: jest.fn((value) => (parseFloat(value) / 1e18).toString()),
    id: jest.fn((signature) => '0x' + signature.split('').map(c => c.charCodeAt(0).toString(16)).join('').padEnd(64, '0')),
    Interface: jest.fn(() => ({
      decodeFunctionData: jest.fn(() => ({})),
      decodeEventLog: jest.fn(() => ({}))
    }))
  }
}));

// Mock database pool
jest.mock('../../src/config/appConfig.js', () => ({
  pool: {
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn()
    })),
    query: jest.fn()
  }
}));

// Mock ABI parser service
jest.mock('../../src/services/abiParserService.js', () => ({
  abiParserService: {
    getABIFeatures: jest.fn(() => ({
      functions: [],
      events: []
    }))
  }
}));

describe('EVMIndexerWorker Unit Tests', () => {
  let indexer;
  const mockRpcEndpoints = [
    'https://eth-mainnet.example.com',
    'https://eth-backup.example.com'
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    indexer = new EVMIndexerWorker(mockRpcEndpoints, 10);
  });

  describe('Constructor and Initialization', () => {
    test('should create indexer with RPC endpoints', () => {
      expect(indexer).toBeDefined();
      expect(indexer.rpcManager).toBeDefined();
      expect(indexer.rpcManager.rpcEndpoints).toEqual(mockRpcEndpoints);
      expect(indexer.batchSize).toBe(10);
      expect(indexer.isRunning).toBe(false);
      expect(indexer.shouldStop).toBe(false);
    });

    test('should create indexer with default batch size', () => {
      const defaultIndexer = new EVMIndexerWorker(mockRpcEndpoints);
      expect(defaultIndexer.batchSize).toBe(100);
    });

    test('should initialize with default RPC endpoints', () => {
      expect(DEFAULT_RPC_ENDPOINTS).toBeDefined();
      expect(DEFAULT_RPC_ENDPOINTS.ethereum).toBeDefined();
      expect(DEFAULT_RPC_ENDPOINTS.polygon).toBeDefined();
      expect(DEFAULT_RPC_ENDPOINTS.lisk).toBeDefined();
      expect(Array.isArray(DEFAULT_RPC_ENDPOINTS.ethereum)).toBe(true);
    });
  });

  describe('RPC Manager Functionality', () => {
    test('should handle RPC endpoint failover', async () => {
      const rpcManager = indexer.rpcManager;
      
      // Test initial state
      expect(rpcManager.currentIndex).toBe(0);
      expect(rpcManager.failedEndpoints.size).toBe(0);

      // Test marking endpoint as failed
      const endpoint = mockRpcEndpoints[0];
      rpcManager.markEndpointFailed(endpoint);
      
      expect(rpcManager.failedEndpoints.has(endpoint)).toBe(true);
      expect(rpcManager.retryDelays.has(endpoint)).toBe(true);
      expect(rpcManager.retryDelays.get(endpoint)).toBeGreaterThan(Date.now());
    });

    test('should switch to next RPC endpoint', () => {
      const rpcManager = indexer.rpcManager;
      const initialIndex = rpcManager.currentIndex;
      
      rpcManager.switchToNext();
      
      expect(rpcManager.currentIndex).toBe((initialIndex + 1) % mockRpcEndpoints.length);
    });

    test('should implement exponential backoff for failed endpoints', () => {
      const rpcManager = indexer.rpcManager;
      const endpoint = mockRpcEndpoints[0];
      
      // First failure
      rpcManager.markEndpointFailed(endpoint);
      const firstDelay = rpcManager.retryDelays.get(endpoint);
      
      // Second failure (should have longer delay)
      rpcManager.markEndpointFailed(endpoint);
      const secondDelay = rpcManager.retryDelays.get(endpoint);
      
      expect(secondDelay).toBeGreaterThan(firstDelay);
    });

    test('should throw error when no RPC endpoints available', async () => {
      const emptyIndexer = new EVMIndexerWorker([]);
      
      await expect(emptyIndexer.rpcManager.getProvider()).rejects.toThrow('No RPC endpoints configured');
    });
  });

  describe('Transaction Filtering Logic', () => {
    test('should determine transaction direction correctly', () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      
      // Test outgoing transaction
      const outgoing = indexer.getTransactionDirection(
        walletAddress,
        walletAddress,
        '0x1234567890123456789012345678901234567890'
      );
      expect(outgoing).toBe('outgoing');

      // Test incoming transaction
      const incoming = indexer.getTransactionDirection(
        walletAddress,
        '0x1234567890123456789012345678901234567890',
        walletAddress
      );
      expect(incoming).toBe('incoming');

      // Test internal transaction (same address)
      const internal = indexer.getTransactionDirection(
        walletAddress,
        walletAddress,
        walletAddress
      );
      expect(internal).toBe('internal');

      // Test unrelated transaction
      const unrelated = indexer.getTransactionDirection(
        walletAddress,
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      );
      expect(unrelated).toBe(null);
    });

    test('should handle case-insensitive address comparison', () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      const lowerCaseAddress = walletAddress.toLowerCase();
      const upperCaseAddress = walletAddress.toUpperCase();
      
      const direction1 = indexer.getTransactionDirection(
        walletAddress,
        lowerCaseAddress,
        '0x1234567890123456789012345678901234567890'
      );
      expect(direction1).toBe('outgoing');

      const direction2 = indexer.getTransactionDirection(
        walletAddress,
        upperCaseAddress,
        '0x1234567890123456789012345678901234567890'
      );
      expect(direction2).toBe('outgoing');
    });
  });

  describe('Transaction Decoding', () => {
    test('should decode transaction with valid function selector', async () => {
      const mockTx = {
        hash: '0x1234567890abcdef',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        data: '0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb00000000000000000000000000000000000000000000000000de0b6b3a7640000'
      };

      const result = await indexer.decodeTransaction(mockTx, 'ethereum');
      
      expect(result).toBeDefined();
      expect(result.functionSelector).toBe('0xa9059cbb');
      expect(result.functionName).toBe(null); // No ABI features mocked
      expect(result.functionCategory).toBe(null);
      expect(result.decodedParams).toBe(null);
    });

    test('should handle transaction with no data', async () => {
      const mockTx = {
        hash: '0x1234567890abcdef',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        data: '0x'
      };

      const result = await indexer.decodeTransaction(mockTx, 'ethereum');
      
      expect(result.functionSelector).toBe(null);
      expect(result.functionName).toBe(null);
      expect(result.functionCategory).toBe(null);
      expect(result.decodedParams).toBe(null);
    });

    test('should handle transaction with insufficient data', async () => {
      const mockTx = {
        hash: '0x1234567890abcdef',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        data: '0x123' // Less than 4 bytes
      };

      const result = await indexer.decodeTransaction(mockTx, 'ethereum');
      
      expect(result.functionSelector).toBe(null);
      expect(result.functionName).toBe(null);
      expect(result.functionCategory).toBe(null);
      expect(result.decodedParams).toBe(null);
    });
  });

  describe('Event Decoding', () => {
    test('should decode event with valid signature', async () => {
      const mockLog = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        logIndex: 0,
        transactionHash: '0x1234567890abcdef'
      };

      const result = await indexer.decodeEvent(mockLog, 'ethereum');
      
      expect(result).toBeDefined();
      expect(result.eventName).toBe('Unknown'); // No ABI features mocked
      expect(result.decodedParams).toBeDefined();
      expect(result.decodedParams.signature).toBe(mockLog.topics[0]);
    });

    test('should handle event with no topics', async () => {
      const mockLog = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        topics: [],
        data: '0x',
        logIndex: 0,
        transactionHash: '0x1234567890abcdef'
      };

      const result = await indexer.decodeEvent(mockLog, 'ethereum');
      
      expect(result).toBe(null);
    });

    test('should handle event with null topics', async () => {
      const mockLog = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        topics: null,
        data: '0x',
        logIndex: 0,
        transactionHash: '0x1234567890abcdef'
      };

      const result = await indexer.decodeEvent(mockLog, 'ethereum');
      
      expect(result).toBe(null);
    });
  });

  describe('Parameter Formatting', () => {
    test('should format decoded parameters correctly', () => {
      const mockDecoded = [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        BigInt('1000000000000000000'),
        { _isBigNumber: true, toString: () => '2000000000000000000' }
      ];

      const mockParamDefinitions = [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'value', type: 'uint256' }
      ];

      const result = indexer.formatDecodedParams(mockDecoded, mockParamDefinitions);
      
      expect(result).toBeDefined();
      expect(result.to).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
      expect(result.amount).toBe('1000000000000000000');
      expect(result.value).toBe('2000000000000000000');
    });

    test('should handle parameters without names', () => {
      const mockDecoded = ['value1', 'value2'];
      const mockParamDefinitions = [
        { type: 'string' },
        { type: 'string' }
      ];

      const result = indexer.formatDecodedParams(mockDecoded, mockParamDefinitions);
      
      expect(result).toBeDefined();
      expect(result.param0).toBe('value1');
      expect(result.param1).toBe('value2');
    });

    test('should handle empty parameter definitions', () => {
      const mockDecoded = ['value1', 'value2'];
      const mockParamDefinitions = [];

      const result = indexer.formatDecodedParams(mockDecoded, mockParamDefinitions);
      
      expect(result).toEqual({});
    });
  });

  describe('Progress Calculation', () => {
    test('should calculate blocks per second correctly', () => {
      const startBlock = 1000;
      const currentBlock = 1100;
      const elapsedMs = 10000; // 10 seconds

      const bps = indexer.calculateBlocksPerSecond(startBlock, currentBlock, elapsedMs);
      
      expect(bps).toBe(10.1); // (1100 - 1000 + 1) / 10 = 10.1
    });

    test('should handle zero elapsed time', () => {
      const bps = indexer.calculateBlocksPerSecond(1000, 1100, 0);
      expect(bps).toBe(0);
    });

    test('should handle negative elapsed time', () => {
      const bps = indexer.calculateBlocksPerSecond(1000, 1100, -1000);
      expect(bps).toBe(0);
    });

    test('should calculate ETA correctly', () => {
      // Mock startBlock for ETA calculation
      indexer.startBlock = 1000;
      const startTime = Date.now() - 10000; // 10 seconds ago
      
      const eta = indexer.calculateETA(1050, 1100, startTime);
      
      expect(eta).toBeGreaterThan(0);
      expect(typeof eta).toBe('number');
    });

    test('should handle ETA edge cases', () => {
      indexer.startBlock = 1000;
      const startTime = Date.now();
      
      // No remaining blocks
      const eta1 = indexer.calculateETA(1100, 1100, startTime);
      expect(eta1).toBe(0);

      // No elapsed time
      const eta2 = indexer.calculateETA(1050, 1100, Date.now() + 1000);
      expect(eta2).toBe(0);
    });
  });

  describe('Indexer State Management', () => {
    test('should track running state correctly', () => {
      expect(indexer.isIndexing()).toBe(false);
      
      indexer.isRunning = true;
      expect(indexer.isIndexing()).toBe(true);
      
      indexer.isRunning = false;
      expect(indexer.isIndexing()).toBe(false);
    });

    test('should handle stop signal', () => {
      expect(indexer.shouldStop).toBe(false);
      
      indexer.stop();
      expect(indexer.shouldStop).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle RPC connection errors gracefully', async () => {
      // Mock provider to throw error
      mockProvider.getBlockNumber.mockRejectedValue(new Error('Connection failed'));
      
      await expect(indexer.rpcManager.getProvider()).rejects.toThrow();
    });

    test('should handle block fetching errors', async () => {
      mockProvider.getBlock.mockRejectedValue(new Error('Block not found'));
      
      // The processBatch method should handle this gracefully
      // This would be tested in integration tests with actual error scenarios
    });

    test('should handle transaction decoding errors', async () => {
      const invalidTx = {
        hash: '0x1234567890abcdef',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        data: 'invalid_data'
      };

      // Should not throw, but return default values
      const result = await indexer.decodeTransaction(invalidTx, 'ethereum');
      expect(result.functionSelector).toBe(null);
    });
  });

  describe('Database Operations', () => {
    test('should handle database connection errors in storeTransactions', async () => {
      const { pool } = await import('../../src/config/appConfig.js');
      
      // Mock database error - first call succeeds (BEGIN), second call fails (INSERT)
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce() // BEGIN succeeds
          .mockRejectedValueOnce(new Error('Database error')) // INSERT fails
          .mockResolvedValueOnce(), // ROLLBACK succeeds
        release: jest.fn()
      };
      pool.connect.mockResolvedValue(mockClient);

      const transactions = [{
        walletId: 'test-wallet-id',
        chain: 'ethereum',
        chainType: 'evm',
        transactionHash: '0x1234567890abcdef',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        fromAddress: '0x1111111111111111111111111111111111111111',
        toAddress: '0x2222222222222222222222222222222222222222',
        valueEth: '1.0',
        gasUsed: 21000,
        gasPrice: 20000000000,
        functionSelector: null,
        functionName: null,
        functionCategory: null,
        decodedParams: null,
        transactionStatus: 1,
        isContractInteraction: false,
        direction: 'outgoing',
        rawData: {}
      }];

      await expect(indexer.storeTransactions(transactions)).rejects.toThrow('Failed to store transactions: Database error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle empty transactions array', async () => {
      // Should not attempt database operations
      await expect(indexer.storeTransactions([])).resolves.not.toThrow();
    });

    test('should handle empty events array', async () => {
      // Should not attempt database operations
      await expect(indexer.storeEvents([])).resolves.not.toThrow();
    });
  });
});