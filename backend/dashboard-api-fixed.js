// =============================================================================
// FIXED DASHBOARD API ENDPOINTS
// Simple, working endpoints for dashboard data
// =============================================================================

const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Database connection
const pool = new Pool({
  user: 'david_user',
  host: 'localhost',
  database: 'david',
  password: 'Davidsoyaya@1015',
  port: 5432,
});

/**
 * GET /api/contract-business/metrics
 * Dashboard Overview Metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        // Get basic metrics from our analytics data
        const metricsQueries = [
            // Total projects (contracts)
            'SELECT COUNT(*) as total_projects FROM lisk_contracts',
            
            // Total customers (wallets with behavior profiles)
            'SELECT COUNT(*) as total_customers FROM lisk_wallet_behavior_profiles WHERE total_transactions > 0',
            
            // Total revenue (sum of transaction volumes in ETH)
            'SELECT COALESCE(SUM(total_volume_eth), 0) / 1000000000000000000.0 as total_revenue FROM lisk_wallet_behavior_profiles',
            
            // Average engagement score
            'SELECT COALESCE(AVG(engagement_score), 50) as avg_growth_score FROM lisk_wallet_behavior_dashboard',
            
            // Top performers (high engagement wallets)
            'SELECT COUNT(*) as top_performers FROM lisk_wallet_behavior_dashboard WHERE engagement_score > 50',
            
            // High risk projects (high risk score wallets)
            'SELECT COUNT(*) as high_risk FROM lisk_wallet_behavior_dashboard WHERE risk_score > 0.7'
        ];
        
        const results = await Promise.all(metricsQueries.map(query => pool.query(query)));
        
        const metrics = {
            totalProjects: parseInt(results[0].rows[0].total_projects) || 0,
            totalCustomers: parseInt(results[1].rows[0].total_customers) || 0,
            totalRevenue: parseFloat(results[2].rows[0].total_revenue) || 0,
            avgGrowthScore: parseFloat(results[3].rows[0].avg_growth_score) || 50,
            avgHealthScore: 95, // Default health score
            avgRiskScore: 30,   // Default risk score
            topPerformers: parseInt(results[4].rows[0].top_performers) || 0,
            highRiskProjects: parseInt(results[5].rows[0].high_risk) || 0
        };
        
        res.json({
            success: true,
            data: metrics
        });
        
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard metrics',
            error: error.message
        });
    }
});

/**
 * GET /api/contract-business/metrics/historical
 * Historical metrics for trend charts
 */
router.get('/metrics/historical', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const historicalQuery = `
            SELECT 
                date,
                total_transactions,
                unique_addresses as active_users,
                total_gas_used,
                0 as volume_eth
            FROM lisk_daily_metrics
            ORDER BY date DESC
            LIMIT $1
        `;
        
        const result = await pool.query(historicalQuery, [days]);
        
        res.json({
            success: true,
            data: {
                historical: result.rows.map(row => ({
                    date: row.date,
                    activeUsers: parseInt(row.active_users) || 0,
                    totalTransactions: parseInt(row.total_transactions) || 0,
                    volumeEth: parseFloat(row.volume_eth) || 0,
                    tokenTransfers: 0,
                    activeTokens: 0
                }))
            }
        });
        
    } catch (error) {
        console.error('Error fetching historical metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch historical metrics',
            error: error.message
        });
    }
});

/**
 * GET /api/contract-business/ (projects list)
 * Enhanced to use our analytics data
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, sortBy = 'activity' } = req.query;
        
        const projectsQuery = `
            SELECT 
                c.contract_address,
                COALESCE(c.contract_name, 'Unknown Contract') as business_name,
                COALESCE(cc.category, 'Other') as category,
                'lisk' as chain_name,
                COUNT(DISTINCT wi.wallet_address) as customers,
                COUNT(wi.interaction_id) as total_interactions,
                0 as revenue,
                CASE 
                    WHEN COUNT(DISTINCT wi.wallet_address) > 50 THEN 80
                    WHEN COUNT(DISTINCT wi.wallet_address) > 20 THEN 70
                    WHEN COUNT(DISTINCT wi.wallet_address) > 10 THEN 60
                    ELSE 40
                END as growth_score,
                85 as health_score,
                MAX(wi.created_at) as last_activity
            FROM lisk_contracts c
            LEFT JOIN lisk_contract_categories cc ON c.contract_address = cc.contract_address
            LEFT JOIN lisk_wallet_interactions wi ON c.contract_address = wi.contract_address
            GROUP BY c.contract_address, c.contract_name, cc.category
            HAVING COUNT(wi.interaction_id) > 0
            ORDER BY COUNT(wi.interaction_id) DESC
            LIMIT $1
        `;
        
        const result = await pool.query(projectsQuery, [limit]);
        
        res.json({
            success: true,
            data: {
                businesses: result.rows.map(row => ({
                    contract_address: row.contract_address,
                    business_name: row.business_name,
                    category: row.category,
                    chain: row.chain_name,
                    customers: row.customers,
                    interactions: row.total_interactions,
                    revenue: row.revenue,
                    growth_score: row.growth_score,
                    health_score: row.health_score,
                    last_activity: row.last_activity
                }))
            }
        });
        
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects',
            error: error.message
        });
    }
});

module.exports = router;
