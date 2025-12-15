import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/contract-business/
 * Get business analytics for all contracts (business directory)
 */
router.get('/', async (req, res) => {
    try {
        const { category, chainId, sortBy = 'customers', limit = 50 } = req.query;

        // Build the query dynamically
        let whereClause = '';
        let queryParams: any[] = [];
        let paramIndex = 1;

        if (category && category !== 'all') {
            whereClause += `WHERE bcc.category_name = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }

        if (chainId) {
            whereClause += whereClause ? ` AND bci.chain_id = $${paramIndex}` : `WHERE bci.chain_id = $${paramIndex}`;
            queryParams.push(parseInt(chainId as string));
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
                
                -- Business Performance (30 days)
                COUNT(DISTINCT td.from_address) as total_customers,
                COUNT(*) as total_transactions,
                COALESCE(SUM(td.value::numeric) / 1e18, 0) as total_revenue_eth,
                COALESCE(SUM(td.gas_used * td.gas_price) / 1e18, 0) as total_fees_eth,
                (COUNT(CASE WHEN td.status = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate,
                COALESCE(AVG(td.value::numeric) / 1e18, 0) as avg_transaction_value_eth
                
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            JOIN mc_chains c ON bci.chain_id = c.id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id 
                -- AND td.captured_at > NOW() - INTERVAL '30 days'
            ${whereClause}
            GROUP BY bci.contract_address, bci.protocol_name, bci.contract_name, 
                     bcc.category_name, bcc.subcategory, c.name, bci.is_verified, bci.risk_score
            ORDER BY 
                CASE 
                    WHEN '${sortBy}' = 'customers' THEN COUNT(DISTINCT td.from_address)
                    WHEN '${sortBy}' = 'revenue' THEN SUM(td.value::numeric)
                    WHEN '${sortBy}' = 'transactions' THEN COUNT(*)
                END DESC NULLS LAST
            LIMIT $${paramIndex}
        `;

        queryParams.push(parseInt(limit as string));

        console.log('Running Business Query:', businessDirectoryQuery, queryParams);
        const result = await pool.query(businessDirectoryQuery, queryParams);

        // Calculate customer retention for each business
        const businessesWithRetention = await Promise.all(result.rows.map(async (business) => {
            const retentionQuery = `
                SELECT 
                    COUNT(CASE WHEN tx_count.tx_count = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as one_time_rate
                FROM (
                    SELECT 
                        from_address,
                        COUNT(*) as tx_count
                    FROM mc_transaction_details
                    WHERE to_address = $1
                    GROUP BY from_address
                ) tx_count
            `;

            const retentionResult = await pool.query(retentionQuery, [business.contract_address]);
            const oneTimeRate = retentionResult.rows[0]?.one_time_rate || 100;
            const retentionRate = 100 - parseFloat(oneTimeRate);

            return {
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
                customer_retention_rate_percent: parseFloat(retentionRate.toFixed(1)),
                avg_transaction_value_eth: parseFloat(business.avg_transaction_value_eth || 0)
            };
        }));

        res.json({
            success: true,
            data: {
                businesses: businessesWithRetention,
                filters: {
                    category,
                    chainId: chainId ? parseInt(chainId as string) : null,
                    sortBy,
                    limit: parseInt(limit as string)
                },
                total_businesses: businessesWithRetention.length
            }
        });

    } catch (error: any) {
        console.error('Error fetching business directory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business directory',
            message: error.message
        });
    }
});

/**
 * GET /api/contract-business/:id
 * Get details for a single contract
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params; // Contract Address

    try {
        const query = `
            SELECT 
                bci.contract_address,
                bci.protocol_name as business_name,
                bci.contract_name,
                bcc.category_name,
                c.name as chain_name,
                bci.is_verified,
                bci.risk_score,
                COUNT(DISTINCT td.from_address) as total_customers,
                COUNT(*) as total_transactions,
                COALESCE(SUM(td.value::numeric) / 1e18, 0) as total_revenue_eth
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            JOIN mc_chains c ON bci.chain_id = c.id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address AND bci.chain_id = td.chain_id
            WHERE bci.contract_address = $1
            GROUP BY bci.contract_address, bci.protocol_name, bci.contract_name, bcc.category_name, c.name, bci.is_verified, bci.risk_score
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error fetching project details:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
