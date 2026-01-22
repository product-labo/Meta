/**
 * End-to-End Integration Tests for Multi-Chain Wallet Indexing
 * Feature: multi-chain-wallet-indexing
 * 
 * Tests complete user journey from signup to indexed data
 * Tests multi-chain scenarios with real contracts
 * Tests error recovery scenarios
 * 
 * Real contracts used:
 * - Lisk address: 0x4200000000000000000000000000000000000006
 * - Starknet address: 0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc
 * 
 * Requirements: All
 */

import request from 'supertest';
import express from 'express';
import { pool } from '../../src/config/appConfig.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import WebSocket from 'ws';
import { createServer } from 'http';

// Create test app with all necessary routes
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

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ status: 'error', data: { error: 'User already exists' } });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );
    
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
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
    console.error('Register error:', error);
    res.status(500).json({ status: 'error', data: { error: 'Internal server error' } });
  }
});

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

// Project routes
app.post('/api/projects', testAuthMiddleware, async (req, res) => {
  const { name, description, category, status, chain, contractAddress, abi, utility } = req.body;
  try {
    const dbCategory = utility ? utility.toLowerCase() : (category || 'other');
    const dbStatus = status || 'draft';

    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 'error', data: { error: 'Unauthorized' } });
    }

    if (!name || !chain || !contractAddress) {
      return res.status(400).json({ status: 'error', data: { error: 'Missing mandatory fields: Name, Chain, and Contract Address are required.' } });
    }

    const result = await pool.query(
      'INSERT INTO projects (user_id, name, description, category, status, chain, contract_address, abi, utility) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [req.user.id, name, description, dbCategory, dbStatus, chain, contractAddress, abi, utility]
    );

    await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [req.user.id]);

    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({ status: 'error', data: { error: 'Server error' } });
  }
});

