const express = require('express');
const { Client } = require('pg');
const router = express.Router();

// Database connection helper
const getDbClient = () => {
    return new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });
};

/**
 * GET /api/business-intelligence/overview
 * Get comprehensive business intelligence overview for investors
 */
router.get('/overview', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { timeRange = '30d' } = req.query;
        
        // Time range mapping
        const timeRangeMap = {
            '7d': '7 days',
            '30d': '30 days',
            '90d': '90 days',
            '1y': '1 year'
        };
        
        const interval = timeRangeMap[timeRange] || '30 days';
        
        // Core Business Metrics
        const metricsQuery = `
            SELECT 
                -- User Metrics
                COUNT(DISTINCT td.from_address) as total_unique_users,
                COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '7 days' THEN td.from_address END) as weekly_active_users,
                COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '1 day' THEN td.from_address END) as daily_active_users,
                
                -- Transaction Metrics
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_transactions,
                ROUND(AVG(td.gas_used), 0) as avg_gas_used,
                
                -- Financial Metrics
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                SUM(td.gas_used * td.gas_price) / 1e18 as total_fees_paid_eth,
                
                -- Growth Metrics (comparing to previous period)
                (COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '${interval}' THEN td.from_address END) - 
                 COUNT(DISTINCT CASE WHEN td.captured_at BETWEEN NOW() - INTERVAL '${interval}' * 2 AND NOW() - INTERVAL '${interval}' THEN td.from_address END)) * 100.0 / 
                 NULLIF(COUNT(DISTINCT CASE WHEN td.captured_at BETWEEN NOW() - INTERVAL '${interval}' * 2 AND NOW() - INTERVAL '${interval}' THEN td.from_address END), 0) as user_growth_rate,
                
                COUNT(DISTINCT bci.protocol_name) as active_protocols,
                COUNT(DISTINCT bci.category_id) as active_categories
                
            FROM mc_transaction_details td
            LEFT JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
            WHERE td.captured_at > NOW() - INTERVAL '${interval}'
        `;
        
        const metricsResult = await client.query(metricsQuery);
        const metrics = metricsResult.rows[0];
        
        // Category Breakdown
        const categoryQuery = `
            SELECT 
                bcc.category_name,
                bcc.subcategory,
                COUNT(DISTINCT bci.contract_address) as contract_count,
                COUNT(DISTINCT td.from_address) as unique_users,
                COUNT(*) as total_transactions,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                AVG(bci.risk_score) as avg_risk_score
            FROM bi_contract_categories bcc
            JOIN bi_contract_index bci ON bcc.id = bci.category_id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '${interval}'
            GROUP BY bcc.category_name, bcc.subcategory
            ORDER BY total_transactions DESC
        `;
        
        const categoryResult = await client.query(categoryQuery);
        
        // Chain Distribution
        const chainQuery = `
            SELECT 
                c.name as chain_name,
                COUNT(DISTINCT td.from_address) as unique_users,
                COUNT(*) as total_transactions,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                COUNT(DISTINCT bci.contract_address) as active_contracts
            FROM mc_chains c
            LEFT JOIN mc_transaction_details td ON c.id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '${interval}'
            LEFT JOIN bi_contract_index bci ON c.id = bci.chain_id
            GROUP BY c.id, c.name
            ORDER BY total_transactions DESC
        `;
        
        const chainResult = await client.query(chainQuery);
        
        // Top Protocols by Traction
        const protocolQuery = `
            SELECT 
                bci.protocol_name,
                bcc.category_name,
                COUNT(DISTINCT td.from_address) as unique_users,
                COUNT(*) as total_transactions,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                AVG(bci.risk_score) as risk_score,
                COUNT(DISTINCT bci.contract_address) as contract_count
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '${interval}'
            GROUP BY bci.protocol_name, bcc.category_name
            HAVING COUNT(*) > 0
            ORDER BY unique_users DESC, total_transactions DESC
            LIMIT 20
        `;
        
        const protocolResult = await client.query(protocolQuery);
        
        // Calculate key business insights
        const successRate = metrics.total_transactions > 0 
            ? ((metrics.successful_transactions / metrics.total_transactions) * 100).toFixed(2)
            : 0;
            
        const userStickiness = metrics.weekly_active_users > 0 
            ? ((metrics.daily_active_users / metrics.weekly_active_users) * 100).toFixed(2)
            : 0;
        
        res.json({
            success: true,
            data: {
                overview: {
                    ...metrics,
                    success_rate_percent: parseFloat(successRate),
                    user_stickiness_percent: parseFloat(userStickiness),
                    avg_transaction_value_eth: metrics.total_volume_eth / metrics.total_transactions || 0,
                    revenue_per_user_eth: metrics.total_fees_paid_eth / metrics.total_unique_users || 0
                },
                category_breakdown: categoryResult.rows,
                chain_distribution: chainResult.rows,
                top_protocols: protocolResult.rows,
                timeRange,
                generated_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error fetching BI overview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business intelligence overview',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/business-intelligence/traction/:category
 * Get detailed traction metrics for a specific category (DeFi, NFT, DAO, etc.)
 */
router.get('/traction/:category', async (req, res) => {
    const client = getDbClient();
    const { category } = req.params;
    
    try {
        await client.connect();
        
        const { timeRange = '30d', subcategory } = req.query;
        
        let whereClause = 'WHERE bcc.category_name = $1';
        let queryParams = [category];
        let paramIndex = 2;
        
        if (subcategory) {
            whereClause += ` AND bcc.subcategory = $${paramIndex}`;
            queryParams.push(subcategory);
            paramIndex++;
        }
        
        // Detailed traction analysis
        const tractionQuery = `
            WITH daily_metrics AS (
                SELECT 
                    DATE(td.captured_at) as date,
                    COUNT(DISTINCT td.from_address) as daily_active_users,
                    COUNT(*) as daily_transactions,
                    SUM(td.value::numeric) / 1e18 as daily_volume_eth,
                    COUNT(DISTINCT CASE WHEN user_first_tx.first_tx_date = DATE(td.captured_at) THEN td.from_address END) as new_users
                FROM mc_transaction_details td
                JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
                LEFT JOIN (
                    SELECT 
                        from_address,
                        MIN(DATE(captured_at)) as first_tx_date
                    FROM mc_transaction_details
                    GROUP BY from_address
                ) user_first_tx ON td.from_address = user_first_tx.from_address
                ${whereClause}
                AND td.captured_at > NOW() - INTERVAL '${timeRange === '7d' ? '7 days' : timeRange === '90d' ? '90 days' : '30 days'}'
                GROUP BY DATE(td.captured_at)
                ORDER BY date DESC
            ),
            cohort_analysis AS (
                SELECT 
                    DATE_TRUNC('week', td.captured_at) as week_start,
                    COUNT(DISTINCT td.from_address) as weekly_active_users,
                    COUNT(DISTINCT CASE WHEN user_first_tx.first_tx_date >= DATE_TRUNC('week', td.captured_at) 
                                        AND user_first_tx.first_tx_date < DATE_TRUNC('week', td.captured_at) + INTERVAL '7 days' 
                                        THEN td.from_address END) as new_users_cohort,
                    AVG(td.gas_used * td.gas_price) / 1e18 as avg_transaction_fee_eth
                FROM mc_transaction_details td
                JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
                LEFT JOIN (
                    SELECT 
                        from_address,
                        MIN(DATE(captured_at)) as first_tx_date
                    FROM mc_transaction_details
                    GROUP BY from_address
                ) user_first_tx ON td.from_address = user_first_tx.from_address
                ${whereClause}
                AND td.captured_at > NOW() - INTERVAL '12 weeks'
                GROUP BY DATE_TRUNC('week', td.captured_at)
                ORDER BY week_start DESC
            ),
            protocol_performance AS (
                SELECT 
                    bci.protocol_name,
                    COUNT(DISTINCT td.from_address) as unique_users,
                    COUNT(*) as total_transactions,
                    SUM(td.value::numeric) / 1e18 as total_volume_eth,
                    AVG(bci.risk_score) as avg_risk_score,
                    COUNT(DISTINCT bci.contract_address) as contract_count,
                    -- User retention (users who made >1 transaction)
                    COUNT(DISTINCT CASE WHEN user_tx_count.tx_count > 1 THEN td.from_address END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT td.from_address), 0) as user_retention_rate
                FROM mc_transaction_details td
                JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
                LEFT JOIN (
                    SELECT 
                        from_address,
                        COUNT(*) as tx_count
                    FROM mc_transaction_details
                    GROUP BY from_address
                ) user_tx_count ON td.from_address = user_tx_count.from_address
                ${whereClause}
                AND td.captured_at > NOW() - INTERVAL '${timeRange === '7d' ? '7 days' : timeRange === '90d' ? '90 days' : '30 days'}'
                GROUP BY bci.protocol_name
                ORDER BY unique_users DESC
            )
            SELECT 
                (SELECT json_agg(dm ORDER BY dm.date DESC) FROM daily_metrics dm) as daily_metrics,
                (SELECT json_agg(ca ORDER BY ca.week_start DESC) FROM cohort_analysis ca) as cohort_analysis,
                (SELECT json_agg(pp ORDER BY pp.unique_users DESC) FROM protocol_performance pp) as protocol_performance
        `;
        
        const result = await client.query(tractionQuery, queryParams);
        const data = result.rows[0];
        
        // Calculate growth rates and key insights
        const dailyMetrics = data.daily_metrics || [];
        const cohortAnalysis = data.cohort_analysis || [];
        const protocolPerformance = data.protocol_performance || [];
        
        // Growth calculations
        let userGrowthRate = 0;
        let volumeGrowthRate = 0;
        
        if (dailyMetrics.length >= 2) {
            const recent = dailyMetrics[0];
            const previous = dailyMetrics[Math.floor(dailyMetrics.length / 2)];
            
            if (previous.daily_active_users > 0) {
                userGrowthRate = ((recent.daily_active_users - previous.daily_active_users) / previous.daily_active_users * 100);
            }
            
            if (previous.daily_volume_eth > 0) {
                volumeGrowthRate = ((recent.daily_volume_eth - previous.daily_volume_eth) / previous.daily_volume_eth * 100);
            }
        }
        
        // Market insights
        const totalUsers = protocolPerformance.reduce((sum, p) => sum + (p.unique_users || 0), 0);
        const totalVolume = protocolPerformance.reduce((sum, p) => sum + (parseFloat(p.total_volume_eth) || 0), 0);
        const avgRetentionRate = protocolPerformance.length > 0 
            ? protocolPerformance.reduce((sum, p) => sum + (p.user_retention_rate || 0), 0) / protocolPerformance.length
            : 0;
        
        res.json({
            success: true,
            data: {
                category,
                subcategory: subcategory || 'all',
                summary: {
                    total_users: totalUsers,
                    total_volume_eth: totalVolume,
                    protocol_count: protocolPerformance.length,
                    avg_retention_rate: avgRetentionRate.toFixed(2),
                    user_growth_rate: userGrowthRate.toFixed(2),
                    volume_growth_rate: volumeGrowthRate.toFixed(2)
                },
                daily_metrics: dailyMetrics,
                cohort_analysis: cohortAnalysis,
                protocol_performance: protocolPerformance,
                timeRange
            }
        });
        
    } catch (error) {
        console.error('Error fetching traction metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch traction metrics',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/business-intelligence/cohorts
 * Get cohort analysis for user retention and activation
 */
router.get('/cohorts', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { category, chainId, weeks = 12 } = req.query;
        
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;
        
        if (category) {
            whereClause += `AND bcc.category_name = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }
        
        if (chainId) {
            whereClause += `AND td.chain_id = $${paramIndex}`;
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }
        
        const cohortQuery = `
            WITH user_first_week AS (
                SELECT 
                    td.from_address,
                    DATE_TRUNC('week', MIN(td.captured_at)) as cohort_week,
                    bcc.category_name,
                    td.chain_id
                FROM mc_transaction_details td
                LEFT JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                LEFT JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
                WHERE td.captured_at > NOW() - INTERVAL '${weeks} weeks'
                ${whereClause}
                GROUP BY td.from_address, bcc.category_name, td.chain_id
            ),
            user_activity_weeks AS (
                SELECT 
                    td.from_address,
                    DATE_TRUNC('week', td.captured_at) as activity_week,
                    COUNT(*) as transactions,
                    SUM(td.value::numeric) / 1e18 as volume_eth
                FROM mc_transaction_details td
                LEFT JOIN bi_contract_index bci ON td.to_address = bci.contract_address AND td.chain_id = bci.chain_id
                LEFT JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
                WHERE td.captured_at > NOW() - INTERVAL '${weeks} weeks'
                ${whereClause}
                GROUP BY td.from_address, DATE_TRUNC('week', td.captured_at)
            ),
            cohort_table AS (
                SELECT 
                    ufw.cohort_week,
                    uaw.activity_week,
                    EXTRACT(WEEK FROM uaw.activity_week) - EXTRACT(WEEK FROM ufw.cohort_week) as week_number,
                    COUNT(DISTINCT ufw.from_address) as cohort_size,
                    COUNT(DISTINCT uaw.from_address) as active_users,
                    SUM(uaw.transactions) as total_transactions,
                    SUM(uaw.volume_eth) as total_volume_eth
                FROM user_first_week ufw
                LEFT JOIN user_activity_weeks uaw ON ufw.from_address = uaw.from_address
                WHERE uaw.activity_week >= ufw.cohort_week
                GROUP BY ufw.cohort_week, uaw.activity_week
                ORDER BY ufw.cohort_week DESC, uaw.activity_week
            )
            SELECT 
                cohort_week,
                week_number,
                cohort_size,
                active_users,
                CASE WHEN cohort_size > 0 THEN (active_users * 100.0 / cohort_size) ELSE 0 END as retention_rate,
                total_transactions,
                total_volume_eth,
                CASE WHEN active_users > 0 THEN (total_transactions::decimal / active_users) ELSE 0 END as avg_transactions_per_user
            FROM cohort_table
            WHERE week_number >= 0 AND week_number <= 12
            ORDER BY cohort_week DESC, week_number
        `;
        
        const result = await client.query(cohortQuery, queryParams);
        
        // Group by cohort week for easier frontend consumption
        const cohortData = {};
        result.rows.forEach(row => {
            const cohortKey = row.cohort_week.toISOString().split('T')[0];
            if (!cohortData[cohortKey]) {
                cohortData[cohortKey] = {
                    cohort_week: cohortKey,
                    cohort_size: row.cohort_size,
                    weekly_retention: []
                };
            }
            
            cohortData[cohortKey].weekly_retention.push({
                week: row.week_number,
                active_users: row.active_users,
                retention_rate: parseFloat(row.retention_rate).toFixed(2),
                avg_transactions_per_user: parseFloat(row.avg_transactions_per_user).toFixed(2),
                total_volume_eth: parseFloat(row.total_volume_eth || 0).toFixed(4)
            });
        });
        
        res.json({
            success: true,
            data: {
                cohorts: Object.values(cohortData),
                filters: {
                    category,
                    chainId: chainId ? parseInt(chainId) : null,
                    weeks: parseInt(weeks)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching cohort analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cohort analysis',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/business-intelligence/risk-analysis
 * Get risk analysis and compliance metrics
 */
router.get('/risk-analysis', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { chainId, category } = req.query;
        
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;
        
        if (chainId) {
            whereClause += `WHERE bci.chain_id = $${paramIndex}`;
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }
        
        if (category) {
            whereClause += whereClause ? ` AND bcc.category_name = $${paramIndex}` : `WHERE bcc.category_name = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }
        
        const riskQuery = `
            SELECT 
                bcc.category_name,
                bcc.subcategory,
                COUNT(*) as contract_count,
                AVG(bci.risk_score) as avg_risk_score,
                COUNT(CASE WHEN bci.risk_score <= 30 THEN 1 END) as low_risk_contracts,
                COUNT(CASE WHEN bci.risk_score BETWEEN 31 AND 70 THEN 1 END) as medium_risk_contracts,
                COUNT(CASE WHEN bci.risk_score > 70 THEN 1 END) as high_risk_contracts,
                COUNT(CASE WHEN bci.is_verified = true THEN 1 END) as verified_contracts,
                -- Transaction volume by risk level
                SUM(CASE WHEN bci.risk_score <= 30 THEN tx_stats.total_volume ELSE 0 END) / 1e18 as low_risk_volume_eth,
                SUM(CASE WHEN bci.risk_score BETWEEN 31 AND 70 THEN tx_stats.total_volume ELSE 0 END) / 1e18 as medium_risk_volume_eth,
                SUM(CASE WHEN bci.risk_score > 70 THEN tx_stats.total_volume ELSE 0 END) / 1e18 as high_risk_volume_eth
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            LEFT JOIN (
                SELECT 
                    to_address,
                    chain_id,
                    SUM(value::numeric) as total_volume,
                    COUNT(*) as tx_count
                FROM mc_transaction_details
                WHERE captured_at > NOW() - INTERVAL '30 days'
                GROUP BY to_address, chain_id
            ) tx_stats ON bci.contract_address = tx_stats.to_address AND bci.chain_id = tx_stats.chain_id
            ${whereClause}
            GROUP BY bcc.category_name, bcc.subcategory
            ORDER BY avg_risk_score DESC
        `;
        
        const riskResult = await client.query(riskQuery, queryParams);
        
        // High-risk protocols analysis
        const highRiskQuery = `
            SELECT 
                bci.protocol_name,
                bci.contract_address,
                bci.risk_score,
                bcc.category_name,
                bci.is_verified,
                tx_stats.total_volume / 1e18 as volume_eth_30d,
                tx_stats.unique_users,
                tx_stats.tx_count
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            LEFT JOIN (
                SELECT 
                    to_address,
                    chain_id,
                    SUM(value::numeric) as total_volume,
                    COUNT(DISTINCT from_address) as unique_users,
                    COUNT(*) as tx_count
                FROM mc_transaction_details
                WHERE captured_at > NOW() - INTERVAL '30 days'
                GROUP BY to_address, chain_id
            ) tx_stats ON bci.contract_address = tx_stats.to_address AND bci.chain_id = tx_stats.chain_id
            WHERE bci.risk_score > 70
            ${whereClause.replace('WHERE', 'AND').replace('bcc.category_name', 'bcc.category_name')}
            ORDER BY bci.risk_score DESC, tx_stats.total_volume DESC
            LIMIT 20
        `;
        
        const highRiskResult = await client.query(highRiskQuery, queryParams);
        
        // Calculate overall risk metrics
        const totalContracts = riskResult.rows.reduce((sum, row) => sum + row.contract_count, 0);
        const totalLowRisk = riskResult.rows.reduce((sum, row) => sum + row.low_risk_contracts, 0);
        const totalMediumRisk = riskResult.rows.reduce((sum, row) => sum + row.medium_risk_contracts, 0);
        const totalHighRisk = riskResult.rows.reduce((sum, row) => sum + row.high_risk_contracts, 0);
        const totalVerified = riskResult.rows.reduce((sum, row) => sum + row.verified_contracts, 0);
        
        const overallRiskScore = riskResult.rows.length > 0
            ? riskResult.rows.reduce((sum, row) => sum + (row.avg_risk_score * row.contract_count), 0) / totalContracts
            : 0;
        
        res.json({
            success: true,
            data: {
                risk_overview: {
                    total_contracts: totalContracts,
                    overall_risk_score: overallRiskScore.toFixed(2),
                    low_risk_contracts: totalLowRisk,
                    medium_risk_contracts: totalMediumRisk,
                    high_risk_contracts: totalHighRisk,
                    verified_contracts: totalVerified,
                    verification_rate: totalContracts > 0 ? ((totalVerified / totalContracts) * 100).toFixed(2) : 0
                },
                risk_by_category: riskResult.rows,
                high_risk_protocols: highRiskResult.rows,
                filters: {
                    chainId: chainId ? parseInt(chainId) : null,
                    category
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching risk analysis:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch risk analysis',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

module.exports = router;