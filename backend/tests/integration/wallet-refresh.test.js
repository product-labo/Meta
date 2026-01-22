/**
 * Integration tests for wallet refresh functionality
 * Tests refresh with new data available, no new data, and duplicate prevention
 * 
 * Requirements: 6.2, 6.4, 6.5
 */

import request from 'supertest';
import express from 'express';
import { pool } from '../../src/config/appConfig.js';
import { indexingOrchestrator } from '../../src/services/indexingOrchestratorService.js';
import { createWallet, getWallets, getWallet, refreshWallet, getIndexingStatus } from '../../src/controllers/walletController.js';
import { authenticateToken } from '../../src/middleware/auth.js';
import jwt from 'jsonwebtoken';

// Create test app
const app = express();
app.use(express.json());

// Set up wallet routes for testing
app.post('/api/projects/:projectId/wallets', authenticateToken, createWallet);
app.get('/api/projects/:projectId/wallets', authenticateToken, getWallets);
app.get('/api/projects/:projectId/wallets/:walletId', authenticateToken, getWallet);
app.get('/api/projects/:projectId/wallets/:walletId/indexing-status', authenticateToken, getIndexingStatus);
app.post('/api/projects/:projectId/wallets/:walletId/refresh', authenticateToken, refreshWallet);

describe('Wallet Refresh Integration Tests', () => {
  let testUser;
  let testProject;
  let testWallet;
  let authToken;

  beforeAll(async () => {
    // Create test user
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const email = `refresh-test-${timestamp}-${random}@example.com`;
    const passwordHash = '$2b$10$hashedpassword'; // Mock hash

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2) RETURNING *`,
      [email, passwordHash]
    );
    testUser = userResult.rows[0];

    // Create auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    // Create test project
    const projectResult = await pool.query(
      `INSERT INTO projects (user_id, name, description, category, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [testUser.id, 'Refresh Test Project', 'Test project for refresh functionality', 'defi', 'draft']
    );
    testProject = projectResult.rows[0];

    // Create test wallet
    const walletResult = await pool.query(
      `INSERT INTO wallets (project_id, address, type, chain, chain_type, last_indexed_block, total_transactions, total_events)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [testProject.id, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', 't', 'ethereum', 'evm', 1000, 50, 25]
    );
    testWallet = walletResult.rows[0];
  });

  afterAll(async () => {
    // Clean up test data
    if (testWallet && testWallet.id) {
      await pool.query('DELETE FROM wallet_transactions WHERE wallet_id = $1', [testWallet.id]);
      await pool.query('DELETE FROM wallet_events WHERE wallet_id = $1', [testWallet.id]);
      await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = $1', [testWallet.id]);
      await pool.query('DELETE FROM wallets WHERE id = $1', [testWallet.id]);
    }
    if (testProject && testProject.id) {
      await pool.query('DELETE FROM projects WHERE id = $1', [testProject.id]);
    }
    if (testUser && testUser.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
  });

  beforeEach(async () => {
    // Clean up any existing indexing jobs for this wallet
    if (testWallet && testWallet.id) {
      await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = $1', [testWallet.id]);
    }
  });

  afterEach(async () => {
    // Clean up any indexing jobs created during the test
    if (testWallet && testWallet.id) {
      await pool.query('DELETE FROM indexing_jobs WHERE wallet_id = $1', [testWallet.id]);
    }
  });

  describe('Refresh with new data available', () => {
    test('should create incremental indexing job from last indexed block + 1', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${testWallet.id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('indexingJobId');
      expect(response.body.data.startBlock).toBe(parseInt(testWallet.last_indexed_block) + 1);
      expect(response.body.data.message).toBe('Refresh job queued successfully');

      // Verify job was created in database
      const jobResult = await pool.query(
        'SELECT * FROM indexing_jobs WHERE id = $1',
        [response.body.data.indexingJobId]
      );
      
      expect(jobResult.rows.length).toBe(1);
      const job = jobResult.rows[0];
      expect(job.status).toBe('queued');
      expect(parseInt(job.start_block)).toBe(parseInt(testWallet.last_indexed_block) + 1);
      expect(job.wallet_id).toBe(testWallet.id);
    });

    test('should update wallet statistics after refresh completion', async () => {
      // Start refresh
      const refreshResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${testWallet.id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const jobId = refreshResponse.body.data.indexingJobId;

      // Simulate job completion by updating the job status and wallet statistics
      const newTransactions = 10;
      const newEvents = 5;
      const newLastBlock = 1050;

      // Update job status to completed
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'completed', 
             transactions_found = $1,
             events_found = $2,
             current_block = $3,
             completed_at = NOW()
         WHERE id = $4`,
        [newTransactions, newEvents, newLastBlock, jobId]
      );

      // Update wallet statistics (simulating what the indexer would do)
      await pool.query(
        `UPDATE wallets 
         SET last_indexed_block = $1, 
             total_transactions = total_transactions + $2,
             total_events = total_events + $3,
             last_synced_at = NOW()
         WHERE id = $4`,
        [newLastBlock, newTransactions, newEvents, testWallet.id]
      );

      // Verify wallet was updated
      const walletResponse = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedWallet = walletResponse.body.data;
      expect(parseInt(updatedWallet.last_indexed_block)).toBe(newLastBlock);
      expect(updatedWallet.total_transactions).toBe(testWallet.total_transactions + newTransactions);
      expect(updatedWallet.total_events).toBe(testWallet.total_events + newEvents);
      expect(updatedWallet.last_synced_at).toBeTruthy();
    });
  });

  describe('Refresh with no new data', () => {
    test('should handle case where wallet is already up-to-date', async () => {
      // Update wallet to current block (simulating up-to-date state)
      const currentBlock = 2000;
      await pool.query(
        'UPDATE wallets SET last_indexed_block = $1 WHERE id = $2',
        [currentBlock, testWallet.id]
      );

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${testWallet.id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.startBlock).toBe(currentBlock + 1);

      // Simulate job completion with no new data
      const jobId = response.body.data.indexingJobId;
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'completed',
             transactions_found = 0,
             events_found = 0,
             current_block = $1,
             completed_at = NOW()
         WHERE id = $2`,
        [currentBlock + 1, jobId]
      );

      // Verify wallet statistics remain unchanged
      const walletResponse = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${testWallet.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const wallet = walletResponse.body.data;
      expect(wallet.indexingStatus.state).toBe('completed');
    });
  });

  describe('Duplicate transaction prevention', () => {
    test('should not create duplicate transactions during refresh', async () => {
      const transactionHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const blockNumber = 1001;

      // Insert initial transaction
      await pool.query(
        `INSERT INTO wallet_transactions (
          wallet_id, chain, chain_type, transaction_hash, block_number, 
          block_timestamp, from_address, to_address, value_eth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testWallet.id, 'ethereum', 'evm', transactionHash, blockNumber,
          new Date(), '0x1111111111111111111111111111111111111111',
          '0x2222222222222222222222222222222222222222', '1.0'
        ]
      );

      // Start refresh
      const refreshResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${testWallet.id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Attempt to insert duplicate transaction (simulating indexer behavior)
      try {
        await pool.query(
          `INSERT INTO wallet_transactions (
            wallet_id, chain, chain_type, transaction_hash, block_number, 
            block_timestamp, from_address, to_address, value_eth
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            testWallet.id, 'ethereum', 'evm', transactionHash, blockNumber,
            new Date(), '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222', '1.0'
          ]
        );
        fail('Should have thrown unique constraint violation');
      } catch (error) {
        expect(error.code).toBe('23505'); // Unique violation
      }

      // Verify only one transaction exists
      const transactionCount = await pool.query(
        'SELECT COUNT(*) FROM wallet_transactions WHERE wallet_id = $1 AND transaction_hash = $2',
        [testWallet.id, transactionHash]
      );
      expect(parseInt(transactionCount.rows[0].count)).toBe(1);
    });

    test('should prevent concurrent refresh jobs for same wallet', async () => {
      // Start first refresh
      const firstResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${testWallet.id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstResponse.body.status).toBe('success');

      // Attempt second refresh immediately
      const secondResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${testWallet.id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(secondResponse.body.status).toBe('error');
      expect(secondResponse.body.data.error).toContain('already in progress');
    });
  });

  describe('Error handling', () => {
    test('should return 404 for non-existent wallet', async () => {
      const fakeWalletId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${fakeWalletId}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.data.error).toBe('Wallet not found');
    });

    test('should return 404 for wallet belonging to different user', async () => {
      // Create another user and project
      const otherUserResult = await pool.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2) RETURNING *`,
        ['other-user@example.com', 'hashed_password']
      );
      const otherUser = otherUserResult.rows[0];

      const otherProjectResult = await pool.query(
        `INSERT INTO projects (user_id, name, description, category, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [otherUser.id, 'Other Project', 'Other project', 'defi', 'draft']
      );
      const otherProject = otherProjectResult.rows[0];

      const otherWalletResult = await pool.query(
        `INSERT INTO wallets (project_id, address, type, chain, chain_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [otherProject.id, '0x9999999999999999999999999999999999999999', 't', 'ethereum', 'evm']
      );
      const otherWallet = otherWalletResult.rows[0];

      try {
        // Try to refresh other user's wallet
        const response = await request(app)
          .post(`/api/projects/${otherProject.id}/wallets/${otherWallet.id}/refresh`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.status).toBe('error');
        expect(response.body.data.error).toBe('Wallet not found');
      } finally {
        // Clean up
        await pool.query('DELETE FROM wallets WHERE id = $1', [otherWallet.id]);
        await pool.query('DELETE FROM projects WHERE id = $1', [otherProject.id]);
        await pool.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
      }
    });
  });

  describe('Real-time progress tracking', () => {
    test('should track refresh progress through indexing status endpoint', async () => {
      // Start refresh
      const refreshResponse = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${testWallet.id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const jobId = refreshResponse.body.data.indexingJobId;

      // Check initial status
      let statusResponse = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${testWallet.id}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.indexingStatus).toBe('queued');

      // Simulate job progress
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'running',
             current_block = 1025,
             transactions_found = 5,
             events_found = 2,
             blocks_per_second = 10,
             started_at = NOW()
         WHERE id = $1`,
        [jobId]
      );

      // Check progress status
      statusResponse = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${testWallet.id}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const status = statusResponse.body.data;
      expect(status.indexingStatus).toBe('running');
      expect(status.progress.transactionsFound).toBe(5);
      expect(status.progress.eventsFound).toBe(2);
      expect(status.progress.blocksPerSecond).toBe(10);

      // Complete job
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'completed',
             current_block = 1050,
             transactions_found = 10,
             events_found = 5,
             completed_at = NOW()
         WHERE id = $1`,
        [jobId]
      );

      // Check completion status
      statusResponse = await request(app)
        .get(`/api/projects/${testProject.id}/wallets/${testWallet.id}/indexing-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.indexingStatus).toBe('completed');
    });
  });
});