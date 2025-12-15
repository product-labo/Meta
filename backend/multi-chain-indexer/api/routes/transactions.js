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
 * GET /api/transactions
 * Get transactions with filtering, pagination, and sorting
 */
router.get('/', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        // Parse query parameters
        const {
            chainId,
            status, // 1 = success, 0 = failed
            functionName,
            fromAddress,
            toAddress,
            limit = 50,
            offset = 0,
            sortBy = 'captured_at',
            sortOrder = 'DESC',
            timeRange = '24h' // 1h, 24h, 7d, 30d
        } = req.query;
        
        // Build WHERE conditions
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;
        
        if (chainId) {
            whereConditions.push(`td.chain_id = $${paramIndex}`);
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }
        
        if (status !== undefined) {
            whereConditions.push(`td.status = $${paramIndex}`);
            queryParams.push(parseInt(status));
            paramIndex++;
        }
        
        if (functionName) {
            whereConditions.push(`td.function_name ILIKE $${paramIndex}`);
            queryParams.push(`%${functionName}%`);
            paramIndex++;
        }
        
        if (fromAddress) {
            whereConditions.push(`td.from_address = $${paramIndex}`);
            queryParams.push(fromAddress.toLowerCase());
            paramIndex++;
        }
        
        if (toAddress) {
            whereConditions.push(`td.to_address = $${paramIndex}`);
            queryParams.push(toAddress.toLowerCase());
            paramIndex++;
        }
        
        // Time range filter
        const timeRangeMap = {
            '1h': '1 hour',
            '24h': '24 hours',
            '7d': '7 days',
            '30d': '30 days'
        };
        
        if (timeRangeMap[timeRange]) {
            whereConditions.push(`td.captured_at > NOW() - INTERVAL '${timeRangeMap[timeRange]}'`);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Validate sort parameters
        const validSortColumns = ['captured_at', 'block_number', 'gas_used', 'value', 'status'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'captured_at';
        const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        const query = `
            SELECT 
                td.id,
                td.tx_hash,
                td.block_number,
                td.tx_index,
                td.from_address,
                td.to_address,
                td.value,
                td.gas_price,
                td.gas_limit,
                td.gas_used,
                td.status,
                td.nonce,
                td.function_selector,
                td.function_name,
                td.decoded_input,
                td.error_reason,
                td.captured_at,
                c.name as chain_name,
                -- Calculate gas efficiency
                CASE 
                    WHEN td.gas_limit > 0 THEN ROUND((td.gas_used::decimal / td.gas_limit::decimal) * 100, 2)
                    ELSE NULL 
                END as gas_efficiency_percent,
                -- Calculate transaction fee
                CASE 
                    WHEN td.gas_price > 0 AND td.gas_used > 0 THEN (td.gas_price * td.gas_used)
                    ELSE NULL 
                END as transaction_fee
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            ${whereClause}
            ORDER BY td.${finalSortBy} ${finalSortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await client.query(query, queryParams);
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            ${whereClause}
        `;
        
        const countResult = await client.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            },
            filters: {
                chainId: chainId ? parseInt(chainId) : null,
                status: status !== undefined ? parseInt(status) : null,
                functionName,
                fromAddress,
                toAddress,
                timeRange,
                sortBy: finalSortBy,
                sortOrder: finalSortOrder
            }
        });
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/transactions/:txHash
 * Get detailed information about a specific transaction
 */
