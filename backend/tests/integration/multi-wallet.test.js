/**
 * Integration tests for multi-wallet support
 * Feature: multi-chain-wallet-indexing
 * 
 * Tests adding 3+ wallets to project, data isolation, and independent indexing
 * Requirements: 5.4, 10.3
 */

import request from 'supertest';
import express from 'express';
import { pool } from '../../src/config/appConfig.js';
import { createWallet, getWallets, getWallet, refreshWallet, getIndexingStatus } from '../../src/controllers/walletController.js';
import { authenticateToken } from '../../src/middleware/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Create test app
const app = express();
app.use(express.json());

// Simple auth middleware for testing
const testAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', data: { error: 'No token provided' } });
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', data: { error: 'Invalid token' } });
  }
};

// Set up wallet routes for testing
app.post('/api/projects/:projectId/wallets', testAuthMiddleware, createWallet);
app.get('/api/projects/:projectId/wallets', testAuthMiddleware, getWallets);
app.get('/api/projects/:projectId/wallets/:walletId', testAuthMiddleware, getWallet);
app.post('/api/projects/:projectId/wallets/:walletId/refresh', testAuthMiddleware, refreshWallet);
app.get('/api/projects/:projectId/wallets/:walletId/indexing-status', testAuthMiddleware, getIndexingStatus);

// Set up auth routes for testing
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', data: { error: 'Invalid credentials' } });
    }
    
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ status: 'error', data: { error: 'Invalid credentials' } });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', data: { error: 'Internal server error' } });
  }
});

