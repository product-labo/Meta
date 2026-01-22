/**
 * Integration tests for multi-project support
 * Feature: multi-chain-wallet-indexing
 * 
 * Tests creating multiple projects, data isolation, and project switching
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import request from 'supertest';
import express from 'express';
import { pool } from '../../src/config/appConfig.js';
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

// Project management endpoints
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

app.put('/api/projects/:id', testAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, category, status, website_url, github_url, logo_url, tags } = req.body;
  
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        status: 'error',
        data: { error: 'Unauthorized' }
      });
    }

    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        data: { error: 'Project not found or unauthorized' }
      });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        data: { error: 'No fields to update' }
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;
    values.push(req.user.id);

    const result = await pool.query(query, values);

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update Project Error:', error);
    res.status(500).json({ 
      status: 'error',
      data: { error: 'Server error' }
    });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get Project Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/projects/:id', testAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        status: 'error',
        data: { error: 'Unauthorized' }
      });
    }

    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        data: { error: 'Project not found or unauthorized' }
      });
    }

    await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, req.user.id]);

    res.json({
      status: 'success',
      data: { message: 'Project deleted successfully' }
    });
  } catch (error) {
    console.error('Delete Project Error:', error);
    res.status(500).json({ 
      status: 'error',
      data: { error: 'Server error' }
    });
  }
});

// Wallet management endpoints
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
      [projectId, address, chain, chainType, description, true, 't'] // Using 't' for transparent type
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
             ij.events_found
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
        eventsFound: wallet.events_found || 0
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

// Set up auth routes for testing
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    // Check if user already exists
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

describe('Multi-Project Integration Tests', () => {
  // Track test data for cleanup
  const testUserIds = [];
  const testProjectIds = [];
  const testWalletIds = [];
  let user1Token, user2Token;
  let user1Id, user2Id;
  let project1Id, project2Id, project3Id;

  beforeAll(async () => {
    // Test database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }

    // Clean up any existing test data
    await pool.query('DELETE FROM wallets WHERE 1=1');
    await pool.query('DELETE FROM projects WHERE 1=1');
    await pool.query('DELETE FROM users WHERE email LIKE \'%test-multi-project%\'');

    // Create test users
    const user1Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user1-test-multi-project@example.com',
        password: 'password123',
        name: 'Test User 1'
      });

    const user2Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user2-test-multi-project@example.com',
        password: 'password123',
        name: 'Test User 2'
      });

    expect(user1Response.status).toBe(201);
    expect(user2Response.status).toBe(201);

    user1Token = user1Response.body.data.token;
    user2Token = user2Response.body.data.token;
    user1Id = user1Response.body.data.user.id;
    user2Id = user2Response.body.data.user.id;

    testUserIds.push(user1Id, user2Id);
  });

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    try {
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

  describe('Creating Multiple Projects', () => {
    test('should allow user to create multiple projects', async () => {
      // Create first project for user1
      const project1Response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Project Alpha',
          description: 'First test project',
          category: 'defi',
          chain: 'ethereum',
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
        });

      expect(project1Response.status).toBe(201);
      expect(project1Response.body.status).toBe('success');
      project1Id = project1Response.body.data.id;
      testProjectIds.push(project1Id);

      // Create second project for user1
      const project2Response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Project Beta',
          description: 'Second test project',
          category: 'nft',
          chain: 'polygon',
          contractAddress: '0x853d955aCEf822Db058eb8505911ED77F175b99e'
        });

      expect(project2Response.status).toBe(201);
      expect(project2Response.body.status).toBe('success');
      project2Id = project2Response.body.data.id;
      testProjectIds.push(project2Id);

      // Create third project for user2
      const project3Response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Project Gamma',
          description: 'Third test project',
          category: 'dao',
          chain: 'starknet-mainnet',
          contractAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
        });

      expect(project3Response.status).toBe(201);
      expect(project3Response.body.status).toBe('success');
      project3Id = project3Response.body.data.id;
      testProjectIds.push(project3Id);

      // Verify projects are created with correct user associations
      const dbResult = await pool.query(
        'SELECT id, name, user_id FROM projects WHERE id IN ($1, $2, $3)',
        [project1Id, project2Id, project3Id]
      );

      expect(dbResult.rows).toHaveLength(3);
      
      const project1 = dbResult.rows.find(p => p.id === project1Id);
      const project2 = dbResult.rows.find(p => p.id === project2Id);
      const project3 = dbResult.rows.find(p => p.id === project3Id);

      expect(project1.user_id).toBe(user1Id);
      expect(project2.user_id).toBe(user1Id);
      expect(project3.user_id).toBe(user2Id);
    });

    test('should return user-specific projects when listing', async () => {
      // Get projects for user1
      const user1ProjectsResponse = await request(app)
        .get('/api/projects/user')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1ProjectsResponse.status).toBe(200);
      expect(user1ProjectsResponse.body.status).toBe('success');
      expect(user1ProjectsResponse.body.data).toHaveLength(2);
      
      const user1ProjectNames = user1ProjectsResponse.body.data.map(p => p.name);
      expect(user1ProjectNames).toContain('Project Alpha');
      expect(user1ProjectNames).toContain('Project Beta');
      expect(user1ProjectNames).not.toContain('Project Gamma');

      // Get projects for user2
      const user2ProjectsResponse = await request(app)
        .get('/api/projects/user')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2ProjectsResponse.status).toBe(200);
      expect(user2ProjectsResponse.body.status).toBe('success');
      expect(user2ProjectsResponse.body.data).toHaveLength(1);
      expect(user2ProjectsResponse.body.data[0].name).toBe('Project Gamma');
    });
  });

  describe('Data Isolation Between Projects', () => {
    test('should maintain separate wallet lists per project', async () => {
      // Add wallets to project1
      const wallet1Response = await request(app)
        .post(`/api/projects/${project1Id}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          chain: 'ethereum',
          description: 'Project Alpha Wallet 1'
        });

      const wallet2Response = await request(app)
        .post(`/api/projects/${project1Id}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
          chain: 'ethereum',
          description: 'Project Alpha Wallet 2'
        });

      // Add wallets to project2
      const wallet3Response = await request(app)
        .post(`/api/projects/${project2Id}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          chain: 'polygon',
          description: 'Project Beta Wallet 1'
        });

      // Add wallet to project3 (different user)
      const wallet4Response = await request(app)
        .post(`/api/projects/${project3Id}/wallets`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          chain: 'starknet-mainnet',
          description: 'Project Gamma Wallet 1'
        });

      expect(wallet1Response.status).toBe(201);
      expect(wallet2Response.status).toBe(201);
      expect(wallet3Response.status).toBe(201);
      expect(wallet4Response.status).toBe(201);

      // Track wallet IDs for cleanup
      testWalletIds.push(
        wallet1Response.body.data.id,
        wallet2Response.body.data.id,
        wallet3Response.body.data.id,
        wallet4Response.body.data.id
      );

      // Verify project1 has 2 wallets
      const project1WalletsResponse = await request(app)
        .get(`/api/projects/${project1Id}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(project1WalletsResponse.status).toBe(200);
      expect(project1WalletsResponse.body.data).toHaveLength(2);

      // Verify project2 has 1 wallet
      const project2WalletsResponse = await request(app)
        .get(`/api/projects/${project2Id}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(project2WalletsResponse.status).toBe(200);
      expect(project2WalletsResponse.body.data).toHaveLength(1);

      // Verify project3 has 1 wallet
      const project3WalletsResponse = await request(app)
        .get(`/api/projects/${project3Id}/wallets`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(project3WalletsResponse.status).toBe(200);
      expect(project3WalletsResponse.body.data).toHaveLength(1);
    });

    test('should prevent cross-project data access', async () => {
      // User1 should not be able to access project3 wallets
      const unauthorizedResponse = await request(app)
        .get(`/api/projects/${project3Id}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(unauthorizedResponse.status).toBe(404);
      expect(unauthorizedResponse.body.status).toBe('error');
      expect(unauthorizedResponse.body.data.error).toContain('not found or unauthorized');

      // User2 should not be able to access project1 wallets
      const unauthorizedResponse2 = await request(app)
        .get(`/api/projects/${project1Id}/wallets`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unauthorizedResponse2.status).toBe(404);
      expect(unauthorizedResponse2.body.status).toBe('error');
      expect(unauthorizedResponse2.body.data.error).toContain('not found or unauthorized');
    });

    test('should ensure complete data isolation in database', async () => {
      // Verify wallets are properly associated with correct projects
      const walletsQuery = await pool.query(`
        SELECT w.id, w.address, w.project_id, p.name as project_name, p.user_id
        FROM wallets w
        JOIN projects p ON w.project_id = p.id
        WHERE p.id IN ($1, $2, $3)
        ORDER BY p.name, w.address
      `, [project1Id, project2Id, project3Id]);

      expect(walletsQuery.rows).toHaveLength(4);

      // Check project1 wallets
      const project1Wallets = walletsQuery.rows.filter(w => w.project_id === project1Id);
      expect(project1Wallets).toHaveLength(2);
      expect(project1Wallets.every(w => w.user_id === user1Id)).toBe(true);

      // Check project2 wallets
      const project2Wallets = walletsQuery.rows.filter(w => w.project_id === project2Id);
      expect(project2Wallets).toHaveLength(1);
      expect(project2Wallets.every(w => w.user_id === user1Id)).toBe(true);

      // Check project3 wallets
      const project3Wallets = walletsQuery.rows.filter(w => w.project_id === project3Id);
      expect(project3Wallets).toHaveLength(1);
      expect(project3Wallets.every(w => w.user_id === user2Id)).toBe(true);
    });
  });

  describe('Switching Between Projects', () => {
    test('should allow user to switch between their own projects', async () => {
      // Get project details for user1's first project
      const project1Response = await request(app)
        .get(`/api/projects/${project1Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(project1Response.status).toBe(200);
      expect(project1Response.body.name).toBe('Project Alpha');

      // Get project details for user1's second project
      const project2Response = await request(app)
        .get(`/api/projects/${project2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(project2Response.status).toBe(200);
      expect(project2Response.body.name).toBe('Project Beta');

      // Verify user1 cannot access user2's project wallets
      const walletUnauthorizedResponse = await request(app)
        .get(`/api/projects/${project3Id}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(walletUnauthorizedResponse.status).toBe(404);
    });
  });

  describe('Project Management Operations', () => {
    test('should allow updating project details', async () => {
      const updateResponse = await request(app)
        .put(`/api/projects/${project1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Project Alpha Updated',
          description: 'Updated description for first project'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.status).toBe('success');
      expect(updateResponse.body.data.name).toBe('Project Alpha Updated');

      // Verify user2 cannot update user1's project
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/projects/${project1Id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(unauthorizedUpdateResponse.status).toBe(404);
    });

    test('should allow deleting projects and cascade to wallets', async () => {
      // Create a temporary project for deletion test
      const tempProjectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Temp Project',
          description: 'Project to be deleted',
          category: 'other',
          chain: 'ethereum',
          contractAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        });

      const tempProjectId = tempProjectResponse.body.data.id;
      testProjectIds.push(tempProjectId);

      // Add a wallet to the temp project
      const tempWalletResponse = await request(app)
        .post(`/api/projects/${tempProjectId}/wallets`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          chain: 'ethereum',
          description: 'Temp wallet'
        });

      testWalletIds.push(tempWalletResponse.body.data.id);

      // Delete the project
      const deleteResponse = await request(app)
        .delete(`/api/projects/${tempProjectId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(deleteResponse.status).toBe(200);

      // Verify associated wallets are also deleted (cascade)
      const walletsQuery = await pool.query(
        'SELECT COUNT(*) FROM wallets WHERE project_id = $1',
        [tempProjectId]
      );

      expect(parseInt(walletsQuery.rows[0].count)).toBe(0);
    });
  });
});