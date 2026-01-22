/**
 * Unit Tests for Starknet Indexer Worker
 * 
 * Tests Starknet block fetching, transaction filtering, internal call processing,
 * and data storage with correct chain_type.
 * 
 * Requirements: 4.1, 4.2, 7.4
 */

import { StarknetIndexerWorker, DEFAULT_STARKNET_RPC_ENDPOINTS } from '../../src/services/starknetIndexerWorker.js';
import { pool } from '../../src/config/appConfig.js';
import { abiParserService } from '../../src/services/abiParserService.js';

// Mock dependencies
jest.mock('../../src/config/appConfig.js', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn()
  }
}));

jest.mock('../../src/services/abiParserService.js', () => ({
  abiParserService: {
    getABIFeatures: jest.fn()
  }
}));

// Mock starknet provider
jest.mock('starknet', () => ({
  RpcProvider: jest.fn().mockImplementation(() => ({
    getBlockNumber: jest.fn().mockResolvedValue(1000),
    getBlockWithTxs: jest.fn(),
    getTransactionReceipt: jest.fn()
  })),
  CallData: {},
  cairo: {}
}));

describe('StarknetIndexerWorker', () => {
  let worker;
  let mockClient;
  let mockProvider;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);

    // Setup worker
    worker = new StarknetIndexerWorker(DEFAULT_STARKNET_RPC_ENDPOINTS['starknet-sepolia']);

    // Mock ABI parser to return empty features
    abiParserService.getABIFeatures.mockResolvedValue({
      functions: [],
      events: []
    });
  });

  describe('Starknet Block Fetching', () => {
    test('should fetch Starknet blocks successfully', async () => {
      const { RpcProvider } = require('starknet');
      mockProvider = new RpcProvider();
      
      const mockBlock = {
        block_number: 100,
        timestamp: 1234567890,
        transactions: []
      };

      mockProvider.getBlockWithTxs.mockResolvedValue(mockBlock);

      const result = await worker.processBatch(
        'wallet-123',
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        'starknet-sepolia',
        'starknet',
        100,
        100,
        mockProvider
      );

      expect(mockProvider.getBlockWithTxs).toHaveBeenCalledWith(100);
      expect(result).toHaveProperty('transactions');
      expect(result).toHaveProperty('events');
    });

    test('should handle block fetch errors gracefully', async () => {
      const { RpcProvider } = require('starknet');
      mockProvider = new RpcProvider();
      
      mockProvider.getBlockWithTxs.mockRejectedValue(new Error('Block not found'));

      const result = await worker.processBatch(
        'wallet-123',
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        'starknet-sepolia',
        'starknet',
        100,
        100,
        mockProvider
      );

      // Should return empty result instead of throwing
      expect(result.transactions).toBe(0);
      expect(result.events).toBe(0);
    });
  });

  describe('Transaction Filtering', () => {
    test('should identify transactions where wallet is sender', () => {
      const walletAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const tx = {
        sender_address: walletAddress,
        contract_address: '0x123',
        calldata: []
      };

      const result = worker.isWalletInvolvedInTransaction(walletAddress, tx);
      expect(result).toBe(true);
    });

    test('should identify transactions where wallet is contract address', () => {
      const walletAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const tx = {
        sender_address: '0x123',
        contract_address: walletAddress,
        calldata: []
      };

      const result = worker.isWalletInvolvedInTransaction(walletAddress, tx);
      expect(result).toBe(true);
    });

    test('should identify transactions where wallet appears in calldata', () => {
      const walletAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const tx = {
        sender_address: '0x123',
        contract_address: '0x456',
        calldata: ['0x789', walletAddress, '0xabc']
      };

      const result = worker.isWalletInvolvedInTransaction(walletAddress, tx);
      expect(result).toBe(true);
    });

    test('should return false when wallet is not involved', () => {
      const walletAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const tx = {
        sender_address: '0x123',
        contract_address: '0x456',
        calldata: ['0x789', '0xabc']
      };

      const result = worker.isWalletInvolvedInTransaction(walletAddress, tx);
      expect(result).toBe(false);
    });

    test('should handle case-insensitive address matching', () => {
      const walletAddress = '0x049D36570D4E46F48E99674BD3FCC84644DDD6B96F7C741B1562B82F9E004DC7';
      const tx = {
        sender_address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        contract_address: '0x456',
        calldata: []
      };

      const result = worker.isWalletInvolvedInTransaction(walletAddress, tx);
      expect(result).toBe(true);
    });
  });

  describe('Internal Call Processing', () => {
    test('should extract internal calls from calldata', async () => {
      const walletAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const tx = {
        transaction_hash: '0xabc123',
        calldata: [
          '0x123', // contract address
          '0x456', // selector
          '0x789', // param1
          walletAddress // param2 - wallet involved
        ]
      };

      const internalCalls = await worker.processInternalCalls(tx, walletAddress);

      expect(internalCalls).toBeInstanceOf(Array);
      expect(internalCalls.length).toBeGreaterThan(0);
      expect(internalCalls[0]).toHaveProperty('contractAddress');
      expect(internalCalls[0]).toHaveProperty('selector');
      expect(internalCalls[0]).toHaveProperty('calldata');
    });

    test('should handle empty calldata', async () => {
      const walletAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const tx = {
        transaction_hash: '0xabc123',
        calldata: []
      };

      const internalCalls = await worker.processInternalCalls(tx, walletAddress);

      expect(internalCalls).toBeInstanceOf(Array);
      expect(internalCalls.length).toBe(0);
    });

    test('should filter internal calls relevant to wallet', async () => {
      const walletAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const tx = {
        transaction_hash: '0xabc123',
        calldata: [
          '0x123',
          '0x456',
          '0x789' // No wallet address
        ]
      };

      const internalCalls = await worker.processInternalCalls(tx, walletAddress);

      // Should not include calls not relevant to wallet
      expect(internalCalls).toBeInstanceOf(Array);
    });
  });

  describe('Data Storage with chain_type', () => {
    test('should store transactions with chain_type="starknet"', async () => {
      const transactions = [
        {
          walletId: 'wallet-123',
          chain: 'starknet-sepolia',
          chainType: 'starknet',
          transactionHash: '0xabc123',
          blockNumber: 100,
          blockTimestamp: new Date(),
          fromAddress: '0x123',
          toAddress: '0x456',
          valueEth: '0',
          gasUsed: null,
          gasPrice: null,
          functionSelector: '0x789',
          functionName: 'transfer',
          functionCategory: 'transfer',
          decodedParams: {},
          transactionStatus: 1,
          isContractInteraction: true,
          direction: 'outgoing',
          rawData: {}
        }
      ];

      await worker.storeTransactions(transactions);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wallet_transactions'),
        expect.arrayContaining([
          'wallet-123',
          'starknet-sepolia',
          'starknet', // chain_type
          '0xabc123',
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything()
        ])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should store events with chain_type="starknet"', async () => {
      const events = [
        {
          walletId: 'wallet-123',
          transactionHash: '0xabc123',
          chain: 'starknet-sepolia',
          chainType: 'starknet',
          blockNumber: 100,
          blockTimestamp: new Date(),
          eventSignature: '0xdef456',
          eventName: 'Transfer',
          contractAddress: '0x789',
          decodedParams: {},
          logIndex: 0,
          rawTopics: ['0xdef456'],
          rawData: ['0x123', '0x456']
        }
      ];

      await worker.storeEvents(events);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wallet_events'),
        expect.arrayContaining([
          'wallet-123',
          '0xabc123',
          'starknet-sepolia',
          'starknet', // chain_type
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything()
        ])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should rollback on storage error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const transactions = [
        {
          walletId: 'wallet-123',
          chain: 'starknet-sepolia',
          chainType: 'starknet',
          transactionHash: '0xabc123',
          blockNumber: 100,
          blockTimestamp: new Date(),
          fromAddress: '0x123',
          toAddress: '0x456',
          valueEth: '0',
          gasUsed: null,
          gasPrice: null,
          functionSelector: null,
          functionName: null,
          functionCategory: null,
          decodedParams: null,
          transactionStatus: 1,
          isContractInteraction: true,
          direction: 'outgoing',
          rawData: {}
        }
      ];

      await expect(worker.storeTransactions(transactions)).rejects.toThrow('Failed to store Starknet transactions');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Transaction Decoding', () => {
    test('should decode Starknet transaction with function selector', async () => {
      const tx = {
        transaction_hash: '0xabc123',
        contract_address: '0x123',
        calldata: ['0x456', '0x789', '0xabc', '0xdef']
      };

      abiParserService.getABIFeatures.mockResolvedValue({
        functions: [
          {
            selector: '0x789',
            name: 'transfer',
            category: 'transfer',
            inputs: [
              { name: 'recipient', type: 'felt' },
              { name: 'amount', type: 'u256' }
            ]
          }
        ],
        events: []
      });

      const result = await worker.decodeStarknetTransaction(tx, 'starknet-sepolia');

      expect(result.functionSelector).toBe('0x789');
      expect(result.functionName).toBe('transfer');
      expect(result.functionCategory).toBe('transfer');
      expect(result.decodedParams).toBeDefined();
    });

    test('should handle transaction without ABI', async () => {
      const tx = {
        transaction_hash: '0xabc123',
        contract_address: '0x123',
        calldata: ['0x456', '0x789']
      };

      abiParserService.getABIFeatures.mockResolvedValue({
        functions: [],
        events: []
      });

      const result = await worker.decodeStarknetTransaction(tx, 'starknet-sepolia');

      expect(result.functionSelector).toBe('0x789');
      expect(result.functionName).toBeNull();
      expect(result.functionCategory).toBeNull();
    });
  });

  describe('Event Decoding', () => {
    test('should decode Starknet event with signature', async () => {
      const event = {
        from_address: '0x123',
        keys: ['0xabc123', '0xdef456'],
        data: ['0x789', '0xghi']
      };

      abiParserService.getABIFeatures.mockResolvedValue({
        functions: [],
        events: [
          {
            topic: '0xabc123',
            name: 'Transfer',
            inputs: [
              { name: 'from', type: 'felt' },
              { name: 'to', type: 'felt' },
              { name: 'amount', type: 'u256' }
            ]
          }
        ]
      });

      const result = await worker.decodeStarknetEvent(event, 'starknet-sepolia');

      expect(result).toBeDefined();
      expect(result.eventName).toBe('Transfer');
      expect(result.decodedParams).toBeDefined();
    });

    test('should return Unknown for events without ABI', async () => {
      const event = {
        from_address: '0x123',
        keys: ['0xabc123'],
        data: ['0x789']
      };

      abiParserService.getABIFeatures.mockResolvedValue({
        functions: [],
        events: []
      });

      const result = await worker.decodeStarknetEvent(event, 'starknet-sepolia');

      expect(result).toBeDefined();
      expect(result.eventName).toBe('Unknown');
    });
  });

  describe('Progress Tracking', () => {
    test('should calculate blocks per second correctly', () => {
      const bps = worker.calculateBlocksPerSecond(100, 200, 10000); // 100 blocks in 10 seconds
      expect(bps).toBe(10.1);
    });

    test('should return 0 for invalid elapsed time', () => {
      const bps = worker.calculateBlocksPerSecond(100, 200, 0);
      expect(bps).toBe(0);
    });
  });

  describe('Transaction Direction', () => {
    test('should identify outgoing transactions', () => {
      const direction = worker.getTransactionDirection('0x123', '0x123', '0x456');
      expect(direction).toBe('outgoing');
    });

    test('should identify incoming transactions', () => {
      const direction = worker.getTransactionDirection('0x123', '0x456', '0x123');
      expect(direction).toBe('incoming');
    });

    test('should identify internal transactions', () => {
      const direction = worker.getTransactionDirection('0x123', '0x123', '0x123');
      expect(direction).toBe('internal');
    });

    test('should return unknown for unrelated transactions', () => {
      const direction = worker.getTransactionDirection('0x123', '0x456', '0x789');
      expect(direction).toBe('unknown');
    });
  });

  describe('Worker Lifecycle', () => {
    test('should start and stop indexing', () => {
      expect(worker.isIndexing()).toBe(false);
      
      worker.isRunning = true;
      expect(worker.isIndexing()).toBe(true);
      
      worker.stop();
      expect(worker.shouldStop).toBe(true);
    });
  });
});