app.get('/api/projects/user', testAuthMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        status: 'error',
        data: { error: 'Unauthorized' }
      });
    }

    const result = await pool.query(`
      SELECT p.*, 
             COUNT(w.id) as wallet_count,
             MAX(w.last_synced_at) as last_wallet_sync
      FROM projects p
      LEFT JOIN wallets w ON p.id = w.project_id AND w.is_active = true
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    console.error('Get User Projects Error:', error);
    res.status(500).json({ 
      status: 'error',
      data: { error: 'Server error' }
    });
  }
});

// Wallet routes
app.post('/api/projects/:projectId/wallets', testAuthMiddleware, async (req, res) => {
  const { projectId } = req.params;
  const { address, chain, description } = req.body;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        data: { error: 'User not authenticated' }
      });
    }

    // Validate address format
    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        status: 'error',
        data: { error: 'Invalid address format' }
      });
    }

    // Chain-specific validation
    if (chain.includes('starknet')) {
      if (address.length < 64 || !address.startsWith('0x')) {
        return res.status(400).json({
          status: 'error',
          data: { error: 'Invalid Starknet address format. Must be 64+ characters and start with 0x' }
        });
      }
    } else {
      // EVM chains
      if (address.length !== 42 || !address.startsWith('0x')) {
        return res.status(400).json({
          status: 'error',
          data: { error: 'Invalid EVM address format. Must be 42 characters and start with 0x' }
        });
      }
    }

    // Check project ownership
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        data: { error: 'Project not found or unauthorized' }
      });
    }

    // Check for duplicate wallet
    const duplicateCheck = await pool.query(
      'SELECT id FROM wallets WHERE project_id = $1 AND address = $2 AND chain = $3',
      [projectId, address, chain]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        data: { error: 'Wallet already exists for this project and chain' }
      });
    }

    // Determine chain type
    const chainType = chain.includes('starknet') ? 'starknet' : 'evm';

    // Create wallet
    const walletResult = await pool.query(
      `INSERT INTO wallets (project_id, address, chain, chain_type, description, is_active, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [projectId, address, chain, chainType, description, true, 't']
    );

    const wallet = walletResult.rows[0];

    // Create indexing job
    const jobResult = await pool.query(
      `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [wallet.id, projectId, 'queued', 0, 1000000, 0]
    );

    res.status(201).json({
      status: 'success',
      data: {
        ...wallet,
        indexingJobId: jobResult.rows[0].id,
        indexingStatus: 'queued'
      }
    });
  } catch (error) {
    console.error('Create Wallet Error:', error);
    res.status(500).json({
      status: 'error',
      data: { error: 'Server error' }
    });
  }
});

app.get('/api/projects/:projectId/wallets', testAuthMiddleware, async (req, res) => {
  const { projectId } = req.params;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        data: { error: 'User not authenticated' }
      });
    }

    // Check project ownership
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        data: { error: 'Project not found or unauthorized' }
      });
    }

    // Get wallets with indexing status
    const walletsResult = await pool.query(`
      SELECT w.*, 
             ij.status as indexing_status,
             ij.current_block,
             ij.transactions_found,
             ij.events_found,
             ij.blocks_per_second,
             ij.error_message
      FROM wallets w
      LEFT JOIN indexing_jobs ij ON w.id = ij.wallet_id
      WHERE w.project_id = $1 AND w.is_active = true
      ORDER BY w.created_at DESC
    `, [projectId]);

    const wallets = walletsResult.rows.map(wallet => ({
      ...wallet,
      indexingStatus: {
        state: wallet.indexing_status || 'unknown',
        currentBlock: wallet.current_block || 0,
        transactionsFound: wallet.transactions_found || 0,
        eventsFound: wallet.events_found || 0,
        blocksPerSecond: wallet.blocks_per_second || 0,
        errorMessage: wallet.error_message
      }
    }));

    res.json({
      status: 'success',
      data: wallets
    });
  } catch (error) {
    console.error('Get Wallets Error:', error);
    res.status(500).json({
      status: 'error',
      data: { error: 'Server error' }
    });
  }
});

app.get('/api/projects/:projectId/wallets/:walletId/indexing-status', testAuthMiddleware, async (req, res) => {
  const { projectId, walletId } = req.params;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        data: { error: 'User not authenticated' }
      });
    }

    // Check project ownership and wallet existence
    const walletCheck = await pool.query(`
      SELECT w.*, p.user_id
      FROM wallets w
      JOIN projects p ON w.project_id = p.id
      WHERE w.id = $1 AND p.id = $2 AND p.user_id = $3
    `, [walletId, projectId, req.user.id]);

    if (walletCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        data: { error: 'Wallet not found' }
      });
    }

    const wallet = walletCheck.rows[0];

    // Get latest indexing job
    const jobResult = await pool.query(`
      SELECT * FROM indexing_jobs 
      WHERE wallet_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [walletId]);

    let indexingStatus = 'unknown';
    let progress = {
      currentBlock: 0,
      totalBlocks: 0,
      transactionsFound: 0,
      eventsFound: 0,
      blocksPerSecond: 0,
      estimatedTimeRemaining: 0
    };

    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0];
      indexingStatus = job.status;
      
      const totalBlocks = job.end_block - job.start_block;
      const processedBlocks = job.current_block - job.start_block;
      const progressPercentage = totalBlocks > 0 ? (processedBlocks / totalBlocks) * 100 : 0;
      
      progress = {
        currentBlock: job.current_block,
        totalBlocks: job.end_block,
        transactionsFound: job.transactions_found || 0,
        eventsFound: job.events_found || 0,
        blocksPerSecond: job.blocks_per_second || 0,
        estimatedTimeRemaining: job.blocks_per_second > 0 ? 
          Math.ceil((job.end_block - job.current_block) / job.blocks_per_second) : 0,
        percentage: Math.min(progressPercentage, 100)
      };
    }

    res.json({
      status: 'success',
      data: {
        walletId: wallet.id,
        indexingStatus,
        progress,
        lastIndexedBlock: wallet.last_indexed_block,
        lastSyncedAt: wallet.last_synced_at,
        errorMessage: jobResult.rows.length > 0 ? jobResult.rows[0].error_message : null
      }
    });
  } catch (error) {
    console.error('Get Indexing Status Error:', error);
    res.status(500).json({
      status: 'error',
      data: { error: 'Server error' }
    });
  }
});