describe('Multi-Wallet Integration Tests', () => {
  // Track test data for cleanup
  const testUserIds = [];
  const testProjectIds = [];
  const testWalletIds = [];
  const testTransactionIds = [];
  let authToken = null;
  let testUser = null;
  let testProject = null;

  beforeAll(async () => {
    // Test database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    try {
      if (testTransactionIds.length > 0) {
        await pool.query('DELETE FROM wallet_transactions WHERE id = ANY($1)', [testTransactionIds]);
      }
      if (testWalletIds.length > 0) {
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

  beforeEach(async () => {
    // Create a test user and project for each test
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const email = `test-multi-wallet-${timestamp}-${random}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [`Test User ${random}`, email, passwordHash]
    );

    testUser = userResult.rows[0];
    testUserIds.push(testUser.id);

    // Create test project
    const projectResult = await pool.query(
      `INSERT INTO projects (user_id, name, category, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, user_id`,
      [testUser.id, `Test Project ${random}`, 'defi', 'draft']
    );

    testProject = projectResult.rows[0];
    testProjectIds.push(testProject.id);

    // Get auth token by logging in
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: email,
        password: password
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.status).toBe('success');
    authToken = loginResponse.body.data.token;
  });

  // Helper function to create a wallet via API
  async function createWalletViaAPI(address, chain, description = null) {
    const response = await request(app)
      .post(`/api/projects/${testProject.id}/wallets`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        address: address,
        chain: chain,
        description: description
      });

    if (response.status === 201) {
      testWalletIds.push(response.body.data.id);
    }

    return response;
  }

  // Helper function to get wallets via API
  async function getWalletsViaAPI() {
    return await request(app)
      .get(`/api/projects/${testProject.id}/wallets`)
      .set('Authorization', `Bearer ${authToken}`);
  }

  // Helper function to add transactions to a wallet
  async function addTransactionsToWallet(walletId, chain, count = 5) {
    const transactionIds = [];
    const chainType = chain.includes('starknet') ? 'starknet' : 'evm';
    
    for (let i = 0; i < count; i++) {
      const txHash = '0x' + Math.random().toString(16).substring(2, 66).padEnd(64, '0');
      const blockNumber = 1000 + i;
      const timestamp = new Date(Date.now() + i * 1000);
      const fromAddress = '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0');
      const toAddress = '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0');
      
      const result = await pool.query(
        `INSERT INTO wallet_transactions (
          wallet_id, chain, chain_type, transaction_hash, block_number, 
          block_timestamp, from_address, to_address, value_eth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [walletId, chain, chainType, txHash, blockNumber, timestamp, fromAddress, toAddress, (i + 1).toString()]
      );
      
      transactionIds.push(result.rows[0].id);
      testTransactionIds.push(result.rows[0].id);
    }
    
    // Update wallet transaction count
    await pool.query(
      'UPDATE wallets SET total_transactions = $1, last_synced_at = NOW() WHERE id = $2',
      [count, walletId]
    );
    
    return transactionIds;
  }

  describe('Adding Multiple Wallets to Project', () => {
    test('should successfully add 3+ wallets to a single project', async () => {
      // Test adding 4 different wallets with different chains
      const wallets = [
        { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', chain: 'ethereum', description: 'Main ETH wallet' },
        { address: '0x1234567890123456789012345678901234567890', chain: 'polygon', description: 'Polygon wallet' },
        { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', chain: 'lisk', description: 'Lisk wallet' },
        { address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', chain: 'starknet-mainnet', description: 'Starknet wallet' }
      ];

      const createdWallets = [];

      // Add each wallet
      for (const walletData of wallets) {
        const response = await createWalletViaAPI(walletData.address, walletData.chain, walletData.description);
        
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.address).toBe(walletData.address);
        expect(response.body.data.chain).toBe(walletData.chain);
        expect(response.body.data.description).toBe(walletData.description);
        expect(response.body.data.indexingJobId).toBeDefined();
        expect(response.body.data.indexingStatus).toBe('queued');
        
        createdWallets.push(response.body.data);
      }

      // Verify all wallets were created
      expect(createdWallets).toHaveLength(4);

      // Get all wallets for the project
      const walletsResponse = await getWalletsViaAPI();
      expect(walletsResponse.status).toBe(200);
      expect(walletsResponse.body.status).toBe('success');
      expect(walletsResponse.body.data).toHaveLength(4);

      // Verify each wallet has correct properties
      const retrievedWallets = walletsResponse.body.data;
      for (let i = 0; i < wallets.length; i++) {
        const originalWallet = wallets[i];
        const retrievedWallet = retrievedWallets.find(w => w.address === originalWallet.address);
        
        expect(retrievedWallet).toBeDefined();
        expect(retrievedWallet.chain).toBe(originalWallet.chain);
        expect(retrievedWallet.description).toBe(originalWallet.description);
        expect(retrievedWallet.is_active).toBe(true);
        expect(retrievedWallet.indexingStatus).toBeDefined();
        expect(retrievedWallet.indexingStatus.state).toBeDefined();
      }

      // Verify wallets have different chain types
      const evmWallets = retrievedWallets.filter(w => w.chain_type === 'evm');
      const starknetWallets = retrievedWallets.filter(w => w.chain_type === 'starknet');
      
      expect(evmWallets).toHaveLength(3); // ethereum, polygon, lisk
      expect(starknetWallets).toHaveLength(1); // starknet-mainnet
    });

    test('should prevent duplicate wallets on same chain', async () => {
      const walletData = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        chain: 'ethereum',
        description: 'Test wallet'
      };

      // Add wallet first time - should succeed
      const firstResponse = await createWalletViaAPI(walletData.address, walletData.chain, walletData.description);
      expect(firstResponse.status).toBe(201);

      // Try to add same wallet again - should fail
      const secondResponse = await createWalletViaAPI(walletData.address, walletData.chain, walletData.description);
      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.status).toBe('error');
      expect(secondResponse.body.data.error).toContain('already exists');
    });

    test('should allow same address on different chains', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      
      // Add same address on different EVM chains
      const ethResponse = await createWalletViaAPI(address, 'ethereum', 'ETH wallet');
      expect(ethResponse.status).toBe(201);

      const polyResponse = await createWalletViaAPI(address, 'polygon', 'Polygon wallet');
      expect(polyResponse.status).toBe(201);

      const liskResponse = await createWalletViaAPI(address, 'lisk', 'Lisk wallet');
      expect(liskResponse.status).toBe(201);

      // Verify all three wallets exist
      const walletsResponse = await getWalletsViaAPI();
      expect(walletsResponse.status).toBe(200);
      expect(walletsResponse.body.data).toHaveLength(3);

      // All should have same address but different chains
      const wallets = walletsResponse.body.data;
      wallets.forEach(wallet => {
        expect(wallet.address).toBe(address);
      });

      const chains = wallets.map(w => w.chain).sort();
      expect(chains).toEqual(['ethereum', 'lisk', 'polygon']);
    });
  });

  describe('Data Isolation Between Wallets', () => {
    test('should maintain complete data isolation between wallets', async () => {
      // Create 3 wallets
      const wallet1Response = await createWalletViaAPI('0x1111111111111111111111111111111111111111', 'ethereum', 'Wallet 1');
      const wallet2Response = await createWalletViaAPI('0x2222222222222222222222222222222222222222', 'polygon', 'Wallet 2');
      const wallet3Response = await createWalletViaAPI('0x3333333333333333333333333333333333333333', 'lisk', 'Wallet 3');

      expect(wallet1Response.status).toBe(201);
      expect(wallet2Response.status).toBe(201);
      expect(wallet3Response.status).toBe(201);

      const wallet1Id = wallet1Response.body.data.id;
      const wallet2Id = wallet2Response.body.data.id;
      const wallet3Id = wallet3Response.body.data.id;

      // Add different numbers of transactions to each wallet
      const wallet1TxIds = await addTransactionsToWallet(wallet1Id, 'ethereum', 3);
      const wallet2TxIds = await addTransactionsToWallet(wallet2Id, 'polygon', 5);
      const wallet3TxIds = await addTransactionsToWallet(wallet3Id, 'lisk', 2);

      // Verify transaction counts
      expect(wallet1TxIds).toHaveLength(3);
      expect(wallet2TxIds).toHaveLength(5);
      expect(wallet3TxIds).toHaveLength(2);

      // Verify data isolation - each wallet should only see its own transactions
      const wallet1Txs = await pool.query(
        'SELECT id, chain, value_eth FROM wallet_transactions WHERE wallet_id = $1 ORDER BY block_number',
        [wallet1Id]
      );
      const wallet2Txs = await pool.query(
        'SELECT id, chain, value_eth FROM wallet_transactions WHERE wallet_id = $1 ORDER BY block_number',
        [wallet2Id]
      );
      const wallet3Txs = await pool.query(
        'SELECT id, chain, value_eth FROM wallet_transactions WHERE wallet_id = $1 ORDER BY block_number',
        [wallet3Id]
      );

      // Verify transaction counts match
      expect(wallet1Txs.rows).toHaveLength(3);
      expect(wallet2Txs.rows).toHaveLength(5);
      expect(wallet3Txs.rows).toHaveLength(2);

      // Verify chain isolation
      wallet1Txs.rows.forEach(tx => expect(tx.chain).toBe('ethereum'));
      wallet2Txs.rows.forEach(tx => expect(tx.chain).toBe('polygon'));
      wallet3Txs.rows.forEach(tx => expect(tx.chain).toBe('lisk'));

      // Verify value isolation (each wallet has different value pattern)
      expect(parseFloat(wallet1Txs.rows[0].value_eth)).toBe(1.0);
      expect(parseFloat(wallet1Txs.rows[1].value_eth)).toBe(2.0);
      expect(parseFloat(wallet1Txs.rows[2].value_eth)).toBe(3.0);

      expect(parseFloat(wallet2Txs.rows[0].value_eth)).toBe(1.0);
      expect(parseFloat(wallet2Txs.rows[4].value_eth)).toBe(5.0);

      expect(parseFloat(wallet3Txs.rows[0].value_eth)).toBe(1.0);
      expect(parseFloat(wallet3Txs.rows[1].value_eth)).toBe(2.0);

      // Verify no cross-contamination
      const crossCheck1 = await pool.query(
        'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1 AND id = ANY($2)',
        [wallet1Id, [...wallet2TxIds, ...wallet3TxIds]]
      );
      expect(parseInt(crossCheck1.rows[0].count)).toBe(0);

      const crossCheck2 = await pool.query(
        'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1 AND id = ANY($2)',
        [wallet2Id, [...wallet1TxIds, ...wallet3TxIds]]
      );
      expect(parseInt(crossCheck2.rows[0].count)).toBe(0);

      const crossCheck3 = await pool.query(
        'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1 AND id = ANY($2)',
        [wallet3Id, [...wallet1TxIds, ...wallet2TxIds]]
      );
      expect(parseInt(crossCheck3.rows[0].count)).toBe(0);
    });

    test('should isolate wallet data between different projects', async () => {
      // Create a second user and project
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const email2 = `test-multi-wallet-2-${timestamp}-${random}@example.com`;
      const password2 = 'TestPassword123!';
      const passwordHash2 = await bcrypt.hash(password2, 10);

      const user2Result = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email`,
        [`Test User 2 ${random}`, email2, passwordHash2]
      );

      const testUser2 = user2Result.rows[0];
      testUserIds.push(testUser2.id);

      const project2Result = await pool.query(
        `INSERT INTO projects (user_id, name, category, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, user_id`,
        [testUser2.id, `Test Project 2 ${random}`, 'defi', 'draft']
      );

      const testProject2 = project2Result.rows[0];
      testProjectIds.push(testProject2.id);

      // Get auth token for second user
      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: email2,
          password: password2
        });

      expect(loginResponse2.status).toBe(200);
      const authToken2 = loginResponse2.body.data.token;

      // Add wallet to first project
      const wallet1Response = await createWalletViaAPI('0x1111111111111111111111111111111111111111', 'ethereum', 'Project 1 Wallet');
      expect(wallet1Response.status).toBe(201);
      const wallet1Id = wallet1Response.body.data.id;

      // Add wallet to second project (same address, different project)
      const wallet2Response = await request(app)
        .post(`/api/projects/${testProject2.id}/wallets`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          address: '0x1111111111111111111111111111111111111111',
          chain: 'ethereum',
          description: 'Project 2 Wallet'
        });

      expect(wallet2Response.status).toBe(201);
      const wallet2Id = wallet2Response.body.data.id;
      testWalletIds.push(wallet2Id);

      // Add transactions to both wallets
      await addTransactionsToWallet(wallet1Id, 'ethereum', 3);
      await addTransactionsToWallet(wallet2Id, 'ethereum', 5);

      // User 1 should only see their wallet
      const user1WalletsResponse = await getWalletsViaAPI();
      expect(user1WalletsResponse.status).toBe(200);
      expect(user1WalletsResponse.body.data).toHaveLength(1);
      expect(user1WalletsResponse.body.data[0].id).toBe(wallet1Id);

      // User 2 should only see their wallet
      const user2WalletsResponse = await request(app)
        .get(`/api/projects/${testProject2.id}/wallets`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(user2WalletsResponse.status).toBe(200);
      expect(user2WalletsResponse.body.data).toHaveLength(1);
      expect(user2WalletsResponse.body.data[0].id).toBe(wallet2Id);

      // Verify transaction isolation
      const project1Txs = await pool.query(
        `SELECT COUNT(*) as count FROM wallet_transactions wt
         JOIN wallets w ON wt.wallet_id = w.id
         WHERE w.project_id = $1`,
        [testProject.id]
      );

      const project2Txs = await pool.query(
        `SELECT COUNT(*) as count FROM wallet_transactions wt
         JOIN wallets w ON wt.wallet_id = w.id
         WHERE w.project_id = $1`,
        [testProject2.id]
      );

      expect(parseInt(project1Txs.rows[0].count)).toBe(3);
      expect(parseInt(project2Txs.rows[0].count)).toBe(5);

      // User 1 should not be able to access user 2's wallet
      const unauthorizedResponse = await request(app)
        .get(`/api/projects/${testProject2.id}/wallets/${wallet2Id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(unauthorizedResponse.status).toBe(404);
    });
  });

  describe('Independent Indexing Status', () => {
    test('should track indexing status independently for each wallet', async () => {
      // Create 3 wallets
      const wallet1Response = await createWalletViaAPI('0x1111111111111111111111111111111111111111', 'ethereum', 'Wallet 1');
      const wallet2Response = await createWalletViaAPI('0x2222222222222222222222222222222222222222', 'polygon', 'Wallet 2');
      const wallet3Response = await createWalletViaAPI('0x3333333333333333333333333333333333333333', 'lisk', 'Wallet 3');

      const wallet1Id = wallet1Response.body.data.id;
      const wallet2Id = wallet2Response.body.data.id;
      const wallet3Id = wallet3Response.body.data.id;

      // Simulate different indexing states by creating indexing jobs
      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [wallet1Id, testProject.id, 'completed', 0, 1000, 1000, 50, 25]
      );

      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [wallet2Id, testProject.id, 'running', 0, 2000, 1200, 75, 40]
      );

      await pool.query(
        `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block, transactions_found, events_found)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [wallet3Id, testProject.id, 'failed', 0, 1500, 800, 30, 15]
      );

      // Update wallet sync status
      await pool.query(
        'UPDATE wallets SET last_indexed_block = $1, total_transactions = $2, total_events = $3, last_synced_at = NOW() WHERE id = $4',
        [1000, 50, 25, wallet1Id]
      );

      await pool.query(
        'UPDATE wallets SET last_indexed_block = $1, total_transactions = $2, total_events = $3 WHERE id = $4',
        [1200, 75, 40, wallet2Id]
      );

      await pool.query(
        'UPDATE wallets SET last_indexed_block = $1, total_transactions = $2, total_events = $3 WHERE id = $4',
        [800, 30, 15, wallet3Id]
      );

      // Get wallets and verify independent status
      const walletsResponse = await getWalletsViaAPI();
      expect(walletsResponse.status).toBe(200);
      
      const wallets = walletsResponse.body.data;
      expect(wallets).toHaveLength(3);

      // Find each wallet by address
      const wallet1 = wallets.find(w => w.address === '0x1111111111111111111111111111111111111111');
      const wallet2 = wallets.find(w => w.address === '0x2222222222222222222222222222222222222222');
      const wallet3 = wallets.find(w => w.address === '0x3333333333333333333333333333333333333333');

      // Verify wallet 1 (completed)
      expect(wallet1.indexingStatus.state).toBe('completed');
      expect(wallet1.total_transactions).toBe(50);
      expect(wallet1.total_events).toBe(25);
      expect(wallet1.last_indexed_block).toBe(1000);
      expect(wallet1.last_synced_at).toBeDefined();

      // Verify wallet 2 (running)
      expect(wallet2.indexingStatus.state).toBe('running');
      expect(wallet2.total_transactions).toBe(75);
      expect(wallet2.total_events).toBe(40);
      expect(wallet2.last_indexed_block).toBe(1200);

      // Verify wallet 3 (failed)
      expect(wallet3.indexingStatus.state).toBe('failed');
      expect(wallet3.total_transactions).toBe(30);
      expect(wallet3.total_events).toBe(15);
      expect(wallet3.last_indexed_block).toBe(800);

      // Verify indexing status details
      expect(wallet1.indexingStatus.transactionsFound).toBe(50);
      expect(wallet1.indexingStatus.eventsFound).toBe(25);
      expect(wallet2.indexingStatus.transactionsFound).toBe(75);
      expect(wallet2.indexingStatus.eventsFound).toBe(40);
      expect(wallet3.indexingStatus.transactionsFound).toBe(30);
      expect(wallet3.indexingStatus.eventsFound).toBe(15);
    });

    test('should allow independent refresh operations for each wallet', async () => {
      // Create 2 wallets
      const wallet1Response = await createWalletViaAPI('0x1111111111111111111111111111111111111111', 'ethereum', 'Wallet 1');
      const wallet2Response = await createWalletViaAPI('0x2222222222222222222222222222222222222222', 'polygon', 'Wallet 2');

      const wallet1Id = wallet1Response.body.data.id;
      const wallet2Id = wallet2Response.body.data.id;

      // Set initial indexing state for both wallets
      await pool.query(
        'UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW() WHERE id = $2',
        [1000, wallet1Id]
      );

      await pool.query(
        'UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW() WHERE id = $2',
        [2000, wallet2Id]
      );

      // Refresh wallet 1
      const refresh1Response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${wallet1Id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(refresh1Response.status).toBe(200);
      expect(refresh1Response.body.status).toBe('success');
      expect(refresh1Response.body.data.startBlock).toBe(1001); // last_indexed_block + 1

      // Refresh wallet 2
      const refresh2Response = await request(app)
        .post(`/api/projects/${testProject.id}/wallets/${wallet2Id}/refresh`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(refresh2Response.status).toBe(200);
      expect(refresh2Response.body.status).toBe('success');
      expect(refresh2Response.body.data.startBlock).toBe(2001); // last_indexed_block + 1

      // Verify different start blocks for each wallet
      expect(refresh1Response.body.data.startBlock).not.toBe(refresh2Response.body.data.startBlock);

      // Verify both refresh jobs were created independently
      expect(refresh1Response.body.data.indexingJobId).toBeDefined();
      expect(refresh2Response.body.data.indexingJobId).toBeDefined();
      expect(refresh1Response.body.data.indexingJobId).not.toBe(refresh2Response.body.data.indexingJobId);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent wallet creation', async () => {
      // Create multiple wallets concurrently
      const walletPromises = [
        createWalletViaAPI('0x1111111111111111111111111111111111111111', 'ethereum', 'Concurrent Wallet 1'),
        createWalletViaAPI('0x2222222222222222222222222222222222222222', 'polygon', 'Concurrent Wallet 2'),
        createWalletViaAPI('0x3333333333333333333333333333333333333333', 'lisk', 'Concurrent Wallet 3'),
        createWalletViaAPI('0x4444444444444444444444444444444444444444', 'arbitrum', 'Concurrent Wallet 4')
      ];

      const responses = await Promise.all(walletPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.indexingJobId).toBeDefined();
      });

      // Verify all wallets exist
      const walletsResponse = await getWalletsViaAPI();
      expect(walletsResponse.status).toBe(200);
      expect(walletsResponse.body.data).toHaveLength(4);

      // Verify unique addresses
      const addresses = walletsResponse.body.data.map(w => w.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(4);
    });

    test('should handle concurrent refresh operations', async () => {
      // Create 3 wallets
      const wallet1Response = await createWalletViaAPI('0x1111111111111111111111111111111111111111', 'ethereum', 'Wallet 1');
      const wallet2Response = await createWalletViaAPI('0x2222222222222222222222222222222222222222', 'polygon', 'Wallet 2');
      const wallet3Response = await createWalletViaAPI('0x3333333333333333333333333333333333333333', 'lisk', 'Wallet 3');

      const wallet1Id = wallet1Response.body.data.id;
      const wallet2Id = wallet2Response.body.data.id;
      const wallet3Id = wallet3Response.body.data.id;

      // Set initial state
      await pool.query(
        'UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW() WHERE id = ANY($2)',
        [1000, [wallet1Id, wallet2Id, wallet3Id]]
      );

      // Refresh all wallets concurrently
      const refreshPromises = [
        request(app)
          .post(`/api/projects/${testProject.id}/wallets/${wallet1Id}/refresh`)
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .post(`/api/projects/${testProject.id}/wallets/${wallet2Id}/refresh`)
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .post(`/api/projects/${testProject.id}/wallets/${wallet3Id}/refresh`)
          .set('Authorization', `Bearer ${authToken}`)
      ];

      const refreshResponses = await Promise.all(refreshPromises);

      // All should succeed
      refreshResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.startBlock).toBe(1001);
        expect(response.body.data.indexingJobId).toBeDefined();
      });

      // Verify unique job IDs
      const jobIds = refreshResponses.map(r => r.body.data.indexingJobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(3);
    });
  });
});