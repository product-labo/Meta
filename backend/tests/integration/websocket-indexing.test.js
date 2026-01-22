/**
 * Integration tests for WebSocket indexing progress
 * Tests real-time progress updates and connection management
 */

import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { indexingOrchestrator } from '../../src/services/indexingOrchestratorService.js';

describe('WebSocket Indexing Integration Tests', () => {
  let server;
  let testUser;
  let testProject;
  let testWallet;
  let authToken;

  beforeAll(async () => {
    // Set up test environment
    testUser = { id: 'test-user-1', email: 'test@example.com' };
    testProject = { id: 'test-project-1', user_id: testUser.id };
    testWallet = { id: 'test-wallet-1', project_id: testProject.id };
    
    // Create JWT token for authentication
    authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'secret');
  });

  afterAll(async () => {
    // Clean up
    if (server) {
      server.close();
    }
  });

  describe('WebSocket Connection', () => {
    test('should establish connection with valid token and walletId', (done) => {
      const ws = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}&walletId=${testWallet.id}`);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    test('should reject connection without token', (done) => {
      const ws = new WebSocket(`ws://localhost:3001/ws/indexing?walletId=${testWallet.id}`);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });

    test('should reject connection without walletId', (done) => {
      const ws = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}`);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });

    test('should reject connection with invalid token', (done) => {
      const ws = new WebSocket(`ws://localhost:3001/ws/indexing?token=invalid&walletId=${testWallet.id}`);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      ws.on('open', () => {
        done(new Error('Connection should have been rejected'));
      });
    });
  });

  describe('Progress Updates', () => {
    test('should receive progress updates when job progresses', (done) => {
      const ws = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}&walletId=${testWallet.id}`);
      let messagesReceived = 0;
      
      ws.on('open', async () => {
        // Create a test job
        const jobId = await indexingOrchestrator.queueIndexingJob({
          walletId: testWallet.id,
          projectId: testProject.id,
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          chain: 'ethereum',
          chainType: 'evm',
          startBlock: 1000,
          endBlock: 2000,
          priority: 1
        });

        // Start the job
        await indexingOrchestrator.startJob(jobId);

        // Simulate progress updates
        setTimeout(async () => {
          await indexingOrchestrator.updateJobProgress(jobId, {
            currentBlock: 1100,
            transactionsFound: 5,
            eventsFound: 10,
            blocksPerSecond: 2.5
          });
        }, 100);

        setTimeout(async () => {
          await indexingOrchestrator.updateJobProgress(jobId, {
            currentBlock: 1200,
            transactionsFound: 12,
            eventsFound: 25,
            blocksPerSecond: 3.0
          });
        }, 200);

        setTimeout(async () => {
          await indexingOrchestrator.completeJob(jobId, {
            transactionsFound: 20,
            eventsFound: 40,
            currentBlock: 2000
          });
        }, 300);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        messagesReceived++;

        if (message.type === 'progress') {
          expect(message.data).toHaveProperty('walletId', testWallet.id);
          expect(message.data).toHaveProperty('currentBlock');
          expect(message.data).toHaveProperty('transactionsFound');
          expect(message.data).toHaveProperty('eventsFound');
          expect(message.data).toHaveProperty('blocksPerSecond');
          expect(message.data).toHaveProperty('percentage');
        } else if (message.type === 'complete') {
          expect(message.data).toHaveProperty('walletId', testWallet.id);
          expect(message.data).toHaveProperty('totalTransactions');
          expect(message.data).toHaveProperty('totalEvents');
          
          // Should have received at least 2 progress updates + 1 completion
          expect(messagesReceived).toBeGreaterThanOrEqual(3);
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    test('should receive error messages when job fails', (done) => {
      const ws = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}&walletId=${testWallet.id}`);
      
      ws.on('open', async () => {
        // Create a test job
        const jobId = await indexingOrchestrator.queueIndexingJob({
          walletId: testWallet.id,
          projectId: testProject.id,
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          chain: 'ethereum',
          chainType: 'evm',
          startBlock: 1000,
          endBlock: 2000,
          priority: 1
        });

        // Start and then fail the job
        await indexingOrchestrator.startJob(jobId);
        
        setTimeout(async () => {
          await indexingOrchestrator.failJob(jobId, 'Test error message');
        }, 100);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.data).toHaveProperty('walletId', testWallet.id);
          expect(message.data).toHaveProperty('errorMessage', 'Test error message');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Message Queuing', () => {
    test('should queue messages for offline clients', async () => {
      // Create a job and emit progress without any connected clients
      const jobId = await indexingOrchestrator.queueIndexingJob({
        walletId: testWallet.id,
        projectId: testProject.id,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        chain: 'ethereum',
        chainType: 'evm',
        startBlock: 1000,
        endBlock: 2000,
        priority: 1
      });

      await indexingOrchestrator.startJob(jobId);
      await indexingOrchestrator.updateJobProgress(jobId, {
        currentBlock: 1100,
        transactionsFound: 5,
        eventsFound: 10,
        blocksPerSecond: 2.5
      });

      // Now connect and should receive queued messages
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}&walletId=${testWallet.id}`);
        let messagesReceived = 0;

        ws.on('open', () => {
          // Should receive queued messages immediately
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          messagesReceived++;

          if (message.type === 'progress' || message.type === 'status') {
            expect(message.data).toHaveProperty('walletId', testWallet.id);
            
            // After receiving messages, close and resolve
            if (messagesReceived >= 1) {
              ws.close();
              resolve();
            }
          }
        });

        ws.on('error', (error) => {
          reject(error);
        });

        // Timeout after 2 seconds
        setTimeout(() => {
          ws.close();
          reject(new Error('Did not receive queued messages in time'));
        }, 2000);
      });
    });
  });

  describe('Connection Management', () => {
    test('should handle multiple connections for same wallet', (done) => {
      const ws1 = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}&walletId=${testWallet.id}`);
      const ws2 = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}&walletId=${testWallet.id}`);
      
      let connectionsOpened = 0;
      let messagesReceived = 0;

      const handleOpen = () => {
        connectionsOpened++;
        if (connectionsOpened === 2) {
          // Both connections open, emit a progress update
          indexingOrchestrator.queueIndexingJob({
            walletId: testWallet.id,
            projectId: testProject.id,
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            chain: 'ethereum',
            chainType: 'evm',
            startBlock: 1000,
            endBlock: 2000,
            priority: 1
          }).then(async (jobId) => {
            await indexingOrchestrator.startJob(jobId);
            await indexingOrchestrator.updateJobProgress(jobId, {
              currentBlock: 1100,
              transactionsFound: 5,
              eventsFound: 10,
              blocksPerSecond: 2.5
            });
          });
        }
      };

      const handleMessage = (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'progress') {
          messagesReceived++;
          
          // Both connections should receive the message
          if (messagesReceived === 2) {
            ws1.close();
            ws2.close();
            done();
          }
        }
      };

      ws1.on('open', handleOpen);
      ws2.on('open', handleOpen);
      ws1.on('message', handleMessage);
      ws2.on('message', handleMessage);

      ws1.on('error', done);
      ws2.on('error', done);
    });

    test('should handle heartbeat/ping-pong', (done) => {
      const ws = new WebSocket(`ws://localhost:3001/ws/indexing?token=${authToken}&walletId=${testWallet.id}`);
      
      ws.on('open', () => {
        // Send ping message
        ws.send(JSON.stringify({ type: 'ping' }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          expect(message).toHaveProperty('timestamp');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });
  });
});