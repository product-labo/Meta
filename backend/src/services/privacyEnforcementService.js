/**
 * Privacy Enforcement Service
 * Handles data privacy and access control for multi-chain wallet indexing
 */

import { pool } from '../config/appConfig.js';

class PrivacyEnforcementService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-for-dev';
  }

  /**
   * Enforce data isolation between projects
   */
  async enforceProjectIsolation(userId, projectId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Sanitize sensitive data from responses
   */
  sanitizeWalletData(walletData, userRole = 'user') {
    if (!walletData) return null;

    const sanitized = { ...walletData };

    // Always remove internal fields
    delete sanitized.internal_notes;
    delete sanitized.created_by_system;

    // For non-admin users, limit sensitive information
    if (userRole !== 'admin') {
      // Truncate address for display (show first 6 and last 4 characters)
      if (sanitized.address && sanitized.address.length > 10) {
        sanitized.address_display = `${sanitized.address.slice(0, 6)}...${sanitized.address.slice(-4)}`;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize transaction data
   */
  sanitizeTransactionData(transactionData, userRole = 'user') {
    if (!transactionData) return null;

    const sanitized = { ...transactionData };

    // Remove sensitive raw data for non-admin users
    if (userRole !== 'admin') {
      delete sanitized.raw_data;
      delete sanitized.internal_metadata;
    }

    return sanitized;
  }

  /**
   * Check if user can access wallet data
   */
  async canAccessWallet(userId, walletId) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT w.id 
        FROM wallets w
        JOIN projects p ON w.project_id = p.id
        WHERE w.id = $1 AND p.user_id = $2
      `, [walletId, userId]);
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Audit data access
   */
  async auditDataAccess(userId, resourceType, resourceId, action) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO audit_logs (user_id, resource_type, resource_id, action, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `, [userId, resourceType, resourceId, action]);
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Audit logging failed:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Validate data retention policies
   */
  async enforceDataRetention(projectId) {
    const client = await pool.connect();
    try {
      // Example: Delete transaction data older than 2 years for inactive projects
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

      const result = await client.query(`
        DELETE FROM wallet_transactions 
        WHERE wallet_id IN (
          SELECT id FROM wallets WHERE project_id = $1
        ) 
        AND block_timestamp < $2
        AND wallet_id IN (
          SELECT w.id FROM wallets w 
          JOIN projects p ON w.project_id = p.id 
          WHERE p.is_active = false
        )
      `, [projectId, cutoffDate]);

      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Anonymize wallet data for analytics
   */
  anonymizeWalletData(walletData) {
    if (!walletData) return null;

    return {
      id: walletData.id,
      chain: walletData.chain,
      chain_type: walletData.chain_type,
      transaction_count: walletData.total_transactions,
      event_count: walletData.total_events,
      last_activity: walletData.last_synced_at,
      // Remove identifying information
      address_hash: this.hashAddress(walletData.address)
    };
  }

  /**
   * Hash address for anonymization
   */
  hashAddress(address) {
    if (!address) return null;
    
    // Simple hash for demo - in production use proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      const char = address.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export default PrivacyEnforcementService;