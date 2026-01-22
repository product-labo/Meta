/**
 * Unit tests for wallet API endpoints
 * Tests wallet creation, listing, retrieval, and validation
 * Requirements: 1.1, 1.4, 5.3
 */

import request from 'supertest';
import express from 'express';
import { pool } from '../../src/config/appConfig.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import the wallet controller functions directly
import { createWallet, getWallets, getWallet, refreshWallet, getIndexingStatus } from '../../src/controllers/walletController.js';
import { authenticateToken } from '../../src/middleware/auth.js';
// Removed validation middleware imports for simplified testing

// Create test app
const app = express();
app.use(express.json());

// Set up wallet routes for testing (simplified for testing)
app.post('/api/projects/:projectId/wallets', authenticateToken, createWallet);
app.get('/api/projects/:projectId/wallets', authenticateToken, getWallets);
app.get('/api/projects/:projectId/wallets/:walletId', authenticateToken, getWallet);
app.get('/api/projects/:projectId/wallets/:walletId/indexing-status', authenticateToken, getIndexingStatus);
app.post('/api/projects/:projectId/wallets/:walletId/refresh', authenticateToken, refreshWallet);

describe('Wallet API Endpoints', () => {
  let testUser;
  let testProject;
  let authToken;
  const testUserIds = [];
  const testProjectIds = [];
  const testWalletIds = [];

  beforeAll(async () => {
    // Create test user
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const email = `test-wallet-api-${timestamp}-${random}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [`Test User ${random}`, email, passwordHash]
    );

    testUser = userResult.rows[0];
    testUserIds.push(testUser.id);

    // Create auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    // Create test project
    const projectResult = await pool.query(
      `INSERT INTO projects (user_id, name, category, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, user_id`,
      [testUser.id, `Test Project ${random}`, 'defi', 'draft']
    );

    testProject = projectResult.rows[0];
    testProjectIds.push(testProject.id);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (testWalletIds.length > 0) {
        await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = ANY($1)', [testWalletIds]);
        await pool.query('DELETE FROM wallets WHERE id = ANY($1)', [testWalletIds]);
      }
      if (testProjectIds.length > 0) {
        await pool.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
      }
      if (testUserIds.length > 0) {
        await pool.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/projects/:projectId/wallets', () => {
    test('should create wallet with valid EVM address', async () => {
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        description: 'Test EVM wallet'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.address).toBe(walletData.address);
      expect(response.body.data.chain).toBe(walletData.chain);
      expect(response.body.data.chain_type).toBe('evm');
      expect(response.body.data.description).toBe(walletData.description);
      expect(response.body.data.indexingJobId).toBeDefined();
      expect(response.body.data.indexingStatus).toBe('queued');

      testWalletIds.push(response.body.data.id);
    });

    test('should create wallet with valid Starknet address', async () => {
      const walletData = {
        address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        chain: 'starknet-mainnet',
        description: 'Test Starknet wallet'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.address).toBe(walletData.address);
      expect(response.body.data.chain).toBe(walletData.chain);
      expect(response.body.data.chain_type).toBe('starknet');
      expect(response.body.data.description).toBe(walletData.description);

      testWalletIds.push(response.body.data.id);
    });

    test('should reject wallet creation with invalid address', async () => {
      const walletData = {
        address: '0xinvalid',
        chain: 'ethereum',
        description: 'Invalid wallet'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toContain('Ethereum address must be 42 characters long');
    });

    test('should reject wallet creation without address', async () => {
      const walletData = {
        chain: 'ethereum',
        description: 'No address wallet'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Address is required');
    });

    test('should reject wallet creation without chain', async () => {
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        description: 'No chain wallet'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Chain is required');
    });

    test('should prevent duplicate wallet creation', async () => {
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        description: 'Duplicate wallet'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Wallet already exists for this project and chain');
    });

    test('should reject unauthorized wallet creation', async () => {
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        chain: 'ethereum',
        description: 'Unauthorized wallet'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .send(walletData)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    test('should reject wallet creation for non-existent project', async () => {
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        chain: 'ethereum',
        description: 'Non-existent project wallet'
      };

      const fakeProjectId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/projects/${fakeProjectId}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Project not found or unauthorized');
    });
  });

  describe('GET /api/projects/:projectId/wallets', () => {
    test('should list all wallets for project', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // We created 2 wallets

      // Check wallet structure
      const wallet = response.body.data[0];
      expect(wallet).toHaveProperty('id');
      expect(wallet).toHaveProperty('address');
      expect(wallet).toHaveProperty('chain');
      expect(wallet).toHaveProperty('chain_type');
      expect(wallet).toHaveProperty('indexingStatus');
      expect(wallet.indexingStatus).toHaveProperty('state');
    });

    test('should reject unauthorized wallet listing', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets`)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    test('should reject wallet listing for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/projects/${fakeProjectId}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Project not found or unauthorized');
    });
  });

  describe('GET /api/projects/:projectId/wallets/:walletId', () => {
    test('should retrieve specific wallet', async () => {
      const walletId = testWalletIds[0];

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(walletId);
      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('chain');
      expect(response.body.data).toHaveProperty('indexingStatus');
    });

    test('should reject unauthorized wallet retrieval', async () => {
      const walletId = testWalletIds[0];

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}`)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    test('should return 404 for non-existent wallet', async () => {
      const fakeWalletId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${fakeWalletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Wallet not found');
    });
  });

  describe('GET /api/projects/:projectId/wallets/:walletId/indexing-status', () => {
    test('should retrieve wallet indexing status for active job', async () => {
      // Ensure we have a wallet to work with
      let walletId = testWalletIds[0];
      if (!walletId) {
        const walletData = {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
          chain: 'ethereum',
          description: 'Test active job wallet'
        };

        const createResponse = await request(app)
          .post(`/api/projects/${testProject.id}/wallets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(walletData);

        walletId = createResponse.body.data.id;
        testWalletIds.push(walletId);
      }

      // Clear any existing jobs first
      await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = $1', [walletId]);

      // Create an active indexing job
      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found, blocks_per_second, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [walletId, testProject.id, 'running', 1000, 2000, 1500, 25, 10, 5.5]
      );

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.walletId).toBe(walletId);
      expect(response.body.data.indexingStatus).toBe('running');
      expect(response.body.data.progress).toHaveProperty('percentage');
      expect(response.body.data.progress.percentage).toBe(50); // (1500-1000)/(2000-1000) * 100 = 50%
      expect(parseInt(response.body.data.progress.currentBlock)).toBe(1500);
      expect(response.body.data.progress.totalBlocks).toBe(1000); // 2000-1000
      expect(parseInt(response.body.data.progress.transactionsFound)).toBe(25);
      expect(parseInt(response.body.data.progress.eventsFound)).toBe(10);
      expect(response.body.data.progress.blocksPerSecond).toBe(5.5);
      expect(response.body.data.progress.estimatedTimeRemaining).toBeGreaterThan(0);
      expect(response.body.data.jobStartedAt).toBeDefined();
    });

    test('should retrieve wallet indexing status for completed job', async () => {
      // Ensure we have a second wallet to work with
      let walletId = testWalletIds[1];
      if (!walletId) {
        const walletData = {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
          chain: 'ethereum',
          description: 'Test completed job wallet'
        };

        const createResponse = await request(app)
          .post(`/api/projects/${testProject.id}/wallets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(walletData);

        walletId = createResponse.body.data.id;
        testWalletIds.push(walletId);
      }

      // Clear any existing jobs first
      await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = $1', [walletId]);

      // Create a completed indexing job
      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found, blocks_per_second, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '1 hour', NOW())`,
        [walletId, testProject.id, 'completed', 5000, 6000, 6000, 100, 50, 10.0]
      );

      // Update wallet with final stats
      await pool.query(
        `UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW(), total_transactions = $2, total_events = $3 WHERE id = $4`,
        [6000, 100, 50, walletId]
      );

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.walletId).toBe(walletId);
      expect(response.body.data.indexingStatus).toBe('completed');
      expect(response.body.data.progress.percentage).toBe(100);
      expect(parseInt(response.body.data.progress.currentBlock)).toBe(6000);
      expect(parseInt(response.body.data.progress.transactionsFound)).toBe(100);
      expect(parseInt(response.body.data.progress.eventsFound)).toBe(50);
      expect(parseInt(response.body.data.lastIndexedBlock)).toBe(6000);
      expect(parseInt(response.body.data.totalTransactions)).toBe(100);
      expect(parseInt(response.body.data.totalEvents)).toBe(50);
      expect(response.body.data.jobStartedAt).toBeDefined();
      expect(response.body.data.jobCompletedAt).toBeDefined();
    });

    test('should retrieve wallet indexing status for failed job', async () => {
      // Create a new wallet for this test
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
        chain: 'ethereum',
        description: 'Test failed job wallet'
      };

      const createResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData);

      const walletId = createResponse.body.data.id;
      testWalletIds.push(walletId);

      // Create a failed indexing job
      const errorMessage = 'RPC endpoint failed after all retries';
      const insertResult = await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found, error_message, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '30 minutes')
         RETURNING *`,
        [walletId, testProject.id, 'failed', 10000, 11000, 10500, 15, 5, errorMessage]
      );
      


      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);



      expect(response.body.status).toBe('success');
      expect(response.body.data.walletId).toBe(walletId);
      expect(response.body.data.indexingStatus).toBe('failed');
      expect(response.body.data.progress.percentage).toBe(50); // (10500-10000)/(11000-10000) * 100 = 50%
      expect(parseInt(response.body.data.progress.currentBlock)).toBe(10500);
      expect(parseInt(response.body.data.progress.transactionsFound)).toBe(15);
      expect(parseInt(response.body.data.progress.eventsFound)).toBe(5);
      expect(response.body.data.errorMessage).toBe(errorMessage);
      expect(response.body.data.jobStartedAt).toBeDefined();
      expect(response.body.data.jobCompletedAt).toBeNull();
    });

    test('should calculate progress correctly for various scenarios', async () => {
      // Create a new wallet for progress calculation tests
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3',
        chain: 'ethereum',
        description: 'Test progress calculation wallet'
      };

      const createResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData);

      const walletId = createResponse.body.data.id;
      testWalletIds.push(walletId);

      // Test case 1: 0% progress (just started)
      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [walletId, testProject.id, 'running', 20000, 21000, 20000, 0, 0]
      );

      let response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.percentage).toBe(0);

      // Test case 2: 25% progress
      await pool.query(
        `UPDATE indexing_jobs SET current_block = $1, transactions_found = $2 WHERE wallet_id = $3`,
        [20250, 10, walletId]
      );

      response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.percentage).toBe(25);

      // Test case 3: 75% progress
      await pool.query(
        `UPDATE indexing_jobs SET current_block = $1, transactions_found = $2 WHERE wallet_id = $3`,
        [20750, 30, walletId]
      );

      response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.percentage).toBe(75);

      // Test case 4: 100% progress (completed)
      await pool.query(
        `UPDATE indexing_jobs SET current_block = $1, transactions_found = $2, status = $3, completed_at = NOW() WHERE wallet_id = $4`,
        [21000, 40, 'completed', walletId]
      );

      response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.percentage).toBe(100);
      expect(response.body.data.indexingStatus).toBe('completed');
    });

    test('should handle wallet with no indexing jobs (ready state)', async () => {
      // Create a new wallet for this test
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        chain: 'ethereum',
        description: 'Test ready state wallet'
      };

      const createResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData);

      const walletId = createResponse.body.data.id;
      testWalletIds.push(walletId);

      // Delete any auto-created indexing jobs
      await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = $1', [walletId]);

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.walletId).toBe(walletId);
      expect(response.body.data.indexingStatus).toBe('ready');
      expect(response.body.data.progress.percentage).toBe(0);
      expect(response.body.data.progress.currentBlock).toBe(0);
      expect(response.body.data.progress.transactionsFound).toBe(0);
      expect(response.body.data.progress.eventsFound).toBe(0);
      expect(parseInt(response.body.data.lastIndexedBlock)).toBe(0);
      expect(response.body.data.errorMessage).toBeNull();
    });

    test('should reject unauthorized indexing status retrieval', async () => {
      const walletId = testWalletIds[0];

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    test('should return 404 for non-existent wallet indexing status', async () => {
      const fakeWalletId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${fakeWalletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Wallet not found');
    });

    test('should calculate ETA correctly when blocks per second is available', async () => {
      // Create a new wallet for ETA calculation test
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
        chain: 'ethereum',
        description: 'Test ETA calculation wallet'
      };

      const createResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData);

      const walletId = createResponse.body.data.id;
      testWalletIds.push(walletId);

      // Create job with known processing speed
      const blocksPerSecond = 2.0; // 2 blocks per second
      const startBlock = 30000;
      const endBlock = 31000; // 1000 blocks total
      const currentBlock = 30500; // 500 blocks processed, 500 remaining

      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found, blocks_per_second, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [walletId, testProject.id, 'running', startBlock, endBlock, currentBlock, 50, 25, blocksPerSecond]
      );

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.blocksPerSecond).toBe(blocksPerSecond);
      
      // ETA should be (remaining blocks) / (blocks per second) = 500 / 2 = 250 seconds
      const expectedETA = Math.ceil((endBlock - currentBlock) / blocksPerSecond);
      expect(response.body.data.progress.estimatedTimeRemaining).toBe(expectedETA);
    });

    test('should handle zero blocks per second gracefully', async () => {
      // Create a new wallet for zero BPS test
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
        chain: 'ethereum',
        description: 'Test zero BPS wallet'
      };

      const createResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData);

      const walletId = createResponse.body.data.id;
      testWalletIds.push(walletId);

      // Create job with zero blocks per second (just started)
      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found, blocks_per_second, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [walletId, testProject.id, 'running', 40000, 41000, 40000, 0, 0, 0]
      );

      const response = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.blocksPerSecond).toBe(0);
      expect(response.body.data.progress.estimatedTimeRemaining).toBe(0); // Should be 0 when BPS is 0
    });
  });

  describe('POST /api/projects/:projectId/wallets/:walletId/refresh', () => {
    test('should create refresh job for wallet', async () => {
      // Create a test wallet if none exists
      let walletId = testWalletIds[0];
      if (!walletId) {
        const walletData = {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
          chain: 'ethereum',
          description: 'Test refresh wallet'
        };

        const createResponse = await request(app)
          .post(`/api/projects/${testProject.id}/wallets`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(walletData);

        walletId = createResponse.body.data.id;
        testWalletIds.push(walletId);
      }

      // Clear any existing jobs for this wallet first
      await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = $1', [walletId]);

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${walletId}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('indexingJobId');
      expect(response.body.data).toHaveProperty('startBlock');
      expect(response.body.data).toHaveProperty('currentBlock');
      expect(response.body.data.message).toBe('Refresh job queued successfully');
    });

    test('should prevent concurrent refresh jobs', async () => {
      const walletId = testWalletIds[0];

      // Try to create another refresh job immediately
      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${walletId}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Indexing job already in progress for this wallet');
    });
  });
});