router.get('/:txHash', async (req, res) => {
    const client = getDbClient();
    const { txHash } = req.params;
    
    try {
        await client.connect();
        
        // Get transaction details
        const txQuery = `
            SELECT 
                td.*,
                c.name as chain_name,
                c.rpc_urls,
                -- Calculate metrics
                CASE 
                    WHEN td.gas_limit > 0 THEN ROUND((td.gas_used::decimal / td.gas_limit::decimal) * 100, 2)
                    ELSE NULL 
                END as gas_efficiency_percent,
                CASE 
                    WHEN td.gas_price > 0 AND td.gas_used > 0 THEN (td.gas_price * td.gas_used)
                    ELSE NULL 
                END as transaction_fee
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            WHERE td.tx_hash = $1
        `;
        
        const txResult = await client.query(txQuery, [txHash]);
        
        if (txResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        const transaction = txResult.rows[0];
        
        // Get related events for this transaction
        const eventsQuery = `
            SELECT 
                de.event_name,
                de.event_signature,
                de.decoded_data,
                de.raw_topics,
                de.raw_data,
                de.log_index,
                r.address as contract_address,
                r.name as contract_name
            FROM mc_decoded_events de
            LEFT JOIN mc_registry r ON de.registry_id = r.id
            WHERE de.tx_hash = $1
            ORDER BY de.log_index
        `;
        
        const eventsResult = await client.query(eventsQuery, [txHash]);
        
        // Get token transfers for this transaction
        const transfersQuery = `
            SELECT 
                tt.token_address,
                tt.token_name,
                tt.token_symbol,
                tt.token_decimals,
                tt.from_address,
                tt.to_address,
                tt.amount_raw,
                tt.amount_formatted,
                tt.transfer_type,
                tt.log_index
            FROM mc_token_transfers tt
            WHERE tt.tx_hash = $1
            ORDER BY tt.log_index
        `;
        
        const transfersResult = await client.query(transfersQuery, [txHash]);
        
        // Get DeFi interactions for this transaction
        const defiQuery = `
            SELECT 
                di.protocol_name,
                di.interaction_type,
                di.user_address,
                di.contract_address,
                di.token_in_address,
                di.token_in_amount,
                di.token_out_address,
                di.token_out_amount,
                di.metadata
            FROM mc_defi_interactions di
            WHERE di.tx_hash = $1
        `;
        
        const defiResult = await client.query(defiQuery, [txHash]);
        
        res.json({
            success: true,
            data: {
                transaction,
                events: eventsResult.rows,
                token_transfers: transfersResult.rows,
                defi_interactions: defiResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction details',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/transactions/analytics/summary
 * Get transaction analytics summary
 */
router.get('/analytics/summary', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { chainId, timeRange = '24h' } = req.query;
        
        // Time range filter
        const timeRangeMap = {
            '1h': '1 hour',
            '24h': '24 hours',
            '7d': '7 days',
            '30d': '30 days'
        };
        
        let whereClause = `WHERE td.captured_at > NOW() - INTERVAL '${timeRangeMap[timeRange] || '24 hours'}'`;
        let queryParams = [];
        
        if (chainId) {
            whereClause += ` AND td.chain_id = $1`;
            queryParams.push(parseInt(chainId));
        }
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_transactions,
                COUNT(CASE WHEN td.status = 0 THEN 1 END) as failed_transactions,
                ROUND(AVG(td.gas_used), 0) as avg_gas_used,
                ROUND(AVG(td.gas_price), 0) as avg_gas_price,
                SUM(td.value) as total_value_transferred,
                COUNT(DISTINCT td.from_address) as unique_senders,
                COUNT(DISTINCT td.to_address) as unique_receivers,
                COUNT(DISTINCT td.function_name) as unique_functions,
                -- Top functions
                (SELECT json_agg(function_stats ORDER BY tx_count DESC) 
                 FROM (
                     SELECT 
                         td2.function_name,
                         COUNT(*) as tx_count,
                         ROUND(AVG(td2.gas_used), 0) as avg_gas
                     FROM mc_transaction_details td2
                     ${whereClause.replace('td.', 'td2.')}
                     AND td2.function_name IS NOT NULL
                     GROUP BY td2.function_name
                     ORDER BY COUNT(*) DESC
                     LIMIT 10
                 ) function_stats
                ) as top_functions
            FROM mc_transaction_details td
            ${whereClause}
        `;
        
        const result = await client.query(summaryQuery, queryParams);
        const summary = result.rows[0];
        
        // Calculate success rate
        const successRate = summary.total_transactions > 0 
            ? ((summary.successful_transactions / summary.total_transactions) * 100).toFixed(2)
            : 0;
        
        // Get hourly transaction volume for the time range
        const volumeQuery = `
            SELECT 
                DATE_TRUNC('hour', td.captured_at) as hour,
                COUNT(*) as transaction_count,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_count,
                COUNT(CASE WHEN td.status = 0 THEN 1 END) as failed_count
            FROM mc_transaction_details td
            ${whereClause}
            GROUP BY DATE_TRUNC('hour', td.captured_at)
            ORDER BY hour DESC
            LIMIT 24
        `;
        
        const volumeResult = await client.query(volumeQuery, queryParams);
        
        res.json({
            success: true,
            data: {
                summary: {
                    ...summary,
                    success_rate_percent: parseFloat(successRate)
                },
                hourly_volume: volumeResult.rows,
                timeRange,
                chainId: chainId ? parseInt(chainId) : null
            }
        });
        
    } catch (error) {
        console.error('Error fetching transaction analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction analytics',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

module.exports = router;