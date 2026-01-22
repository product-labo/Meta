/**
 * Simple integration tests for WebSocket functionality
 * Tests WebSocket service integration without requiring a live server
 */

import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';
import { IndexerWebSocketService } from '../../src/services/indexerWebSocket.js';
import { indexingOrchestrator } from '../../src/services/indexingOrchestratorService.js';

// Mock WebSocket Server for testing
class MockWebSocketServer extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.clients = new Set();
  }

  close() {
    this.emit('close');
  }
}

// Mock WebSocket Client
class MockWebSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // OPEN
    this.OPEN = 1;
    this.isAlive = true;
    this.sentMessages = [];
  }

  send(data) {
    this.sentMessages.push(JSON.parse(data));
    this.emit('mockSend', data);
  }

  ping() {
    this.emit('ping');
  }

  terminate() {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }
}

describe('WebSocket Integration Tests', () => {
  let webSocketService;
  let mockServer;

  beforeEach(() => {
    // Create a fresh WebSocket service instance for each test
    webSocketService = new IndexerWebSocketService();
    mockServer = new EventEmitter();
    
    // Override WebSocketServer creation
    webSocketService.createWebSocketServer = () => new MockWebSocketServer();
  });

  afterEach(() => {
    if (webSocketService) {
      webSocketService.shutdown();
    }
  });

  describe('Connection Establishment', () => {
    test('should establish authenticated connection successfully', () => {
      webSocketService.initialize(mockServer);
      
      const token = jwt.sign({ id: 'user1' }, process.env.JWT_SECRET || 'secret');
      const mockInfo = {
        req: {
          url: `/ws/indexing?token=${token}&walletId=wallet1`
        }
      };

      const result = webSocketService.verifyClient(mockInfo);
      
      expect(result).toBe(true);
      expect(mockInfo.req.user).toBeDefined();
      expect(mockInfo.req.walletId).toBe('wallet1');
    });

    test('should reject connection without proper authentication', () => {
      webSocketService.initialize(mockServer);
      
      const mockInfo = {
        req: {
          url: '/ws/indexing?walletId=wallet1' // Missing token
        }
      };

      const result = webSocketService.verifyClient(mockInfo);
      
      expect(result).toBe(false);
    });

    test('should handle connection lifecycle correctly', () => {
      webSocketService.initialize(mockServer);
      
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      // Connect
      webSocketService.handleConnection(mockWs, mockReq);
      expect(webSocketService.getConnectionCount('wallet1')).toBe(1);

      // Disconnect
      mockWs.emit('close');
      expect(webSocketService.getConnectionCount('wallet1')).toBe(0);
    });
  });

  describe('Message Delivery', () => {
    test('should deliver progress messages to connected clients', () => {
      webSocketService.initialize(mockServer);
      
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      webSocketService.handleConnection(mockWs, mockReq);

      const job = {
        walletId: 'wallet1',
        currentBlock: 1500,
        startBlock: 1000,
        endBlock: 2000,
        transactionsFound: 10,
        eventsFound: 20,
        blocksPerSecond: 5
      };

      webSocketService.broadcastProgress(job);

      expect(mockWs.sentMessages.length).toBeGreaterThan(0);
      const progressMessage = mockWs.sentMessages.find(msg => msg.type === 'progress');
      expect(progressMessage).toBeDefined();
      expect(progressMessage.data.walletId).toBe('wallet1');
      expect(progressMessage.data.currentBlock).toBe(1500);
    });

    test('should deliver completion messages', () => {
      webSocketService.initialize(mockServer);
      
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      webSocketService.handleConnection(mockWs, mockReq);

      const job = {
        walletId: 'wallet1',
        transactionsFound: 25,
        eventsFound: 50,
        completedAt: new Date()
      };

      webSocketService.broadcastComplete(job);

      const completeMessage = mockWs.sentMessages.find(msg => msg.type === 'complete');
      expect(completeMessage).toBeDefined();
      expect(completeMessage.data.totalTransactions).toBe(25);
      expect(completeMessage.data.totalEvents).toBe(50);
    });

    test('should deliver error messages', () => {
      webSocketService.initialize(mockServer);
      
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      webSocketService.handleConnection(mockWs, mockReq);

      const job = {
        walletId: 'wallet1',
        errorMessage: 'Test error occurred',
        currentBlock: 1200
      };

      webSocketService.broadcastError(job);

      const errorMessage = mockWs.sentMessages.find(msg => msg.type === 'error');
      expect(errorMessage).toBeDefined();
      expect(errorMessage.data.errorMessage).toBe('Test error occurred');
      expect(errorMessage.data.currentBlock).toBe(1200);
    });
  });

  describe('Message Ordering', () => {
    test('should maintain message order for sequential updates', () => {
      webSocketService.initialize(mockServer);
      
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      webSocketService.handleConnection(mockWs, mockReq);

      // Send multiple progress updates in sequence
      const blocks = [1100, 1200, 1300, 1400];
      blocks.forEach((block, index) => {
        const job = {
          walletId: 'wallet1',
          currentBlock: block,
          startBlock: 1000,
          endBlock: 2000,
          transactionsFound: index + 1,
          eventsFound: (index + 1) * 2,
          blocksPerSecond: 2.5
        };
        webSocketService.broadcastProgress(job);
      });

      const progressMessages = mockWs.sentMessages
        .filter(msg => msg.type === 'progress')
        .map(msg => msg.data.currentBlock);

      // Verify messages are in order
      expect(progressMessages).toEqual([1100, 1200, 1300, 1400]);
    });

    test('should handle rapid message updates without loss', () => {
      webSocketService.initialize(mockServer);
      
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      webSocketService.handleConnection(mockWs, mockReq);

      // Send many rapid updates
      const updateCount = 20;
      for (let i = 0; i < updateCount; i++) {
        const job = {
          walletId: 'wallet1',
          currentBlock: 1000 + i * 10,
          startBlock: 1000,
          endBlock: 2000,
          transactionsFound: i,
          eventsFound: i * 2,
          blocksPerSecond: 5.0
        };
        webSocketService.broadcastProgress(job);
      }

      const progressMessages = mockWs.sentMessages.filter(msg => msg.type === 'progress');
      expect(progressMessages.length).toBe(updateCount);

      // Verify no messages were lost and they're in order
      const blocks = progressMessages.map(msg => msg.data.currentBlock);
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i]).toBeGreaterThan(blocks[i - 1]);
      }
    });
  });

  describe('Reconnection Logic', () => {
    test('should queue messages for offline clients', () => {
      webSocketService.initialize(mockServer);

      // Send message without any connected clients
      const job = {
        walletId: 'wallet1',
        currentBlock: 1500,
        startBlock: 1000,
        endBlock: 2000,
        transactionsFound: 10,
        eventsFound: 20,
        blocksPerSecond: 3.0
      };

      webSocketService.broadcastProgress(job);

      // Verify message was queued
      expect(webSocketService.messageQueues.has('wallet1')).toBe(true);
      expect(webSocketService.messageQueues.get('wallet1').length).toBe(1);
    });

    test('should deliver queued messages to reconnecting clients', () => {
      webSocketService.initialize(mockServer);

      // Queue some messages first
      const job1 = {
        walletId: 'wallet1',
        currentBlock: 1100,
        startBlock: 1000,
        endBlock: 2000,
        transactionsFound: 5,
        eventsFound: 10,
        blocksPerSecond: 2.0
      };

      const job2 = {
        walletId: 'wallet1',
        currentBlock: 1200,
        startBlock: 1000,
        endBlock: 2000,
        transactionsFound: 8,
        eventsFound: 16,
        blocksPerSecond: 2.5
      };

      webSocketService.broadcastProgress(job1);
      webSocketService.broadcastProgress(job2);

      // Now connect a client
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      webSocketService.handleConnection(mockWs, mockReq);

      // Should have received queued messages
      const progressMessages = mockWs.sentMessages.filter(msg => msg.type === 'progress');
      expect(progressMessages.length).toBeGreaterThanOrEqual(2);

      // Queue should be cleared
      expect(webSocketService.messageQueues.has('wallet1')).toBe(false);
    });

    test('should handle multiple clients for same wallet', () => {
      webSocketService.initialize(mockServer);
      
      const mockWs1 = new MockWebSocket();
      const mockWs2 = new MockWebSocket();
      const mockReq1 = { walletId: 'wallet1', user: { id: 'user1' } };
      const mockReq2 = { walletId: 'wallet1', user: { id: 'user2' } };

      webSocketService.handleConnection(mockWs1, mockReq1);
      webSocketService.handleConnection(mockWs2, mockReq2);

      expect(webSocketService.getConnectionCount('wallet1')).toBe(2);

      // Send a message
      const job = {
        walletId: 'wallet1',
        currentBlock: 1300,
        startBlock: 1000,
        endBlock: 2000,
        transactionsFound: 15,
        eventsFound: 30,
        blocksPerSecond: 4.0
      };

      webSocketService.broadcastProgress(job);

      // Both clients should receive the message
      expect(mockWs1.sentMessages.some(msg => msg.type === 'progress')).toBe(true);
      expect(mockWs2.sentMessages.some(msg => msg.type === 'progress')).toBe(true);
    });
  });

  describe('Integration with Orchestrator', () => {
    test('should respond to orchestrator events', async () => {
      webSocketService.initialize(mockServer);
      
      const mockWs = new MockWebSocket();
      const mockReq = {
        walletId: 'wallet1',
        user: { id: 'user1' }
      };

      webSocketService.handleConnection(mockWs, mockReq);

      // Create a job and emit orchestrator events
      const jobId = await indexingOrchestrator.queueIndexingJob({
        walletId: 'wallet1',
        projectId: 'project1',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1000,
        endBlock: 2000,
        priority: 1
      });

      await indexingOrchestrator.startJob(jobId);
      await indexingOrchestrator.updateJobProgress(jobId, {
        currentBlock: 1500,
        transactionsFound: 10,
        eventsFound: 20,
        blocksPerSecond: 3.0
      });

      // Should have received progress messages
      const progressMessages = mockWs.sentMessages.filter(msg => msg.type === 'progress');
      expect(progressMessages.length).toBeGreaterThan(0);
    });
  });
});