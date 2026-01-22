/**
 * Authorization middleware for multi-chain wallet indexing
 * Provides role-based access control for projects and wallets
 */

import { pool } from '../config/appConfig.js';

/**
 * Require ownership of a project
 */
export async function requireOwnership(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        data: { error: 'Authentication required' }
      });
    }

    if (!projectId) {
      return res.status(400).json({
        status: 'error',
        data: { error: 'Project ID required' }
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          status: 'error',
          data: { error: 'Access denied: Project not found or not owned by user' }
        });
      }

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({
      status: 'error',
      data: { error: 'Authorization check failed' }
    });
  }
}

/**
 * Require admin role
 */
export async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        data: { error: 'Authentication required' }
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_admin) {
        return res.status(403).json({
          status: 'error',
          data: { error: 'Admin access required' }
        });
      }

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({
      status: 'error',
      data: { error: 'Admin authorization check failed' }
    });
  }
}

/**
 * Require access to a specific resource
 */
export async function requireAccess(resourceType) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          data: { error: 'Authentication required' }
        });
      }

      // For now, just check if user exists and is active
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, is_active FROM users WHERE id = $1',
          [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
          return res.status(403).json({
            status: 'error',
            data: { error: 'Access denied: User not found or inactive' }
          });
        }

        next();
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Access authorization error:', error);
      res.status(500).json({
        status: 'error',
        data: { error: 'Access authorization check failed' }
      });
    }
  };
}

/**
 * Check if user has permission for wallet operations
 */
export async function requireWalletAccess(req, res, next) {
  try {
    const { projectId, walletId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        data: { error: 'Authentication required' }
      });
    }

    const client = await pool.connect();
    try {
      // Check if user owns the project that contains the wallet
      const result = await client.query(`
        SELECT w.id 
        FROM wallets w
        JOIN projects p ON w.project_id = p.id
        WHERE w.id = $1 AND p.id = $2 AND p.user_id = $3
      `, [walletId, projectId, userId]);

      if (result.rows.length === 0) {
        return res.status(403).json({
          status: 'error',
          data: { error: 'Access denied: Wallet not found or not accessible' }
        });
      }

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Wallet authorization error:', error);
    res.status(500).json({
      status: 'error',
      data: { error: 'Wallet authorization check failed' }
    });
  }
}