/**
 * Unit tests for WebSocket service initialization and basic functionality
 */

import { IndexerWebSocketService } from '../../src/services/indexerWebSocket.js';
import { EventEmitter } from 'events';

describe('WebSocket Service Unit Tests', () => {
  let webSocketService;
  let mockServer;

  beforeEach(() => {
    webSocketService = new IndexerWebSocketService();
    mockServer = new EventEmitter();
  });

  afterEach(() => {
    if (webSocketService) {
      webSocketService.shutdown();
    }
  });

  describe('Service Initialization', () => {
    test('should initialize without errors', () => {
      expect(() => {
        webSocketService.initialize(mockServer);
      }).not.toThrow();
    });

    test('should set up heartbeat interval', () => {
      webSocketService.initialize(mockServer);
      expect(webSocketService.heartbeatInterval).toBeDefined();
    });

    test('should initialize connection and message queue maps', () => {
      webSocketService.initialize(mockServer);
      expect(webSocketService.connections).toBeInstanceOf(Map);
      expect(webSocketService.messageQueues).toBeInstanceOf(Map);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      webSocketService.initialize(mockServer);
    });

    test('should calculate ETA correctly', () => {
      const job = {
        currentBlock: 1000,
        endBlock: 2000,
        blocksPerSecond: 10
      };
      
      const eta = webSocketService.calculateETA(job);
      expect(eta).toBe(100); // (2000 - 1000) / 10 = 100 seconds
    });

    test('should calculate percentage correctly', () => {
      const job = {
        startBlock: 1000,
        currentBlock: 1500,
        endBlock: 2000
      };
      
      const percentage = webSocketService.calculatePercentage(job);
      expect(percentage).toBeCloseTo(50, 1); // Allow for floating point precision
    });

    test('should handle edge cases in percentage calculation', () => {
      const job1 = {
        startBlock: 1000,
        currentBlock: 1000,
        endBlock: 1000
      };
      
      const percentage1 = webSocketService.calculatePercentage(job1);
      expect(percentage1).toBe(100); // Single block should be 100%

      const job2 = {
        startBlock: 1000,
        currentBlock: 999,
        endBlock: 2000
      };
      
      const percentage2 = webSocketService.calculatePercentage(job2);
      expect(percentage2).toBe(0); // Current block before start should be 0%
    });

    test('should return 0 ETA when blocks per second is 0', () => {
      const job = {
        currentBlock: 1000,
        endBlock: 2000,
        blocksPerSecond: 0
      };
      
      const eta = webSocketService.calculateETA(job);
      expect(eta).toBe(0);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      webSocketService.initialize(mockServer);
    });

    test('should return 0 for connection count when no connections exist', () => {
      const count = webSocketService.getConnectionCount('test-wallet');
      expect(count).toBe(0);
    });

    test('should return 0 for total connections when no connections exist', () => {
      const total = webSocketService.getTotalConnections();
      expect(total).toBe(0);
    });
  });

  describe('Message Queuing', () => {
    beforeEach(() => {
      webSocketService.initialize(mockServer);
    });

    test('should queue messages for offline wallets', () => {
      const message = {
        type: 'progress',
        data: { walletId: 'test-wallet', currentBlock: 1000 }
      };

      webSocketService.queueMessage('test-wallet', message);
      
      const queue = webSocketService.messageQueues.get('test-wallet');
      expect(queue).toBeDefined();
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('progress');
      expect(queue[0].timestamp).toBeDefined();
    });

    test('should limit queue size to prevent memory issues', () => {
      const walletId = 'test-wallet';
      
      // Add 60 messages (more than the 50 limit)
      for (let i = 0; i < 60; i++) {
        const message = {
          type: 'progress',
          data: { walletId, currentBlock: 1000 + i }
        };
        webSocketService.queueMessage(walletId, message);
      }

      const queue = webSocketService.messageQueues.get(walletId);
      expect(queue.length).toBe(50); // Should be limited to 50
      
      // Should keep the most recent messages
      expect(queue[queue.length - 1].data.currentBlock).toBe(1059);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', () => {
      webSocketService.initialize(mockServer);
      expect(() => {
        webSocketService.shutdown();
      }).not.toThrow();
    });

    test('should clear heartbeat interval on shutdown', () => {
      webSocketService.initialize(mockServer);
      const intervalId = webSocketService.heartbeatInterval;
      expect(intervalId).toBeDefined();
      
      webSocketService.shutdown();
      
      // The interval should be cleared (the interval object should be destroyed)
      expect(intervalId._destroyed).toBe(true);
    });
  });
});