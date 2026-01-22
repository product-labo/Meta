/**
 * Property-based tests for WebSocket message ordering
 * **Feature: multi-chain-wallet-indexing, Property 11: WebSocket message ordering**
 * **Validates: Requirements 3.2, 3.3**
 */

import fc from 'fast-check';
import { EventEmitter } from 'events';
import { IndexerWebSocketService } from '../../src/services/indexerWebSocket.js';

// Mock WebSocket for property testing
class MockWebSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // OPEN
    this.OPEN = 1;
    this.isAlive = true;
    this.sentMessages = [];
  }

  send(data) {
    const message = JSON.parse(data);
    this.sentMessages.push({
      ...message,
      timestamp: Date.now()
    });
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

describe('Property: WebSocket Message Ordering', () => {
  let webSocketService;
  let mockServer;

  beforeEach(() => {
    // Create fresh WebSocket service for each test
    webSocketService = new IndexerWebSocketService();
    mockServer = new EventEmitter();
    
    // Override WebSocketServer creation for testing
    webSocketService.createWebSocketServer = () => new EventEmitter();
    webSocketService.initialize(mockServer);
  });

  afterEach(() => {
    if (webSocketService) {
      webSocketService.shutdown();
    }
  });

  /**
   * Property 11: WebSocket message ordering
   * For any sequence of progress updates sent via WebSocket, messages should arrive 
   * in chronological order based on current_block values
   */
  test('Property 11: WebSocket message ordering - messages arrive in chronological order', () => {
    return fc.assert(
      fc.property(
        // Generate a sequence of increasing block numbers
        fc.array(fc.integer({ min: 1000, max: 10000 }), { minLength: 3, maxLength: 10 })
          .map(blocks => [...new Set(blocks)].sort((a, b) => a - b)), // Remove duplicates and ensure ascending order
        fc.integer({ min: 1, max: 100 }), // transactions found
        fc.integer({ min: 1, max: 200 }), // events found
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0) }), // blocks per second
        
        (blockSequence, transactionsFound, eventsFound, blocksPerSecond) => {
          // Precondition: block sequence should be ascending and unique
          fc.pre(blockSequence.length >= 3);
          fc.pre(blockSequence.every((block, i) => i === 0 || block > blockSequence[i - 1]));

          // Create mock WebSocket connection
          const mockWs = new MockWebSocket();
          const mockReq = {
            walletId: 'test-wallet-1',
            user: { id: 'test-user-1' }
          };

          // Connect the mock WebSocket
          webSocketService.handleConnection(mockWs, mockReq);

          // Send progress updates in sequence
          blockSequence.forEach((block, index) => {
            const job = {
              walletId: 'test-wallet-1',
              currentBlock: block,
              startBlock: blockSequence[0],
              endBlock: blockSequence[blockSequence.length - 1],
              transactionsFound: transactionsFound + index,
              eventsFound: eventsFound + index,
              blocksPerSecond: blocksPerSecond
            };
            webSocketService.broadcastProgress(job);
          });

          // Verify message ordering
          const progressMessages = mockWs.sentMessages
            .filter(msg => msg.type === 'progress')
            .map(msg => msg.data.currentBlock);

          // Property: Messages should be in chronological order (ascending block numbers)
          for (let i = 1; i < progressMessages.length; i++) {
            if (progressMessages[i] < progressMessages[i - 1]) {
              throw new Error(`Message ordering violation: block ${progressMessages[i]} came after block ${progressMessages[i - 1]}`);
            }
          }

          // Property: Should have received all expected progress messages
          if (progressMessages.length !== blockSequence.length) {
            throw new Error(`Expected ${blockSequence.length} messages, received ${progressMessages.length}`);
          }

          // Property: Messages should match the input sequence
          for (let i = 0; i < blockSequence.length; i++) {
            if (progressMessages[i] !== blockSequence[i]) {
              throw new Error(`Message ${i}: expected block ${blockSequence[i]}, got ${progressMessages[i]}`);
            }
          }

          return true;
        }
      ),
      { 
        numRuns: 100, // Run 100 iterations to test different sequences
        timeout: 5000 // 5 second timeout per test
      }
    );
  });

  /**
   * Property: Message timestamps should be monotonically increasing
   * For any sequence of WebSocket messages, timestamps should never decrease
   */
  test('Property: Message timestamps are monotonically increasing', () => {
    return fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1000, max: 5000 }), { minLength: 2, maxLength: 8 })
          .map(blocks => [...new Set(blocks)].sort((a, b) => a - b)),
        
        (blockSequence) => {
          fc.pre(blockSequence.length >= 2);

          const mockWs = new MockWebSocket();
          const mockReq = {
            walletId: 'test-wallet-2',
            user: { id: 'test-user-2' }
          };

          webSocketService.handleConnection(mockWs, mockReq);

          // Send rapid progress updates
          blockSequence.forEach((block, index) => {
            const job = {
              walletId: 'test-wallet-2',
              currentBlock: block,
              startBlock: blockSequence[0],
              endBlock: blockSequence[blockSequence.length - 1],
              transactionsFound: index + 1,
              eventsFound: index + 2,
              blocksPerSecond: 1.0
            };
            webSocketService.broadcastProgress(job);
          });

          // Filter progress messages and extract timestamps
          const progressMessages = mockWs.sentMessages
            .filter(msg => msg.type === 'progress');

          // Property: Timestamps should be monotonically increasing
          for (let i = 1; i < progressMessages.length; i++) {
            if (progressMessages[i].timestamp < progressMessages[i - 1].timestamp) {
              throw new Error(`Timestamp ordering violation: message ${i} timestamp ${progressMessages[i].timestamp} < message ${i-1} timestamp ${progressMessages[i - 1].timestamp}`);
            }
          }

          return true;
        }
      ),
      { 
        numRuns: 50,
        timeout: 3000
      }
    );
  });

  /**
   * Property: No message duplication in ordered sequence
   * For any sequence of progress updates, no two messages should have identical block numbers
   */
  test('Property: No duplicate messages in sequence', () => {
    return fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1000, max: 3000 }), { minLength: 3, maxLength: 8 })
          .map(blocks => [...new Set(blocks)].sort((a, b) => a - b)), // Remove duplicates and sort
        
        (blockSequence) => {
          fc.pre(blockSequence.length >= 3);

          const mockWs = new MockWebSocket();
          const mockReq = {
            walletId: 'test-wallet-3',
            user: { id: 'test-user-3' }
          };

          webSocketService.handleConnection(mockWs, mockReq);

          // Send progress updates
          blockSequence.forEach((block, index) => {
            const job = {
              walletId: 'test-wallet-3',
              currentBlock: block,
              startBlock: blockSequence[0],
              endBlock: blockSequence[blockSequence.length - 1],
              transactionsFound: index + 1,
              eventsFound: index + 2,
              blocksPerSecond: 2.0
            };
            webSocketService.broadcastProgress(job);
          });

          const progressMessages = mockWs.sentMessages
            .filter(msg => msg.type === 'progress')
            .map(msg => msg.data.currentBlock);

          // Property: No duplicate block numbers should be received
          const uniqueBlocks = new Set(progressMessages);
          if (uniqueBlocks.size !== progressMessages.length) {
            throw new Error(`Duplicate messages detected: received ${progressMessages.length} messages but only ${uniqueBlocks.size} unique blocks`);
          }

          // Property: All input blocks should be represented
          if (progressMessages.length !== blockSequence.length) {
            throw new Error(`Expected ${blockSequence.length} messages, received ${progressMessages.length}`);
          }

          return true;
        }
      ),
      { 
        numRuns: 50,
        timeout: 3000
      }
    );
  });
});