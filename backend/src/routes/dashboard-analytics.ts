// =============================================================================
// PROPER DASHBOARD API ENDPOINTS
// Connect Frontend Dashboard to Our Rich Analytics Data
// =============================================================================

import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/contract-business/metrics
 * Dashboard Overview Metrics - Connect to our analytics data
 */
router.get('/metrics', async (req, res) => {
    try {
        const { chains, categories, verifiedOnly } = req.query;
        
        // Build dynamic filters
        let chainFilter = '';
        let categoryFilter = '';
        
        if (chains && chains !== 'all') {
            chainFilter = `AND 'lisk' = ANY(string_to_array('${chains}', ','))`;
        }
        
        // Get comprehensive metrics from our analytics tables
        const metricsQuery = `
            WITH overview_metrics AS (
                -- Total Projects (Smart Contracts)
                SELECT COUNT(DISTINCT contract_address) as total_projects
                FROM lisk_contracts
                WHERE 1=1 ${chainFilter}
            ),
            customer_metrics AS (
                -- Total Customers (Unique Wallets)
                SELECT COUNT(DISTINCT wallet_address) as total_customers
                FROM lisk_wallet_behavior_profiles
                WHERE total_transactions > 0
            ),
            revenue_metrics AS (
                -- Total Revenue (Transaction Volume in ETH)
                SELECT 
                    COALESCE(SUM(total_volume_eth), 0) / 1000000000000000000.0 as total_revenue_eth,
                    COUNT(*) as active_wallets
                FROM lisk_wallet_behavior_profiles
                WHERE total_volume_eth > 0
            ),
            growth_metrics AS (
                -- Growth Scores based on activity
                SELECT 
                    AVG(engagement_score) as avg_growth_score,
                    AVG(risk_score * 100) as avg_risk_score,
                    COUNT(CASE WHEN engagement_score > 50 THEN 1 END) as top_performers,
                    COUNT(CASE WHEN risk_score > 0.7 THEN 1 END) as high_risk_projects
                FROM lisk_wallet_behavior_dashboard
            ),
            health_metrics AS (
                -- Health Score based on transaction success rate
                SELECT 
                    (COUNT(CASE WHEN status = 'success' THEN 1 END)::DECIMAL / 
                     NULLIF(COUNT(*), 0) * 100) as avg_health_score
                FROM lisk_transactions
                WHERE created_at > NOW() - INTERVAL '30 days'
            )
            SELECT 
                om.total_projects,
                cm.total_customers,
                rm.total_revenue_eth as total_revenue,
                COALESCE(gm.avg_growth_score, 50) as avg_growth_score,
                COALESCE(hm.avg_health_score, 95) as avg_health_score,
                COALESCE(gm.avg_risk_score, 30) as avg_risk_score,
                COALESCE(gm.top_performers, 0) as top_performers,
                COALESCE(gm.high_risk_projects, 0) as high_risk_projects
            FROM overview_metrics om
            CROSS JOIN customer_metrics cm
            CROSS JOIN revenue_metrics rm
            LEFT JOIN growth_metrics gm ON true
            LEFT JOIN health_metrics hm ON true
        `;
        
        const result = await pool.query(metricsQuery);
        const metrics = result.rows[0];
        
        res.json({
            success: true,
            data: {
                totalProjects: parseInt(metrics.total_projects) || 0,
                totalCustomers: parseInt(metrics.total_customers) || 0,
                totalRevenue: parseFloat(metrics.total_revenue) || 0,
                avgGrowthScore: parseFloat(metrics.avg_growth_score) || 50,
                avgHealthScore: parseFloat(metrics.avg_health_score) || 95,
                avgRiskScore: parseFloat(metrics.avg_risk_score) || 30,
                topPerformers: parseInt(metrics.top_performers) || 0,
                highRiskProjects: parseInt(metrics.high_risk_projects) || 0
            }
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
 * Historical Metrics for Trend Charts
 */
router.get('/metrics/historical', async (req, res) => {
    try {
        const { days = 7, category, chainId } = req.query;
        
        const historicalQuery = `
            WITH daily_stats AS (
                SELECT 
                    DATE(created_at) as date,
                    COUNT(DISTINCT from_address) as active_users,
                    COUNT(*) as total_transactions,
                    COALESCE(SUM(value), 0) / 1000000000000000000.0 as volume_eth
                FROM lisk_transactions
                WHERE created_at >= NOW() - INTERVAL '${days} days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            ),
            token_stats AS (
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as token_transfers,
                    COUNT(DISTINCT token_address) as active_tokens
                FROM lisk_token_transfers
                WHERE created_at >= NOW() - INTERVAL '${days} days'
                GROUP BY DATE(created_at)
            )
            SELECT 
                ds.date,
                ds.active_users,
                ds.total_transactions,
                ds.volume_eth,
                COALESCE(ts.token_transfers, 0) as token_transfers,
                COALESCE(ts.active_tokens, 0) as active_tokens
            FROM daily_stats ds
            LEFT JOIN token_stats ts ON ds.date = ts.date
            ORDER BY ds.date ASC
        `;
        
        const result = await pool.query(historicalQuery);
        
        res.json({
            success: true,
            data: {
                historical: result.rows.map(row => ({
                    date: row.date,
                    activeUsers: parseInt(row.active_users),
                    totalTransactions: parseInt(row.total_transactions),
                    volumeEth: parseFloat(row.volume_eth),
                    tokenTransfers: parseInt(row.token_transfers),
                    activeTokens: parseInt(row.active_tokens)
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
 * GET /api/contract-business/projects
 * Projects Table Data with Behavioral Analytics
 */
router.get('/projects', async (req, res) => {
    try {
        const { limit = 50, category, chain, sortBy = 'activity' } = req.query;
        
        let orderBy = 'total_interactions DESC';
        if (sortBy === 'volume') orderBy = 'total_volume DESC';
        if (sortBy === 'users') orderBy = 'unique_users DESC';
        if (sortBy === 'growth') orderBy = 'growth_score DESC';
        
        const projectsQuery = `
            WITH contract_analytics AS (
                SELECT 
                    c.contract_address,
                    c.contract_name,
                    cc.category,
                    COUNT(DISTINCT wi.wallet_address) as unique_users,
                    COUNT(wi.interaction_id) as total_interactions,
                    COALESCE(SUM(tt.amount), 0) as total_volume,
                    COUNT(DISTINCT DATE(wi.created_at)) as active_days,
                    MAX(wi.created_at) as last_activity,
                    
                    -- Growth Score Calculation
                    CASE 
                        WHEN COUNT(DISTINCT wi.wallet_address) > 100 THEN 90
                        WHEN COUNT(DISTINCT wi.wallet_address) > 50 THEN 80
                        WHEN COUNT(DISTINCT wi.wallet_address) > 20 THEN 70
                        WHEN COUNT(DISTINCT wi.wallet_address) > 10 THEN 60
                        ELSE 40
                    END as growth_score,
                    
                    -- Health Score (based on recent activity)
                    CASE 
                        WHEN MAX(wi.created_at) > NOW() - INTERVAL '1 day' THEN 95
                        WHEN MAX(wi.created_at) > NOW() - INTERVAL '7 days' THEN 85
                        WHEN MAX(wi.created_at) > NOW() - INTERVAL '30 days' THEN 70
                        ELSE 50
                    END as health_score
                    
                FROM lisk_contracts c
                LEFT JOIN lisk_contract_categories cc ON c.contract_address = cc.contract_address
                LEFT JOIN lisk_wallet_interactions wi ON c.contract_address = wi.contract_address
                LEFT JOIN lisk_token_transfers tt ON wi.tx_hash = tt.tx_hash
                GROUP BY c.contract_address, c.contract_name, cc.category
            )
            SELECT 
                contract_address,
                COALESCE(contract_name, 'Unknown Contract') as business_name,
                COALESCE(category, 'Other') as category,
                'lisk' as chain_name,
                unique_users as customers,
                total_interactions,
                (total_volume / 1000000000000000000.0) as revenue_eth,
                growth_score,
                health_score,
                (growth_score * 0.4 + health_score * 0.6) as overall_score,
                active_days,
                last_activity
            FROM contract_analytics
            WHERE unique_users > 0
            ORDER BY ${orderBy}
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
                    revenue: row.revenue_eth,
                    growth_score: row.growth_score,
                    health_score: row.health_score,
                    overall_score: Math.round(row.overall_score),
                    active_days: row.active_days,
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

/**
 * GET /api/contract-business/competitive
 * Competitive Analysis Data
 */
router.get('/competitive', async (req, res) => {
    try {
        const competitiveQuery = `
            WITH chain_comparison AS (
                SELECT 
                    'lisk' as chain,
                    COUNT(DISTINCT c.contract_address) as total_projects,
                    COUNT(DISTINCT wi.wallet_address) as total_users,
                    COUNT(wi.interaction_id) as total_interactions,
                    COALESCE(SUM(tt.amount), 0) / 1000000000000000000.0 as total_volume
                FROM lisk_contracts c
                LEFT JOIN lisk_wallet_interactions wi ON c.contract_address = wi.contract_address
                LEFT JOIN lisk_token_transfers tt ON wi.tx_hash = tt.tx_hash
            ),
            category_breakdown AS (
                SELECT 
                    COALESCE(cc.category, 'Other') as category,
                    COUNT(DISTINCT c.contract_address) as project_count,
                    COUNT(DISTINCT wi.wallet_address) as user_count,
                    AVG(
                        CASE 
                            WHEN COUNT(DISTINCT wi.wallet_address) > 50 THEN 80
                            WHEN COUNT(DISTINCT wi.wallet_address) > 20 THEN 70
                            WHEN COUNT(DISTINCT wi.wallet_address) > 10 THEN 60
                            ELSE 40
                        END
                    ) as avg_growth_score
                FROM lisk_contracts c
                LEFT JOIN lisk_contract_categories cc ON c.contract_address = cc.contract_address
                LEFT JOIN lisk_wallet_interactions wi ON c.contract_address = wi.contract_address
                GROUP BY cc.category
            )
            SELECT 
                (SELECT json_agg(row_to_json(chain_comparison)) FROM chain_comparison) as chain_data,
                (SELECT json_agg(row_to_json(category_breakdown)) FROM category_breakdown) as category_data
        `;
        
        const result = await pool.query(competitiveQuery);
        const data = result.rows[0];
        
        res.json({
            success: true,
            data: {
                chainComparison: data.chain_data || [],
                categoryBreakdown: data.category_data || []
            }
        });
        
    } catch (error) {
        console.error('Error fetching competitive analysis:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch competitive analysis',
            error: error.message
        });
    }
});

export default router;