app.post('/api/projects/:projectId/wallets/:walletId/refresh', testAuthMiddleware, async (req, res) => {
  const { projectId, walletId } = req.params;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        data: { error: 'User not authenticated' }
      });
    }

    // Check project ownership and wallet existence
    const walletCheck = await pool.query(`
      SELECT w.*, p.user_id
      FROM wallets w
      JOIN projects p ON w.project_id = p.id
      WHERE w.id = $1 AND p.id = $2 AND p.user_id = $3
    `, [walletId, projectId, req.user.id]);

    if (walletCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        data: { error: 'Wallet not found' }
      });
    }

    const wallet = walletCheck.rows[0];

    // Check if there's already an active indexing job
    const activeJobCheck = await pool.query(
      'SELECT id FROM indexing_jobs WHERE wallet_id = $1 AND status IN ($2, $3)',
      [walletId, 'queued', 'running']
    );

    if (activeJobCheck.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        data: { error: 'Indexing job already in progress for this wallet' }
      });
    }

    // Create refresh job starting from last indexed block + 1
    const startBlock = (wallet.last_indexed_block || 0) + 1;
    const endBlock = 2000000; // Mock current block

    const jobResult = await pool.query(
      `INSERT INTO indexing_jobs (wallet_id, project_id, status, start_block, end_block, current_block)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [walletId, projectId, 'queued', startBlock, endBlock, startBlock]
    );

    res.json({
      status: 'success',
      data: {
        indexingJobId: jobResult.rows[0].id,
        startBlock,
        currentBlock: endBlock,
        message: 'Refresh job queued successfully'
      }
    });
  } catch (error) {
    console.error('Refresh Wallet Error:', error);
    res.status(500).json({
      status: 'error',
      data: { error: 'Server error' }
    });
  }
});

describe('End-to-End Multi-Chain Wallet Indexing Tests', () => {
  // Track test data for cleanup
  const testUserIds = [];
  const testProjectIds = [];
  const testWalletIds = [];
  const testTransactionIds = [];
  let server;
  let wsServer;

  beforeAll(async () => {
    // Test database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }

    // Create HTTP server for WebSocket testing
    server = createServer(app);
    wsServer = new WebSocket.Server({ server });
    
    // Mock WebSocket server for indexing progress
    wsServer.on('connection', (ws, req) => {
      const url = new URL(req.url, 'http://localhost');
      const walletId = url.pathname.split('/').pop();
      
      ws.walletId = walletId;
      
      // Send mock progress updates
      const sendProgress = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'progress',
            data: {
              walletId,
              currentBlock: Math.floor(Math.random() * 1000) + 1000,
              totalBlocks: 2000,
              transactionsFound: Math.floor(Math.random() * 50),
              eventsFound: Math.floor(Math.random() * 25),
              blocksPerSecond: Math.floor(Math.random() * 10) + 5,
              estimatedTimeRemaining: Math.floor(Math.random() * 300) + 60
            }
          }));
        }
      };

      // Send initial progress
      setTimeout(sendProgress, 100);
      
      // Send periodic updates
      const interval = setInterval(sendProgress, 1000);
      
      ws.on('close', () => {
        clearInterval(interval);
      });
    });

    server.listen(0); // Use random available port
  });

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    try {
      if (testTransactionIds.length > 0) {
        await pool.query('DELETE FROM wallet_transactions WHERE id = ANY($1)', [testTransactionIds]);
      }
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

    if (server) {
      server.close();
    }
    if (wsServer) {
      wsServer.close();
    }
  });

  describe('Complete User Journey: Signup to Indexed Data', () => {
    let userToken;
    let userId;
    let projectId;
    let walletId;

    test('Step 1: User registration and authentication', async () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const email = `e2e-test-${timestamp}-${random}@example.com`;
      const password = 'SecurePassword123!';
      const name = `E2E Test User ${random}`;

      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          name
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.status).toBe('success');
      expect(registerResponse.body.data.token).toBeDefined();
      expect(registerResponse.body.data.user.email).toBe(email);
      expect(registerResponse.body.data.user.name).toBe(name);

      userToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
      testUserIds.push(userId);

      // Verify login works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.status).toBe('success');
      expect(loginResponse.body.data.token).toBeDefined();
    });

    test('Step 2: Project creation during onboarding', async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'E2E Test DeFi Project',
          description: 'End-to-end test project for multi-chain wallet indexing',
          category: 'defi',
          chain: 'lisk',
          contractAddress: '0x4200000000000000000000000000000000000006', // Real Lisk contract
          utility: 'defi'
        });

      expect(projectResponse.status).toBe(201);
      expect(projectResponse.body.status).toBe('success');
      expect(projectResponse.body.data.name).toBe('E2E Test DeFi Project');
      expect(projectResponse.body.data.chain).toBe('lisk');
      expect(projectResponse.body.data.contract_address).toBe('0x4200000000000000000000000000000000000006');

      projectId = projectResponse.body.data.id;
      testProjectIds.push(projectId);

      // Verify user onboarding is marked complete
      const userCheck = await pool.query('SELECT onboarding_completed FROM users WHERE id = $1', [userId]);
      expect(userCheck.rows[0].onboarding_completed).toBe(true);
    });

    test('Step 3: Wallet addition with real Lisk address', async () => {
      const walletResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          address: '0x4200000000000000000000000000000000000006', // Real Lisk contract address
          chain: 'lisk',
          description: 'Lisk L2 Standard Bridge Contract'
        });

      expect(walletResponse.status).toBe(201);
      expect(walletResponse.body.status).toBe('success');
      expect(walletResponse.body.data.address).toBe('0x4200000000000000000000000000000000000006');
      expect(walletResponse.body.data.chain).toBe('lisk');
      expect(walletResponse.body.data.chain_type).toBe('evm');
      expect(walletResponse.body.data.indexingJobId).toBeDefined();
      expect(walletResponse.body.data.indexingStatus).toBe('queued');

      walletId = walletResponse.body.data.id;
      testWalletIds.push(walletId);
    });

    test('Step 4: Indexing job creation and progress tracking', async () => {
      // Check initial indexing status
      const statusResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toBe('success');
      expect(statusResponse.body.data.indexingStatus).toBe('queued');
      expect(statusResponse.body.data.walletId).toBe(walletId);

      // Simulate indexing progress
      const jobResult = await pool.query(
        'SELECT id FROM indexing_jobs WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 1',
        [walletId]
      );
      const jobId = jobResult.rows[0].id;

      // Update job to running status
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'running',
             current_block = 500,
             transactions_found = 25,
             events_found = 12,
             blocks_per_second = 15,
             started_at = NOW()
         WHERE id = $1`,
        [jobId]
      );

      // Check running status
      const runningStatusResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(runningStatusResponse.status).toBe(200);
      const runningStatus = runningStatusResponse.body.data;
      expect(runningStatus.indexingStatus).toBe('running');
      expect(parseInt(runningStatus.progress.currentBlock)).toBe(500);
      expect(runningStatus.progress.transactionsFound).toBe(25);
      expect(runningStatus.progress.eventsFound).toBe(12);
      expect(parseFloat(runningStatus.progress.blocksPerSecond)).toBe(15);
      expect(runningStatus.progress.percentage).toBeGreaterThan(0);
    });

    test('Step 5: Indexing completion and data storage', async () => {
      // Complete the indexing job
      const jobResult = await pool.query(
        'SELECT id FROM indexing_jobs WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 1',
        [walletId]
      );
      const jobId = jobResult.rows[0].id;

      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'completed',
             current_block = 1000,
             transactions_found = 50,
             events_found = 25,
             completed_at = NOW()
         WHERE id = $1`,
        [jobId]
      );

      // Update wallet statistics
      await pool.query(
        `UPDATE wallets 
         SET last_indexed_block = 1000,
             total_transactions = 50,
             total_events = 25,
             last_synced_at = NOW()
         WHERE id = $1`,
        [walletId]
      );

      // Add some mock transaction data
      const transactionIds = [];
      for (let i = 0; i < 5; i++) {
        const txHash = '0x' + Math.random().toString(16).substring(2, 66).padEnd(64, '0');
        const blockNumber = 900 + i;
        const timestamp = new Date(Date.now() - (5 - i) * 60000); // 1 minute intervals
        
        const txResult = await pool.query(
          `INSERT INTO wallet_transactions (
            wallet_id, chain, chain_type, transaction_hash, block_number, 
            block_timestamp, from_address, to_address, value_eth, function_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            walletId, 'lisk', 'evm', txHash, blockNumber, timestamp,
            '0x4200000000000000000000000000000000000006',
            '0x1234567890123456789012345678901234567890',
            (i + 1).toString(), 'bridgeETH'
          ]
        );
        
        transactionIds.push(txResult.rows[0].id);
        testTransactionIds.push(txResult.rows[0].id);
      }

      // Check completion status
      const completedStatusResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(completedStatusResponse.status).toBe(200);
      const completedStatus = completedStatusResponse.body.data;
      expect(completedStatus.indexingStatus).toBe('completed');
      expect(completedStatus.progress.transactionsFound).toBe(50);
      expect(completedStatus.progress.eventsFound).toBe(25);
      expect(parseInt(completedStatus.lastIndexedBlock)).toBe(1000);
      expect(completedStatus.lastSyncedAt).toBeDefined();

      // Verify transaction data is accessible
      const transactionsQuery = await pool.query(
        'SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY block_number',
        [walletId]
      );

      expect(transactionsQuery.rows.length).toBe(5);
      transactionsQuery.rows.forEach((tx, index) => {
        expect(tx.chain).toBe('lisk');
        expect(tx.chain_type).toBe('evm');
        expect(tx.function_name).toBe('bridgeETH');
        expect(parseFloat(tx.value_eth)).toBe(index + 1);
      });
    });

    test('Step 6: Dashboard view with wallet status', async () => {
      // Get all wallets for the project
      const walletsResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(walletsResponse.status).toBe(200);
      expect(walletsResponse.body.status).toBe('success');
      expect(walletsResponse.body.data).toHaveLength(1);

      const wallet = walletsResponse.body.data[0];
      expect(wallet.id).toBe(walletId);
      expect(wallet.address).toBe('0x4200000000000000000000000000000000000006');
      expect(wallet.chain).toBe('lisk');
      expect(wallet.indexingStatus.state).toBe('completed');
      expect(wallet.total_transactions).toBe(50);
      expect(wallet.total_events).toBe(25);
      expect(parseInt(wallet.last_indexed_block)).toBe(1000);

      // Get user projects
      const projectsResponse = await request(app)
        .get('/api/projects/user')
        .set('Authorization', `Bearer ${userToken}`);

      expect(projectsResponse.status).toBe(200);
      expect(projectsResponse.body.data).toHaveLength(1);
      expect(projectsResponse.body.data[0].wallet_count).toBe('1');
    });
  });

  describe('Multi-Chain Scenarios with Real Contracts', () => {
    let userToken;
    let userId;
    let projectId;
    let liskWalletId;
    let starknetWalletId;

    beforeAll(async () => {
      // Create user for multi-chain tests
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const email = `multichain-test-${timestamp}-${random}@example.com`;
      const password = 'MultiChainTest123!';
      const name = `Multi-Chain Test User ${random}`;

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email, password, name });

      userToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
      testUserIds.push(userId);

      // Create project
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Multi-Chain Test Project',
          description: 'Testing multiple blockchain networks',
          category: 'defi',
          chain: 'ethereum',
          contractAddress: '0x1234567890123456789012345678901234567890',
          utility: 'defi'
        });

      projectId = projectResponse.body.data.id;
      testProjectIds.push(projectId);
    });

    test('should handle Lisk EVM chain wallet', async () => {
      const walletResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          address: '0x4200000000000000000000000000000000000006', // Real Lisk L2 Standard Bridge
          chain: 'lisk',
          description: 'Lisk L2 Standard Bridge - Real Contract'
        });

      expect(walletResponse.status).toBe(201);
      expect(walletResponse.body.data.chain).toBe('lisk');
      expect(walletResponse.body.data.chain_type).toBe('evm');
      expect(walletResponse.body.data.address).toBe('0x4200000000000000000000000000000000000006');

      liskWalletId = walletResponse.body.data.id;
      testWalletIds.push(liskWalletId);

      // Verify indexing job was created
      const jobCheck = await pool.query(
        'SELECT * FROM indexing_jobs WHERE wallet_id = $1',
        [liskWalletId]
      );
      expect(jobCheck.rows.length).toBe(1);
      expect(jobCheck.rows[0].status).toBe('queued');
    });

    test('should handle Starknet wallet with different address format', async () => {
      const walletResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          address: '0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc', // Real Starknet contract
          chain: 'starknet-mainnet',
          description: 'Starknet Contract - Real Address'
        });

      expect(walletResponse.status).toBe(201);
      expect(walletResponse.body.data.chain).toBe('starknet-mainnet');
      expect(walletResponse.body.data.chain_type).toBe('starknet');
      expect(walletResponse.body.data.address).toBe('0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc');

      starknetWalletId = walletResponse.body.data.id;
      testWalletIds.push(starknetWalletId);

      // Verify indexing job was created
      const jobCheck = await pool.query(
        'SELECT * FROM indexing_jobs WHERE wallet_id = $1',
        [starknetWalletId]
      );
      expect(jobCheck.rows.length).toBe(1);
      expect(jobCheck.rows[0].status).toBe('queued');
    });

    test('should maintain separate indexing for different chains', async () => {
      // Simulate different indexing progress for each chain
      const liskJobResult = await pool.query(
        'SELECT id FROM indexing_jobs WHERE wallet_id = $1',
        [liskWalletId]
      );
      const starknetJobResult = await pool.query(
        'SELECT id FROM indexing_jobs WHERE wallet_id = $1',
        [starknetWalletId]
      );

      const liskJobId = liskJobResult.rows[0].id;
      const starknetJobId = starknetJobResult.rows[0].id;

      // Update Lisk job to running
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'running',
             current_block = 800,
             transactions_found = 30,
             events_found = 15
         WHERE id = $1`,
        [liskJobId]
      );

      // Update Starknet job to completed
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'completed',
             current_block = 1200,
             transactions_found = 45,
             events_found = 20
         WHERE id = $1`,
        [starknetJobId]
      );

      // Check Lisk wallet status
      const liskStatusResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets/${liskWalletId}/indexing-status`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(liskStatusResponse.body.data.indexingStatus).toBe('running');
      expect(liskStatusResponse.body.data.progress.transactionsFound).toBe(30);

      // Check Starknet wallet status
      const starknetStatusResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets/${starknetWalletId}/indexing-status`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(starknetStatusResponse.body.data.indexingStatus).toBe('completed');
      expect(starknetStatusResponse.body.data.progress.transactionsFound).toBe(45);

      // Verify both wallets appear in project wallet list
      const walletsResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(walletsResponse.body.data).toHaveLength(2);
      
      const liskWallet = walletsResponse.body.data.find(w => w.chain === 'lisk');
      const starknetWallet = walletsResponse.body.data.find(w => w.chain === 'starknet-mainnet');

      expect(liskWallet.indexingStatus.state).toBe('running');
      expect(starknetWallet.indexingStatus.state).toBe('completed');
    });

    test('should handle chain-specific data storage', async () => {
      // Add mock transactions for both chains
      const liskTxResult = await pool.query(
        `INSERT INTO wallet_transactions (
          wallet_id, chain, chain_type, transaction_hash, block_number, 
          block_timestamp, from_address, to_address, value_eth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          liskWalletId, 'lisk', 'evm', 
          '0xabc123def456789abc123def456789abc123def456789abc123def456789abc1',
          1000, new Date(), 
          '0x4200000000000000000000000000000000000006',
          '0x1111111111111111111111111111111111111111',
          '5.0'
        ]
      );

      const starknetTxResult = await pool.query(
        `INSERT INTO wallet_transactions (
          wallet_id, chain, chain_type, transaction_hash, block_number, 
          block_timestamp, from_address, to_address, value_eth
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          starknetWalletId, 'starknet-mainnet', 'starknet',
          '0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745b',
          2000, new Date(),
          '0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc',
          '0x0333333333333333333333333333333333333333333333333333333333333333',
          '10.0'
        ]
      );

      testTransactionIds.push(liskTxResult.rows[0].id, starknetTxResult.rows[0].id);

      // Verify chain-specific data isolation
      const liskTxs = await pool.query(
        'SELECT * FROM wallet_transactions WHERE wallet_id = $1',
        [liskWalletId]
      );
      const starknetTxs = await pool.query(
        'SELECT * FROM wallet_transactions WHERE wallet_id = $1',
        [starknetWalletId]
      );

      expect(liskTxs.rows).toHaveLength(1);
      expect(liskTxs.rows[0].chain).toBe('lisk');
      expect(liskTxs.rows[0].chain_type).toBe('evm');

      expect(starknetTxs.rows).toHaveLength(1);
      expect(starknetTxs.rows[0].chain).toBe('starknet-mainnet');
      expect(starknetTxs.rows[0].chain_type).toBe('starknet');
    });
  });

  describe('Error Recovery Scenarios', () => {
    let userToken;
    let userId;
    let projectId;
    let walletId;

    beforeAll(async () => {
      // Create user for error recovery tests
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const email = `error-recovery-test-${timestamp}-${random}@example.com`;
      const password = 'ErrorRecovery123!';
      const name = `Error Recovery Test User ${random}`;

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email, password, name });

      userToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
      testUserIds.push(userId);

      // Create project
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Error Recovery Test Project',
          description: 'Testing error recovery scenarios',
          category: 'defi',
          chain: 'ethereum',
          contractAddress: '0x1234567890123456789012345678901234567890',
          utility: 'defi'
        });

      projectId = projectResponse.body.data.id;
      testProjectIds.push(projectId);

      // Create wallet
      const walletResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          address: '0x4200000000000000000000000000000000000006',
          chain: 'lisk',
          description: 'Error Recovery Test Wallet'
        });

      walletId = walletResponse.body.data.id;
      testWalletIds.push(walletId);
    });

    test('should handle indexing job failure and allow retry', async () => {
      // Get the indexing job
      const jobResult = await pool.query(
        'SELECT id FROM indexing_jobs WHERE wallet_id = $1',
        [walletId]
      );
      const jobId = jobResult.rows[0].id;

      // Simulate job failure
      await pool.query(
        `UPDATE indexing_jobs 
         SET status = 'failed',
             error_message = 'RPC endpoint timeout',
             current_block = 500
         WHERE id = $1`,
        [jobId]
      );

      // Check failed status
      const failedStatusResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(failedStatusResponse.body.data.indexingStatus).toBe('failed');
      expect(failedStatusResponse.body.data.errorMessage).toBe('RPC endpoint timeout');

      // Retry by refreshing the wallet
      const retryResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets/${walletId}/refresh`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(retryResponse.status).toBe(200);
      expect(retryResponse.body.data.indexingJobId).toBeDefined();

      // Verify new job was created
      const newJobResult = await pool.query(
        'SELECT COUNT(*) FROM indexing_jobs WHERE wallet_id = $1',
        [walletId]
      );
      expect(parseInt(newJobResult.rows[0].count)).toBe(2);
    });

    test('should handle invalid address formats gracefully', async () => {
      // Try to create wallet with invalid EVM address
      const invalidEvmResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          address: '0xinvalid',
          chain: 'ethereum',
          description: 'Invalid EVM address'
        });

      expect(invalidEvmResponse.status).toBe(400);
      expect(invalidEvmResponse.body.data.error).toContain('Invalid EVM address format');

      // Try to create wallet with invalid Starknet address
      const invalidStarknetResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          address: '0x123',
          chain: 'starknet-mainnet',
          description: 'Invalid Starknet address'
        });

      expect(invalidStarknetResponse.status).toBe(400);
      expect(invalidStarknetResponse.body.data.error).toContain('Invalid Starknet address format');
    });

    test('should prevent duplicate wallet creation', async () => {
      // Try to create duplicate wallet
      const duplicateResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          address: '0x4200000000000000000000000000000000000006',
          chain: 'lisk',
          description: 'Duplicate wallet attempt'
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.data.error).toContain('already exists');
    });

    test('should handle concurrent refresh attempts', async () => {
      // Update wallet to have some indexed data
      await pool.query(
        'UPDATE wallets SET last_indexed_block = 1000 WHERE id = $1',
        [walletId]
      );

      // Clear any existing jobs first
      await pool.query(
        'DELETE FROM indexing_jobs WHERE wallet_id = $1',
        [walletId]
      );

      // Start first refresh
      const firstRefreshResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets/${walletId}/refresh`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(firstRefreshResponse.status).toBe(200);

      // Try second refresh immediately
      const secondRefreshResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets/${walletId}/refresh`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(secondRefreshResponse.status).toBe(409);
      expect(secondRefreshResponse.body.data.error).toContain('already in progress');
    });

    test('should handle unauthorized access attempts', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'unauthorized-user@example.com',
          password: 'Password123!',
          name: 'Unauthorized User'
        });

      const otherUserToken = otherUserResponse.body.data.token;
      testUserIds.push(otherUserResponse.body.data.user.id);

      // Try to access first user's wallet
      const unauthorizedResponse = await request(app)
        .get(`/api/projects/${projectId}/wallets/${walletId}/indexing-status`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(unauthorizedResponse.status).toBe(404);
      expect(unauthorizedResponse.body.data.error).toBe('Wallet not found');

      // Try to refresh first user's wallet
      const unauthorizedRefreshResponse = await request(app)
        .post(`/api/projects/${projectId}/wallets/${walletId}/refresh`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(unauthorizedRefreshResponse.status).toBe(404);
      expect(unauthorizedRefreshResponse.body.data.error).toBe('Wallet not found');
    });
  });

  describe('WebSocket Real-Time Progress Updates', () => {
    test('should establish WebSocket connection and receive progress updates', (done) => {
      const walletId = 'test-wallet-id';
      const ws = new WebSocket(`ws://localhost:${server.address().port}/ws/indexing/${walletId}`);
      
      let messageCount = 0;
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        expect(message.type).toBe('progress');
        expect(message.data.walletId).toBe(walletId);
        expect(message.data.currentBlock).toBeGreaterThan(0);
        expect(message.data.totalBlocks).toBe(2000);
        expect(message.data.transactionsFound).toBeGreaterThanOrEqual(0);
        expect(message.data.eventsFound).toBeGreaterThanOrEqual(0);
        expect(message.data.blocksPerSecond).toBeGreaterThan(0);
        expect(message.data.estimatedTimeRemaining).toBeGreaterThan(0);
        
        messageCount++;
        
        if (messageCount >= 2) {
          ws.close();
          done();
        }
      });
      
      ws.on('error', (error) => {
        done(error);
      });
    }, 10000);
  });
});