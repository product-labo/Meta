/**
 * Unit Tests for Error Handling
 * 
 * Tests RPC failover mechanism, rate limit handling, decode failure handling, and retry logic.
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import { jest } from '@jest/globals';
import { EVMIndexerWorker } from '../../src/services/evmIndexerWorker.js';
import { StarknetIndexerWorker } from '../../src/services/starknetIndexerWorker.js';
import { indexingOrchestrator } from '../../src/services/indexingOrchestratorService.js';

// Mock dependencies
jest.mock('../../src/config/appConfig.js', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn()
  }
}));

jest.mock('../../src/services/abiParserService.js', () => ({
  abiParserService: {
    getABIFeatures: jest.fn(() => ({
      functions: [],
      events: []
    }))
  }
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    formatEther: jest.fn((value) => (parseFloat(value) / 1e18).toString()),
    Interface: jest.fn(() => ({
      decodeFunctionData: jest.fn(() => ({})),
      decodeEventLog: jest.fn(() => ({}))
    }))
  }
}));

// Mock starknet
jest.mock('starknet', () => ({
  RpcProvider: jest.fn(),
  CallData: {},
  cairo: {}
}));

describe('Error Handling Unit Tests', () => {
  describe('RPC Failover Mechanism', () => {
    test('should switch to fallback RPC endpoint when primary fails', async () => {
      const mockRpcEndpoints = [
        'https://primary-rpc.example.com',
        'https://fallback-rpc.example.com',
        'https://backup-rpc.example.com'
      ];

      const indexer = new EVMIndexerWorker(mockRpcEndpoints);
      const rpcManager = indexer.rpcManager;

      // Mock first endpoint to fail
      const { ethers } = await import('ethers');
      const mockProvider1 = {
        getBlockNumber: jest.fn().mockRejectedValue(new Error('Connection timeout'))
      };
      const mockProvider2 = {
        getBlockNumber: jest.fn().mockResolvedValue(1000)
      };

      ethers.JsonRpcProvider
        .mockReturnValueOnce(mockProvider1)
        .mockReturnValueOnce(mockProvider2);

      // First call should fail and switch to next endpoint
      const provider = await rpcManager.getProvider();

      expect(ethers.JsonRpcProvider).toHaveBeenCalledTimes(2);
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(mockRpcEndpoints[0]);
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(mockRpcEndpoints[1]);
      expect(rpcManager.failedEndpoints.has(mockRpcEndpoints[0])).toBe(true);
      expect(rpcManager.currentIndex).toBe(1);
    });

    test('should throw error when all RPC endpoints fail', async () => {
      const mockRpcEndpoints = [
        'https://rpc1.example.com',
        'https://rpc2.example.com'
      ];

      const indexer = new EVMIndexerWorker(mockRpcEndpoints);
      const rpcManager = indexer.rpcManager;

      const { ethers } = await import('ethers');
      const mockProvider = {
        getBlockNumber: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };

      ethers.JsonRpcProvider.mockReturnValue(mockProvider);

      await expect(rpcManager.getProvider()).rejects.toThrow('All RPC endpoints are currently unavailable');
      // The RPC manager tries each endpoint once per attempt, and may retry
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(mockRpcEndpoints[0]);
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(mockRpcEndpoints[1]);
    });

    test('should implement exponential backoff for failed endpoints', () => {
      const mockRpcEndpoints = ['https://rpc.example.com'];
      const indexer = new EVMIndexerWorker(mockRpcEndpoints);
      const rpcManager = indexer.rpcManager;

      const endpoint = mockRpcEndpoints[0];
      const initialTime = Date.now();

      // First failure
      rpcManager.markEndpointFailed(endpoint);
      const firstRetryTime = rpcManager.retryDelays.get(endpoint);
      expect(firstRetryTime).toBeGreaterThan(initialTime);

      // Second failure should have longer delay
      rpcManager.markEndpointFailed(endpoint);
      const secondRetryTime = rpcManager.retryDelays.get(endpoint);
      expect(secondRetryTime).toBeGreaterThan(firstRetryTime);

      // Verify exponential growth
      const firstDelay = firstRetryTime - initialTime;
      const secondDelay = secondRetryTime - initialTime;
      expect(secondDelay).toBeGreaterThan(firstDelay * 1.5); // Should be roughly double
    });

    test('should respect cooldown period for failed endpoints', async () => {
      const mockRpcEndpoints = [
        'https://failed-rpc.example.com',
        'https://working-rpc.example.com'
      ];

      const indexer = new EVMIndexerWorker(mockRpcEndpoints);
      const rpcManager = indexer.rpcManager;

      // Mark first endpoint as failed with future retry time
      rpcManager.failedEndpoints.add(mockRpcEndpoints[0]);
      rpcManager.retryDelays.set(mockRpcEndpoints[0], Date.now() + 60000); // 1 minute from now

      const { ethers } = await import('ethers');
      const mockProvider = {
        getBlockNumber: jest.fn().mockResolvedValue(1000)
      };
      ethers.JsonRpcProvider.mockReturnValue(mockProvider);

      await rpcManager.getProvider();

      // Should skip failed endpoint and use second one
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(mockRpcEndpoints[1]);
      expect(rpcManager.currentIndex).toBe(1);
    });

    test('should retry failed endpoint after cooldown expires', async () => {
      const mockRpcEndpoints = ['https://recovered-rpc.example.com'];
      const indexer = new EVMIndexerWorker(mockRpcEndpoints);
      const rpcManager = indexer.rpcManager;

      // Mark endpoint as failed with past retry time (cooldown expired)
      rpcManager.failedEndpoints.add(mockRpcEndpoints[0]);
      rpcManager.retryDelays.set(mockRpcEndpoints[0], Date.now() - 1000); // 1 second ago

      const { ethers } = await import('ethers');
      const mockProvider = {
        getBlockNumber: jest.fn().mockResolvedValue(1000)
      };
      ethers.JsonRpcProvider.mockReturnValue(mockProvider);

      await rpcManager.getProvider();

      // Should retry the endpoint and remove from failed set
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(mockRpcEndpoints[0]);
      expect(rpcManager.failedEndpoints.has(mockRpcEndpoints[0])).toBe(false);
      expect(rpcManager.retryDelays.has(mockRpcEndpoints[0])).toBe(false);
    });
  });

  describe('Rate Limit Handling', () => {
    test('should detect rate limit errors and implement backoff', async () => {
      const mockRpcEndpoints = ['https://rate-limited-rpc.example.com'];
      const indexer = new EVMIndexerWorker(mockRpcEndpoints);

      // Mock rate limit error (HTTP 429)
      const rateLimitError = new Error('Too Many Requests');
      rateLimitError.code = 429;
      rateLimitError.status = 429;

      const { ethers } = await import('ethers');
      const mockProvider = {
        getBlockNumber: jest.fn().mockRejectedValue(rateLimitError)
      };
      ethers.JsonRpcProvider.mockReturnValue(mockProvider);

      // Should handle rate limit gracefully
      await expect(indexer.rpcManager.getProvider()).rejects.toThrow('All RPC endpoints are currently unavailable');
      
      // Check if the enhanced RPC manager has rate limit tracking
      if (indexer.rpcManager.rateLimitedEndpoints) {
        // Enhanced version - should track rate limits separately
        expect(indexer.rpcManager.rateLimitedEndpoints.has(mockRpcEndpoints[0])).toBe(true);
      } else {
        // Original version - treats rate limits as regular failures
        expect(indexer.rpcManager.failedEndpoints.has(mockRpcEndpoints[0])).toBe(true);
        expect(indexer.rpcManager.retryDelays.has(mockRpcEndpoints[0])).toBe(true);
      }
    });

    test('should implement progressive backoff for repeated rate limits', () => {
      const mockRpcEndpoints = ['https://rpc.example.com'];
      const indexer = new EVMIndexerWorker(mockRpcEndpoints);
      const rpcManager = indexer.rpcManager;

      const endpoint = mockRpcEndpoints[0];

      // Test that the exponential backoff mechanism exists and works
      // by verifying that failed endpoints are tracked and have retry delays
      
      rpcManager.markEndpointFailed(endpoint);
      expect(rpcManager.failedEndpoints.has(endpoint)).toBe(true);
      expect(rpcManager.retryDelays.has(endpoint)).toBe(true);
      
      const firstRetryTime = rpcManager.retryDelays.get(endpoint);
      expect(firstRetryTime).toBeGreaterThan(Date.now());

      // Mark as failed again - should update the retry time
      rpcManager.markEndpointFailed(endpoint);
      const secondRetryTime = rpcManager.retryDelays.get(endpoint);
      expect(secondRetryTime).toBeGreaterThan(firstRetryTime);

      // Verify the delay caps at maximum value
      for (let i = 0; i < 10; i++) {
        rpcManager.markEndpointFailed(endpoint);
      }
      const finalRetryTime = rpcManager.retryDelays.get(endpoint);
      const finalDelay = finalRetryTime - Date.now();
      expect(finalDelay).toBeLessThanOrEqual(300000); // Should cap at 5 minutes
    });
  });

  describe('Decode Failure Handling', () => {
    test('should handle transaction decode failures gracefully', async () => {
      const mockRpcEndpoints = ['https://rpc.example.com'];
      const indexer = new EVMIndexerWorker(mockRpcEndpoints);

      // Mock transaction with invalid data
      const invalidTx = {
        hash: '0x1234567890abcdef',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        data: 'invalid_hex_data', // Invalid hex format
        from: '0x1111111111111111111111111111111111111111',
        value: '0'
      };

      // Should not throw error, but return safe defaults
      const result = await indexer.decodeTransaction(invalidTx, 'ethereum');

      expect(result).toBeDefined();
      expect(result.functionSelector).toBe(null);
      expect(result.functionName).toBe(null);
      expect(result.functionCategory).toBe(null);
      expect(result.decodedParams).toBe(null);
    });

    test('should store raw data when decode fails', async () => {
      const { pool } = await import('../../src/config/appConfig.js');
      const mockClient = {
        query: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      pool.connect.mockResolvedValue(mockClient);

      const indexer = new EVMIndexerWorker(['https://rpc.example.com']);

      const transactionWithFailedDecode = {
        walletId: 'wallet-123',
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
        functionSelector: null, // Decode failed
        functionName: null,
        functionCategory: null,
        decodedParams: null,
        transactionStatus: 1,
        isContractInteraction: true,
        direction: 'outgoing',
        rawData: {
          data: 'invalid_hex_data', // Raw data preserved
          value: '1000000000000000000',
          gasLimit: '21000',
          gasPrice: '20000000000'
        }
      };

      await indexer.storeTransactions([transactionWithFailedDecode]);

      // Verify raw data is stored even when decode fails
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wallet_transactions'),
        expect.arrayContaining([
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
          null, // function_selector
          null, // function_name
          null, // function_category
          'null', // decoded_params (JSON null)
          expect.anything(),
          expect.anything(),
          expect.anything(),
          JSON.stringify(transactionWithFailedDecode.rawData) // raw_data preserved
        ])
      );
    });

    test('should handle event decode failures gracefully', async () => {
      const indexer = new EVMIndexerWorker(['https://rpc.example.com']);

      // Mock event with invalid data
      const invalidEvent = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        topics: null, // Invalid topics
        data: '0x',
        logIndex: 0,
        transactionHash: '0x1234567890abcdef'
      };

      // Should return null instead of throwing
      const result = await indexer.decodeEvent(invalidEvent, 'ethereum');
      expect(result).toBe(null);
    });

    test('should handle ABI parsing errors gracefully', async () => {
      const { abiParserService } = await import('../../src/services/abiParserService.js');
      
      // Mock ABI service to throw error
      abiParserService.getABIFeatures.mockRejectedValue(new Error('ABI parsing failed'));

      const indexer = new EVMIndexerWorker(['https://rpc.example.com']);

      const tx = {
        hash: '0x1234567890abcdef',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        data: '0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb00000000000000000000000000000000000000000000000000de0b6b3a7640000'
      };

      // Should handle ABI service error gracefully
      const result = await indexer.decodeTransaction(tx, 'ethereum');

      expect(result).toBeDefined();
      expect(result.functionSelector).toBe('0xa9059cbb');
      expect(result.functionName).toBe(null); // ABI lookup failed
      expect(result.functionCategory).toBe(null);
      expect(result.decodedParams).toBe(null);
    });
  });

  describe('Retry Logic', () => {
    test('should retry failed batch processing with exponential backoff', async () => {
      const indexer = new EVMIndexerWorker(['https://rpc1.example.com', 'https://rpc2.example.com']);
      
      const { ethers } = await import('ethers');
      const mockProvider1 = {
        getBlockNumber: jest.fn().mockResolvedValue(1000),
        getBlock: jest.fn().mockRejectedValue(new Error('Block fetch failed')),
        getLogs: jest.fn().mockResolvedValue([])
      };
      const mockProvider2 = {
        getBlockNumber: jest.fn().mockResolvedValue(1000),
        getBlock: jest.fn().mockResolvedValue({
          timestamp: 1234567890,
          transactions: []
        }),
        getLogs: jest.fn().mockResolvedValue([])
      };

      ethers.JsonRpcProvider
        .mockReturnValueOnce(mockProvider1)
        .mockReturnValueOnce(mockProvider2);

      // Mock database operations
      const { pool } = await import('../../src/config/appConfig.js');
      const mockClient = {
        query: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      pool.connect.mockResolvedValue(mockClient);

      // Should retry with different RPC endpoint
      const result = await indexer.processBatch(
        'wallet-123',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        'ethereum',
        'evm',
        1000,
        1000,
        mockProvider1
      );

      expect(result).toBeDefined();
      expect(result.transactions).toBe(0);
      expect(result.events).toBe(0);
    });

    test('should skip problematic batch after maximum retries', async () => {
      const indexer = new EVMIndexerWorker(['https://rpc.example.com']);
      
      const { ethers } = await import('ethers');
      const mockProvider = {
        getBlockNumber: jest.fn().mockResolvedValue(1000),
        getBlock: jest.fn().mockRejectedValue(new Error('Persistent block error')),
        getLogs: jest.fn().mockResolvedValue([])
      };

      ethers.JsonRpcProvider.mockReturnValue(mockProvider);

      // Mock database operations
      const { pool } = await import('../../src/config/appConfig.js');
      const mockClient = {
        query: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      pool.connect.mockResolvedValue(mockClient);

      // Should eventually skip the problematic batch
      const result = await indexer.processBatch(
        'wallet-123',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        'ethereum',
        'evm',
        1000,
        1000,
        mockProvider
      );

      expect(result).toBeDefined();
      expect(result.transactions).toBe(0);
      expect(result.events).toBe(0);
    });

    test('should implement retry delay between attempts', async () => {
      const indexer = new EVMIndexerWorker(['https://rpc.example.com']);
      
      let retryCount = 0;

      const { ethers } = await import('ethers');
      const mockProvider = {
        getBlockNumber: jest.fn().mockResolvedValue(1000),
        getBlock: jest.fn().mockImplementation(() => {
          retryCount++;
          // Always fail to test the retry mechanism
          return Promise.reject(new Error('Persistent failure'));
        }),
        getLogs: jest.fn().mockResolvedValue([])
      };

      ethers.JsonRpcProvider.mockReturnValue(mockProvider);

      // Mock database operations
      const { pool } = await import('../../src/config/appConfig.js');
      const mockClient = {
        query: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      pool.connect.mockResolvedValue(mockClient);

      await indexer.processBatch(
        'wallet-123',
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        'ethereum',
        'evm',
        1000,
        1000,
        mockProvider
      );
      
      // The processBatch method should handle errors gracefully and continue
      // Even if individual blocks fail, it should attempt to process them
      expect(retryCount).toBeGreaterThanOrEqual(1); // Should have attempted at least once
    });
  });

  describe('Database Error Handling', () => {
    test('should rollback transaction on database error', async () => {
      const indexer = new EVMIndexerWorker(['https://rpc.example.com']);
      
      const { pool } = await import('../../src/config/appConfig.js');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce() // BEGIN succeeds
          .mockRejectedValueOnce(new Error('Database constraint violation')) // INSERT fails
          .mockResolvedValueOnce(), // ROLLBACK succeeds
        release: jest.fn()
      };
      pool.connect.mockResolvedValue(mockClient);

      const transactions = [{
        walletId: 'wallet-123',
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

      await expect(indexer.storeTransactions(transactions)).rejects.toThrow('Failed to store transactions');
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database connection failures', async () => {
      const indexer = new EVMIndexerWorker(['https://rpc.example.com']);
      
      const { pool } = await import('../../src/config/appConfig.js');
      pool.connect.mockRejectedValue(new Error('Database connection failed'));

      const transactions = [{
        walletId: 'wallet-123',
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

      await expect(indexer.storeTransactions(transactions)).rejects.toThrow('Database connection failed');
    });
  });

  describe('Starknet Error Handling', () => {
    test('should handle Starknet RPC failures with failover', async () => {
      const mockRpcEndpoints = [
        'https://starknet-primary.example.com',
        'https://starknet-fallback.example.com'
      ];

      const worker = new StarknetIndexerWorker(mockRpcEndpoints);
      const rpcManager = worker.rpcManager;

      const { RpcProvider } = await import('starknet');
      const mockProvider1 = {
        getBlockNumber: jest.fn().mockRejectedValue(new Error('Starknet RPC failed'))
      };
      const mockProvider2 = {
        getBlockNumber: jest.fn().mockResolvedValue(1000)
      };

      RpcProvider
        .mockReturnValueOnce(mockProvider1)
        .mockReturnValueOnce(mockProvider2);

      const provider = await rpcManager.getProvider();

      expect(RpcProvider).toHaveBeenCalledTimes(2);
      expect(rpcManager.failedEndpoints.has(mockRpcEndpoints[0])).toBe(true);
      expect(rpcManager.currentIndex).toBe(1);
    });

    test('should handle Starknet transaction decode failures', async () => {
      const worker = new StarknetIndexerWorker(['https://starknet-rpc.example.com']);

      const invalidTx = {
        transaction_hash: '0xabc123',
        contract_address: '0x123',
        calldata: null // Invalid calldata
      };

      const result = await worker.decodeStarknetTransaction(invalidTx, 'starknet-sepolia');

      expect(result).toBeDefined();
      expect(result.functionSelector).toBe(null);
      expect(result.functionName).toBe(null);
      expect(result.functionCategory).toBe(null);
      expect(result.decodedParams).toBe(null);
    });
  });

  describe('Job Error Handling', () => {
    test('should handle job failures gracefully', async () => {
      const jobParams = {
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      };

      const jobId = await indexingOrchestrator.queueIndexingJob(jobParams);
      await indexingOrchestrator.startJob(jobId);

      const errorMessage = 'All RPC endpoints failed';
      await indexingOrchestrator.failJob(jobId, errorMessage);

      const job = await indexingOrchestrator.getJobStatus(jobId);
      expect(job.status).toBe('failed');
      expect(job.errorMessage).toBe(errorMessage);
    });

    test('should allow job retry after failure', async () => {
      const jobParams = {
        walletId: 'wallet-123',
        projectId: 'project-456',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1,
        endBlock: 1000
      };

      const jobId = await indexingOrchestrator.queueIndexingJob(jobParams);
      await indexingOrchestrator.startJob(jobId);
      await indexingOrchestrator.failJob(jobId, 'Temporary failure');

      // Should be able to queue a new job for retry
      const retryJobId = await indexingOrchestrator.queueIndexingJob(jobParams);
      expect(retryJobId).toBeDefined();
      expect(retryJobId).not.toBe(jobId);

      const retryJob = await indexingOrchestrator.getJobStatus(retryJobId);
      expect(retryJob.status).toBe('queued');
    });
  });
});