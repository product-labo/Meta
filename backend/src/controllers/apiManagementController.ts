import { Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';

export class ApiManagementController {
  constructor(private db: Pool) {}

  // GET /api/keys
  async getApiKeys(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      const query = `
        SELECT 
          id,
          name,
          key_prefix,
          status,
          created_at,
          last_used_at,
          usage_count,
          rate_limit,
          allowed_origins,
          permissions,
          expires_at
        FROM api_keys 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [userId]);
      
      res.json({
        success: true,
        data: {
          keys: result.rows,
          total: result.rows.length,
          active_keys: result.rows.filter(k => k.status === 'active').length
        }
      });
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch API keys' });
    }
  }

  // POST /api/keys
  async createApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { 
        name, 
        permissions = ['read'], 
        rate_limit = 1000, 
        allowed_origins = [], 
        expires_in_days 
      } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'API key name is required' });
      }

      // Generate API key
      const apiKey = this.generateApiKey();
      const keyPrefix = apiKey.substring(0, 8);
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      // Calculate expiration date
      const expiresAt = expires_in_days ? 
        new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000) : null;

      const query = `
        INSERT INTO api_keys (
          user_id, name, key_hash, key_prefix, status, 
          permissions, rate_limit, allowed_origins, expires_at,
          created_at, usage_count
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, NOW(), 0)
        RETURNING id, name, key_prefix, status, created_at, permissions, rate_limit
      `;
      
      const result = await this.db.query(query, [
        userId, name, keyHash, keyPrefix, JSON.stringify(permissions),
        rate_limit, JSON.stringify(allowed_origins), expiresAt
      ]);

      res.status(201).json({
        success: true,
        data: {
          ...result.rows[0],
          api_key: apiKey, // Only shown once during creation
          warning: 'Store this API key securely. It will not be shown again.'
        }
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({ success: false, error: 'Failed to create API key' });
    }
  }

  // DELETE /api/keys/:id
  async deleteApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const query = `
        DELETE FROM api_keys 
        WHERE id = $1 AND user_id = $2
        RETURNING id, name
      `;
      
      const result = await this.db.query(query, [id, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'API key not found' });
      }

      res.json({
        success: true,
        message: `API key "${result.rows[0].name}" deleted successfully`
      });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete API key' });
    }
  }

  // PUT /api/keys/:id/status
  async updateApiKeyStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status. Must be active, inactive, or suspended' 
        });
      }

      const query = `
        UPDATE api_keys 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING id, name, status, updated_at
      `;
      
      const result = await this.db.query(query, [status, id, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'API key not found' });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: `API key status updated to ${status}`
      });
    } catch (error) {
      console.error('Update API key status error:', error);
      res.status(500).json({ success: false, error: 'Failed to update API key status' });
    }
  }

  // GET /api/keys/:id/usage
  async getApiKeyUsage(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { timeframe = '7d' } = req.query;

      // Get API key info
      const keyQuery = `
        SELECT id, name, usage_count, rate_limit, last_used_at, created_at
        FROM api_keys 
        WHERE id = $1 AND user_id = $2
      `;
      
      const keyResult = await this.db.query(keyQuery, [id, userId]);

      if (keyResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'API key not found' });
      }

      // Get usage analytics
      const usageQuery = `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          COUNT(*) as requests,
          COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
          AVG(response_time_ms) as avg_response_time
        FROM api_usage_logs 
        WHERE api_key_id = $1 
          AND timestamp >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days'}'
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY date DESC
      `;
      
      const usageResult = await this.db.query(usageQuery, [id]);

      // Get endpoint usage
      const endpointQuery = `
        SELECT 
          endpoint,
          method,
          COUNT(*) as requests,
          AVG(response_time_ms) as avg_response_time
        FROM api_usage_logs 
        WHERE api_key_id = $1 
          AND timestamp >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : '30 days'}'
        GROUP BY endpoint, method
        ORDER BY requests DESC
        LIMIT 10
      `;
      
      const endpointResult = await this.db.query(endpointQuery, [id]);

      const keyInfo = keyResult.rows[0];
      const totalRequests = usageResult.rows.reduce((sum, row) => sum + parseInt(row.requests), 0);
      const successfulRequests = usageResult.rows.reduce((sum, row) => sum + parseInt(row.successful_requests), 0);

      res.json({
        success: true,
        data: {
          key_info: keyInfo,
          usage_summary: {
            total_requests: totalRequests,
            successful_requests: successfulRequests,
            failed_requests: totalRequests - successfulRequests,
            success_rate: totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0,
            rate_limit_utilization: ((totalRequests / keyInfo.rate_limit) * 100).toFixed(2)
          },
          daily_usage: usageResult.rows,
          top_endpoints: endpointResult.rows,
          timeframe
        }
      });
    } catch (error) {
      console.error('Get API key usage error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch API key usage' });
    }
  }

  // GET /api/keys/limits
  async getApiKeyLimits(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Get user's subscription/plan info
      const userQuery = `
        SELECT 
          subscription_tier,
          api_key_limit,
          rate_limit_per_key,
          monthly_request_limit
        FROM users 
        WHERE id = $1
      `;
      
      const userResult = await this.db.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Get current usage
      const currentUsageQuery = `
        SELECT 
          COUNT(*) as active_keys,
          SUM(usage_count) as total_requests_this_month
        FROM api_keys 
        WHERE user_id = $1 AND status = 'active'
      `;
      
      const usageResult = await this.db.query(currentUsageQuery, [userId]);

      const userInfo = userResult.rows[0];
      const currentUsage = usageResult.rows[0];

      // Default limits for free tier
      const limits = {
        api_key_limit: userInfo.api_key_limit || 3,
        rate_limit_per_key: userInfo.rate_limit_per_key || 1000,
        monthly_request_limit: userInfo.monthly_request_limit || 10000,
        subscription_tier: userInfo.subscription_tier || 'free'
      };

      res.json({
        success: true,
        data: {
          limits,
          current_usage: {
            active_keys: parseInt(currentUsage.active_keys || '0'),
            total_requests_this_month: parseInt(currentUsage.total_requests_this_month || '0')
          },
          available: {
            keys_remaining: Math.max(0, limits.api_key_limit - parseInt(currentUsage.active_keys || '0')),
            requests_remaining: Math.max(0, limits.monthly_request_limit - parseInt(currentUsage.total_requests_this_month || '0'))
          },
          upgrade_benefits: this.getUpgradeBenefits(limits.subscription_tier)
        }
      });
    } catch (error) {
      console.error('Get API key limits error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch API key limits' });
    }
  }

  // POST /api/keys/regenerate
  async regenerateApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { key_id } = req.body;

      if (!key_id) {
        return res.status(400).json({ success: false, error: 'API key ID is required' });
      }

      // Verify ownership
      const checkQuery = `
        SELECT id, name FROM api_keys 
        WHERE id = $1 AND user_id = $2
      `;
      
      const checkResult = await this.db.query(checkQuery, [key_id, userId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'API key not found' });
      }

      // Generate new API key
      const newApiKey = this.generateApiKey();
      const keyPrefix = newApiKey.substring(0, 8);
      const keyHash = crypto.createHash('sha256').update(newApiKey).digest('hex');

      const updateQuery = `
        UPDATE api_keys 
        SET key_hash = $1, key_prefix = $2, updated_at = NOW(), usage_count = 0
        WHERE id = $3 AND user_id = $4
        RETURNING id, name, key_prefix, status, updated_at
      `;
      
      const result = await this.db.query(updateQuery, [keyHash, keyPrefix, key_id, userId]);

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          api_key: newApiKey, // Only shown once
          warning: 'Store this new API key securely. The old key is now invalid.'
        }
      });
    } catch (error) {
      console.error('Regenerate API key error:', error);
      res.status(500).json({ success: false, error: 'Failed to regenerate API key' });
    }
  }

  // GET /api/keys/analytics
  async getApiKeysAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { timeframe = '30d' } = req.query;

      // Overall API usage analytics
      const analyticsQuery = `
        SELECT 
          ak.id,
          ak.name,
          ak.status,
          COUNT(aul.id) as total_requests,
          COUNT(CASE WHEN aul.status_code >= 200 AND aul.status_code < 300 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) as failed_requests,
          AVG(aul.response_time_ms) as avg_response_time,
          MAX(aul.timestamp) as last_used
        FROM api_keys ak
        LEFT JOIN api_usage_logs aul ON ak.id = aul.api_key_id 
          AND aul.timestamp >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days'}'
        WHERE ak.user_id = $1
        GROUP BY ak.id, ak.name, ak.status
        ORDER BY total_requests DESC
      `;
      
      const analyticsResult = await this.db.query(analyticsQuery, [userId]);

      // Daily usage trends
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('day', aul.timestamp) as date,
          COUNT(*) as requests,
          COUNT(DISTINCT aul.api_key_id) as active_keys,
          AVG(aul.response_time_ms) as avg_response_time
        FROM api_usage_logs aul
        JOIN api_keys ak ON aul.api_key_id = ak.id
        WHERE ak.user_id = $1 
          AND aul.timestamp >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : '30 days'}'
        GROUP BY DATE_TRUNC('day', aul.timestamp)
        ORDER BY date DESC
      `;
      
      const trendsResult = await this.db.query(trendsQuery, [userId]);

      // Top endpoints across all keys
      const endpointsQuery = `
        SELECT 
          aul.endpoint,
          aul.method,
          COUNT(*) as requests,
          AVG(aul.response_time_ms) as avg_response_time,
          COUNT(CASE WHEN aul.status_code >= 400 THEN 1 END) as error_count
        FROM api_usage_logs aul
        JOIN api_keys ak ON aul.api_key_id = ak.id
        WHERE ak.user_id = $1 
          AND aul.timestamp >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : '30 days'}'
        GROUP BY aul.endpoint, aul.method
        ORDER BY requests DESC
        LIMIT 15
      `;
      
      const endpointsResult = await this.db.query(endpointsQuery, [userId]);

      const totalRequests = analyticsResult.rows.reduce((sum, row) => sum + parseInt(row.total_requests || '0'), 0);
      const totalSuccessful = analyticsResult.rows.reduce((sum, row) => sum + parseInt(row.successful_requests || '0'), 0);

      res.json({
        success: true,
        data: {
          summary: {
            total_api_keys: analyticsResult.rows.length,
            active_keys: analyticsResult.rows.filter(k => k.status === 'active').length,
            total_requests: totalRequests,
            success_rate: totalRequests > 0 ? ((totalSuccessful / totalRequests) * 100).toFixed(2) : 0,
            avg_response_time: analyticsResult.rows.reduce((sum, row) => sum + parseFloat(row.avg_response_time || '0'), 0) / analyticsResult.rows.length
          },
          key_performance: analyticsResult.rows,
          usage_trends: trendsResult.rows,
          top_endpoints: endpointsResult.rows,
          timeframe
        }
      });
    } catch (error) {
      console.error('Get API keys analytics error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch API keys analytics' });
    }
  }

  // Helper methods
  private generateApiKey(): string {
    const prefix = 'mk_'; // MetaGauge key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }

  private getUpgradeBenefits(currentTier: string) {
    const benefits = {
      free: {
        next_tier: 'pro',
        benefits: [
          'Increase API key limit from 3 to 10',
          'Increase rate limit from 1,000 to 10,000 requests/hour',
          'Increase monthly limit from 10,000 to 100,000 requests',
          'Priority support',
          'Advanced analytics'
        ]
      },
      pro: {
        next_tier: 'enterprise',
        benefits: [
          'Unlimited API keys',
          'Custom rate limits',
          'Unlimited monthly requests',
          'Dedicated support',
          'Custom integrations'
        ]
      },
      enterprise: {
        next_tier: null,
        benefits: ['You have the highest tier available']
      }
    };

    return benefits[currentTier as keyof typeof benefits] || benefits.free;
  }
}