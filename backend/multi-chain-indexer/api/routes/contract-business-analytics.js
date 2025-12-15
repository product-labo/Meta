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
 * GET /api/contract-business/:contractAddress
 * Get complete business analytics for a specific smart contract
 * Each contract = One Business Entity for investors
 */
router.get('/:contractAddress', async (req, res) => {
    const client = getDbClient();
    const { contractAddress } = req.params;
    
    try {
        await client.connect();
        
        const { timeRange = '30d', chainId } = req.query;
        
        // Time range mapping
        const timeRangeMap = {
            '7d': '7 days',
            '30d': '30 days',
            '90d': '90 days',
            '1y': '1 year'
        };
        
        const interval = timeRangeMap[timeRange] || '30 days';
        
        // 1. CONTRACT BUSINESS OVERVIEW
        const businessOverviewQuery = `
            SELECT 
                -- Contract Identity
                bci.contract_address,
                bci.contract_name,
                bci.protocol_name,
                bcc.category_name,
                bcc.subcategory,
                c.name as chain_name,
                bci.is_verified,
                bci.risk_score,
                NULL as launch_date,
                NULL as website_url,
                0 as tvl_usd,
                0 as market_cap_usd,
                
                -- Business Metrics (Last ${interval})
                COUNT(DISTINCT td.from_address) as total_customers,
                COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '7 days' THEN td.from_address END) as weekly_active_customers,
                COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '1 day' THEN td.from_address END) as daily_active_customers,
                
                -- Revenue Metrics
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_transactions,
                SUM(td.value::numeric) / 1e18 as total_volume_eth,
                SUM(td.gas_used * td.gas_price) / 1e18 as total_fees_generated_eth,
                AVG(td.value::numeric) / 1e18 as avg_transaction_value_eth,
                
                -- Performance Metrics
                AVG(td.gas_used) as avg_gas_used,
                COUNT(CASE WHEN td.status = 0 THEN 1 END) as failed_transactions,
                
                -- Growth Metrics
                COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '${interval}' THEN td.from_address END) as current_period_users,
                COUNT(DISTINCT CASE WHEN td.captured_at BETWEEN NOW() - INTERVAL '${interval}' * 2 AND NOW() - INTERVAL '${interval}' THEN td.from_address END) as previous_period_users
                
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            JOIN mc_chains c ON bci.chain_id = c.id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '${interval}'
            WHERE bci.contract_address = $1
            ${chainId ? 'AND bci.chain_id = $2' : ''}
            GROUP BY bci.contract_address, bci.contract_name, bci.protocol_name, 
                     bcc.category_name, bcc.subcategory, c.name, bci.is_verified, 
                     bci.risk_score
        `;
        
        const queryParams = chainId ? [contractAddress, parseInt(chainId)] : [contractAddress];
        const overviewResult = await client.query(businessOverviewQuery, queryParams);
        
        if (overviewResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Contract not found or no data available'
            });
        }
        
        const businessData = overviewResult.rows[0];
        
        // Calculate business KPIs
        const successRate = businessData.total_transactions > 0 
            ? ((businessData.successful_transactions / businessData.total_transactions) * 100).toFixed(2)
            : 0;
            
        const customerStickiness = businessData.weekly_active_customers > 0 
            ? ((businessData.daily_active_customers / businessData.weekly_active_customers) * 100).toFixed(2)
            : 0;
            
        const customerGrowthRate = businessData.previous_period_users > 0
            ? (((businessData.current_period_users - businessData.previous_period_users) / businessData.previous_period_users) * 100).toFixed(2)
            : 0;
        
        // 2. CUSTOMER ANALYTICS
        const customerAnalyticsQuery = `
            WITH customer_segments AS (
                SELECT 
                    td.from_address,
                    COUNT(*) as transaction_count,
                    SUM(td.value::numeric) / 1e18 as total_spent_eth,
                    SUM(td.gas_used * td.gas_price) / 1e18 as total_fees_paid_eth,
                    MIN(td.captured_at) as first_transaction,
                    MAX(td.captured_at) as last_transaction,
                    EXTRACT(DAYS FROM (MAX(td.captured_at) - MIN(td.captured_at))) as customer_lifetime_days
                FROM mc_transaction_details td
                WHERE td.to_address = $1
                AND td.captured_at > NOW() - INTERVAL '${interval}'
                ${chainId ? 'AND td.chain_id = $2' : ''}
                GROUP BY td.from_address
            )
            SELECT 
                -- Customer Segmentation
                COUNT(CASE WHEN total_spent_eth >= 10 THEN 1 END) as whale_customers,
                COUNT(CASE WHEN total_spent_eth BETWEEN 1 AND 10 THEN 1 END) as premium_customers,
                COUNT(CASE WHEN total_spent_eth BETWEEN 0.1 AND 1 THEN 1 END) as regular_customers,
                COUNT(CASE WHEN total_spent_eth < 0.1 THEN 1 END) as small_customers,
                
                -- Customer Behavior
                AVG(transaction_count) as avg_transactions_per_customer,
                AVG(total_spent_eth) as avg_customer_value_eth,
                AVG(total_fees_paid_eth) as avg_fees_per_customer_eth,
                AVG(customer_lifetime_days) as avg_customer_lifetime_days,
                
                -- Customer Retention
                COUNT(CASE WHEN transaction_count = 1 THEN 1 END) as one_time_customers,
                COUNT(CASE WHEN transaction_count BETWEEN 2 AND 5 THEN 1 END) as occasional_customers,
                COUNT(CASE WHEN transaction_count BETWEEN 6 AND 20 THEN 1 END) as regular_customers_repeat,
                COUNT(CASE WHEN transaction_count > 20 THEN 1 END) as power_customers,
                
                -- Revenue Distribution
                SUM(total_spent_eth) as total_customer_value_eth,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_spent_eth) as median_customer_value_eth,
                MAX(total_spent_eth) as top_customer_value_eth
                
            FROM customer_segments
        `;
        
        const customerResult = await client.query(customerAnalyticsQuery, queryParams);
        const customerData = customerResult.rows[0];
        
        // 3. DAILY BUSINESS PERFORMANCE
        const dailyPerformanceQuery = `
            SELECT 
                DATE(td.captured_at) as business_date,
                COUNT(DISTINCT td.from_address) as daily_active_customers,
                COUNT(*) as daily_transactions,
                SUM(td.value::numeric) / 1e18 as daily_revenue_eth,
                SUM(td.gas_used * td.gas_price) / 1e18 as daily_fees_generated_eth,
                AVG(td.value::numeric) / 1e18 as avg_transaction_size_eth,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_transactions,
                COUNT(CASE WHEN td.status = 0 THEN 1 END) as failed_transactions,
                
                -- New vs Returning Customers
                COUNT(DISTINCT CASE WHEN first_tx.first_date = DATE(td.captured_at) THEN td.from_address END) as new_customers,
                COUNT(DISTINCT CASE WHEN first_tx.first_date < DATE(td.captured_at) THEN td.from_address END) as returning_customers
                
            FROM mc_transaction_details td
            LEFT JOIN (
                SELECT 
                    from_address,
                    MIN(DATE(captured_at)) as first_date
                FROM mc_transaction_details
                WHERE to_address = $1
                ${chainId ? 'AND chain_id = $2' : ''}
                GROUP BY from_address
            ) first_tx ON td.from_address = first_tx.from_address
            WHERE td.to_address = $1
            AND td.captured_at > NOW() - INTERVAL '${interval}'
            ${chainId ? 'AND td.chain_id = $2' : ''}
            GROUP BY DATE(td.captured_at)
            ORDER BY business_date DESC
            LIMIT 30
        `;
        
        const dailyResult = await client.query(dailyPerformanceQuery, queryParams);
        
        // 4. FUNCTION USAGE ANALYTICS (Product Features)
        const functionAnalyticsQuery = `
            SELECT 
                td.function_name,
                COUNT(*) as usage_count,
                COUNT(DISTINCT td.from_address) as unique_users,
                SUM(td.value::numeric) / 1e18 as total_value_eth,
                AVG(td.gas_used) as avg_gas_cost,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_calls,
                COUNT(CASE WHEN td.status = 0 THEN 1 END) as failed_calls,
                (COUNT(CASE WHEN td.status = 1 THEN 1 END) * 100.0 / COUNT(*)) as success_rate
            FROM mc_transaction_details td
            WHERE td.to_address = $1
            AND td.captured_at > NOW() - INTERVAL '${interval}'
            AND td.function_name IS NOT NULL
            ${chainId ? 'AND td.chain_id = $2' : ''}
            GROUP BY td.function_name
            ORDER BY usage_count DESC
            LIMIT 20
        `;
        
        const functionResult = await client.query(functionAnalyticsQuery, queryParams);
        
        // 5. CUSTOMER COHORT ANALYSIS
        const cohortAnalysisQuery = `
            WITH customer_cohorts AS (
                SELECT 
                    td.from_address,
                    DATE_TRUNC('week', MIN(td.captured_at)) as cohort_week,
                    DATE_TRUNC('week', td.captured_at) as activity_week,
                    COUNT(*) as transactions,
                    SUM(td.value::numeric) / 1e18 as volume_eth
                FROM mc_transaction_details td
                WHERE td.to_address = $1
                AND td.captured_at > NOW() - INTERVAL '12 weeks'
                ${chainId ? 'AND td.chain_id = $2' : ''}
                GROUP BY td.from_address, DATE_TRUNC('week', MIN(td.captured_at)) OVER (PARTITION BY td.from_address), DATE_TRUNC('week', td.captured_at)
            ),
            cohort_data AS (
                SELECT 
                    cohort_week,
                    activity_week,
                    EXTRACT(WEEK FROM activity_week) - EXTRACT(WEEK FROM cohort_week) as week_number,
                    COUNT(DISTINCT from_address) as cohort_size,
                    SUM(transactions) as total_transactions,
                    SUM(volume_eth) as total_volume_eth
                FROM customer_cohorts
                GROUP BY cohort_week, activity_week
            )
            SELECT 
                cohort_week,
                week_number,
                cohort_size,
                total_transactions,
                total_volume_eth,
                LAG(cohort_size) OVER (PARTITION BY cohort_week ORDER BY week_number) as previous_week_size,
                CASE 
                    WHEN LAG(cohort_size) OVER (PARTITION BY cohort_week ORDER BY week_number) > 0 
                    THEN (cohort_size * 100.0 / LAG(cohort_size) OVER (PARTITION BY cohort_week ORDER BY week_number))
                    ELSE 100.0 
                END as retention_rate
            FROM cohort_data
            WHERE week_number >= 0 AND week_number <= 8
            ORDER BY cohort_week DESC, week_number
        `;
        
        const cohortResult = await client.query(cohortAnalysisQuery, queryParams);
        
        // 6. COMPETITIVE ANALYSIS (vs similar contracts)
        const competitiveAnalysisQuery = `
            WITH contract_performance AS (
                SELECT 
                    bci.contract_address,
                    bci.protocol_name,
                    COUNT(DISTINCT td.from_address) as customers,
                    COUNT(*) as transactions,
                    SUM(td.value::numeric) / 1e18 as volume_eth,
                    AVG(bci.risk_score) as risk_score
                FROM bi_contract_index bci
                JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
                LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                    AND bci.chain_id = td.chain_id 
                    AND td.captured_at > NOW() - INTERVAL '${interval}'
                WHERE bcc.category_name = (
                    SELECT bcc2.category_name 
                    FROM bi_contract_index bci2 
                    JOIN bi_contract_categories bcc2 ON bci2.category_id = bcc2.id 
                    WHERE bci2.contract_address = $1
                )
                AND bcc.subcategory = (
                    SELECT bcc2.subcategory 
                    FROM bi_contract_index bci2 
                    JOIN bi_contract_categories bcc2 ON bci2.category_id = bcc2.id 
                    WHERE bci2.contract_address = $1
                )
                ${chainId ? 'AND bci.chain_id = $2' : ''}
                GROUP BY bci.contract_address, bci.protocol_name, bci.risk_score
                HAVING COUNT(*) > 0
            )
            SELECT 
                contract_address,
                protocol_name,
                customers,
                transactions,
                volume_eth,
                risk_score,
                RANK() OVER (ORDER BY customers DESC) as customer_rank,
                RANK() OVER (ORDER BY volume_eth DESC) as volume_rank,
                RANK() OVER (ORDER BY transactions DESC) as transaction_rank
            FROM contract_performance
            ORDER BY customers DESC
            LIMIT 10
        `;
        
        const competitiveResult = await client.query(competitiveAnalysisQuery, queryParams);
        
        // 7. BUSINESS HEALTH SCORE
        const calculateBusinessHealthScore = (data) => {
            let score = 50; // Base score
            
            // Customer metrics (30% weight)
            if (data.total_customers > 1000) score += 15;
            else if (data.total_customers > 100) score += 10;
            else if (data.total_customers > 10) score += 5;
            
            // Success rate (25% weight)
            const successRateNum = parseFloat(successRate);
            if (successRateNum > 95) score += 12;
            else if (successRateNum > 90) score += 8;
            else if (successRateNum > 80) score += 4;
            
            // Growth (20% weight)
            const growthRate = parseFloat(customerGrowthRate);
            if (growthRate > 20) score += 10;
            else if (growthRate > 10) score += 6;
            else if (growthRate > 0) score += 3;
            else if (growthRate < -10) score -= 5;
            
            // Risk (15% weight)
            if (data.risk_score < 30) score += 7;
            else if (data.risk_score < 50) score += 4;
            else if (data.risk_score > 70) score -= 3;
            
            // Verification (10% weight)
            if (data.is_verified) score += 5;
            
            return Math.max(0, Math.min(100, score));
        };
        
        const businessHealthScore = calculateBusinessHealthScore(businessData);
        
        // Prepare response
        res.json({
            success: true,
            data: {
                // Contract Business Identity
                business_identity: {
                    contract_address: businessData.contract_address,
                    business_name: businessData.protocol_name || businessData.contract_name || 'Unknown Business',
                    category: businessData.category_name,
                    subcategory: businessData.subcategory,
                    chain: businessData.chain_name,
                    is_verified: businessData.is_verified,
                    launch_date: businessData.launch_date,
                    website: businessData.website_url,
                    business_health_score: businessHealthScore
                },
                
                // Key Business Metrics
                business_metrics: {
                    total_customers: parseInt(businessData.total_customers),
                    weekly_active_customers: parseInt(businessData.weekly_active_customers),
                    daily_active_customers: parseInt(businessData.daily_active_customers),
                    customer_stickiness_percent: parseFloat(customerStickiness),
                    customer_growth_rate_percent: parseFloat(customerGrowthRate),
                    
                    total_transactions: parseInt(businessData.total_transactions),
                    successful_transactions: parseInt(businessData.successful_transactions),
                    success_rate_percent: parseFloat(successRate),
                    
                    total_revenue_eth: parseFloat(businessData.total_volume_eth || 0),
                    total_fees_generated_eth: parseFloat(businessData.total_fees_generated_eth || 0),
                    avg_transaction_value_eth: parseFloat(businessData.avg_transaction_value_eth || 0),
                    
                    risk_score: businessData.risk_score,
                    tvl_usd: parseFloat(businessData.tvl_usd || 0),
                    market_cap_usd: parseFloat(businessData.market_cap_usd || 0)
                },
                
                // Customer Analytics
                customer_analytics: {
                    whale_customers: parseInt(customerData.whale_customers || 0),
                    premium_customers: parseInt(customerData.premium_customers || 0),
                    regular_customers: parseInt(customerData.regular_customers || 0),
                    small_customers: parseInt(customerData.small_customers || 0),
                    
                    avg_transactions_per_customer: parseFloat(customerData.avg_transactions_per_customer || 0),
                    avg_customer_value_eth: parseFloat(customerData.avg_customer_value_eth || 0),
                    avg_customer_lifetime_days: parseFloat(customerData.avg_customer_lifetime_days || 0),
                    
                    one_time_customers: parseInt(customerData.one_time_customers || 0),
                    power_customers: parseInt(customerData.power_customers || 0),
                    
                    total_customer_value_eth: parseFloat(customerData.total_customer_value_eth || 0),
                    median_customer_value_eth: parseFloat(customerData.median_customer_value_eth || 0),
                    top_customer_value_eth: parseFloat(customerData.top_customer_value_eth || 0)
                },
                
                // Daily Performance
                daily_performance: dailyResult.rows,
                
                // Product Features (Functions)
                product_features: functionResult.rows,
                
                // Customer Cohorts
                customer_cohorts: cohortResult.rows,
                
                // Competitive Position
                competitive_analysis: competitiveResult.rows,
                
                // Metadata
                analysis_period: timeRange,
                generated_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error fetching contract business analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contract business analytics',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/contract-business/
 * Get business analytics for all contracts (business directory)
 */
router.get('/', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { category, chainId, sortBy = 'customers', limit = 50 } = req.query;
        
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;
        
        if (category) {
            whereClause += `WHERE bcc.category_name = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }
        
        if (chainId) {
            whereClause += whereClause ? ` AND bci.chain_id = $${paramIndex}` : `WHERE bci.chain_id = $${paramIndex}`;
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }
        
        // Business directory query
        const businessDirectoryQuery = `
            SELECT 
                bci.contract_address,
                bci.protocol_name as business_name,
                bci.contract_name,
                bcc.category_name,
                bcc.subcategory,
                c.name as chain_name,
                bci.is_verified,
                bci.risk_score,
                0 as tvl_usd,
                
                -- Business Performance (30 days)
                COUNT(DISTINCT td.from_address) as total_customers,
                COUNT(*) as total_transactions,
                SUM(td.value::numeric) / 1e18 as total_revenue_eth,
                SUM(td.gas_used * td.gas_price) / 1e18 as total_fees_eth,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as success_rate,
                
                -- Customer Quality
                COUNT(DISTINCT CASE WHEN customer_tx.tx_count > 1 THEN td.from_address END) * 100.0 / 
                NULLIF(COUNT(DISTINCT td.from_address), 0) as customer_retention_rate,
                
                AVG(td.value::numeric) / 1e18 as avg_transaction_value_eth
                
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            JOIN mc_chains c ON bci.chain_id = c.id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                AND td.captured_at > NOW() - INTERVAL '30 days'
            LEFT JOIN (
                SELECT 
                    to_address,
                    from_address,
                    COUNT(*) as tx_count
                FROM mc_transaction_details
                WHERE captured_at > NOW() - INTERVAL '30 days'
                GROUP BY to_address, from_address
            ) customer_tx ON bci.contract_address = customer_tx.to_address AND td.from_address = customer_tx.from_address
            ${whereClause}
            GROUP BY bci.contract_address, bci.protocol_name, bci.contract_name, 
                     bcc.category_name, bcc.subcategory, c.name, bci.is_verified, 
                     bci.risk_score
            HAVING COUNT(*) > 0
            ORDER BY 
                CASE 
                    WHEN '${sortBy}' = 'customers' THEN COUNT(DISTINCT td.from_address)
                    WHEN '${sortBy}' = 'revenue' THEN SUM(td.value::numeric)
                    WHEN '${sortBy}' = 'transactions' THEN COUNT(*)
                    ELSE COUNT(DISTINCT td.from_address)
                END DESC
            LIMIT $${paramIndex}
        `;
        
        queryParams.push(parseInt(limit));
        
        const result = await client.query(businessDirectoryQuery, queryParams);
        
        res.json({
            success: true,
            data: {
                businesses: result.rows.map(business => ({
                    contract_address: business.contract_address,
                    business_name: business.business_name || business.contract_name || 'Unknown Business',
                    category: business.category_name,
                    subcategory: business.subcategory,
                    chain: business.chain_name,
                    is_verified: business.is_verified,
                    risk_score: business.risk_score,
                    
                    // Key Metrics
                    total_customers: parseInt(business.total_customers || 0),
                    total_transactions: parseInt(business.total_transactions || 0),
                    total_revenue_eth: parseFloat(business.total_revenue_eth || 0),
                    success_rate_percent: parseFloat(business.success_rate || 0),
                    customer_retention_rate_percent: parseFloat(business.customer_retention_rate || 0),
                    avg_transaction_value_eth: parseFloat(business.avg_transaction_value_eth || 0),
                    tvl_usd: parseFloat(business.tvl_usd || 0)
                })),
                filters: {
                    category,
                    chainId: chainId ? parseInt(chainId) : null,
                    sortBy,
                    limit: parseInt(limit)
                },
                total_businesses: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching business directory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business directory',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

module.exports = router;