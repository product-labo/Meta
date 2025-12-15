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
 * GET /api/events
 * Get decoded events with filtering and pagination
 */
router.get('/', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const {
            chainId,
            eventName,
            contractAddress,
            txHash,
            limit = 50,
            offset = 0,
            timeRange = '24h',
            sortBy = 'captured_at',
            sortOrder = 'DESC'
        } = req.query;
        
        // Build WHERE conditions
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;
        
        // Time range filter
        const timeRangeMap = {
            '1h': '1 hour',
            '24h': '24 hours',
            '7d': '7 days',
            '30d': '30 days'
        };
        
        if (timeRangeMap[timeRange]) {
            whereConditions.push(`de.captured_at > NOW() - INTERVAL '${timeRangeMap[timeRange]}'`);
        }
        
        if (chainId) {
            whereConditions.push(`c.id = $${paramIndex}`);
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }
        
        if (eventName) {
            whereConditions.push(`de.event_name ILIKE $${paramIndex}`);
            queryParams.push(`%${eventName}%`);
            paramIndex++;
        }
        
        if (contractAddress) {
            whereConditions.push(`r.address = $${paramIndex}`);
            queryParams.push(contractAddress.toLowerCase());
            paramIndex++;
        }
        
        if (txHash) {
            whereConditions.push(`de.tx_hash = $${paramIndex}`);
            queryParams.push(txHash);
            paramIndex++;
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Validate sort parameters
        const validSortColumns = ['captured_at', 'block_number', 'event_name'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'captured_at';
        const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        const query = `
            SELECT 
                de.id,
                de.tx_hash,
                de.block_number,
                de.log_index,
                de.event_name,
                de.event_signature,
                de.decoded_data,
                de.raw_topics,
                de.raw_data,
                de.captured_at,
                r.address as contract_address,
                r.name as contract_name,
                r.contract_type,
                c.name as chain_name,
                c.id as chain_id
            FROM mc_decoded_events de
            LEFT JOIN mc_registry r ON de.registry_id = r.id
            LEFT JOIN mc_chains c ON r.chain_id = c.id
            ${whereClause}
            ORDER BY de.${finalSortBy} ${finalSortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await client.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM mc_decoded_events de
            LEFT JOIN mc_registry r ON de.registry_id = r.id
            LEFT JOIN mc_chains c ON r.chain_id = c.id
            ${whereClause}
        `;
        
        const countResult = await client.query(countQuery, queryParams.slice(0, -2));
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
                eventName,
                contractAddress,
                txHash,
                timeRange,
                sortBy: finalSortBy,
                sortOrder: finalSortOrder
            }
        });
        
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/events/analytics/summary
 * Get events analytics summary
 */
router.get('/analytics/summary', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { chainId, timeRange = '24h' } = req.query;
        
        let whereClause = `WHERE de.captured_at > NOW() - INTERVAL '${timeRange === '1h' ? '1 hour' : timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '24 hours'}'`;
        let queryParams = [];
        
        if (chainId) {
            whereClause += ` AND c.id = $1`;
            queryParams.push(parseInt(chainId));
        }
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT de.event_name) as unique_event_types,
                COUNT(DISTINCT de.tx_hash) as unique_transactions,
                COUNT(DISTINCT r.address) as unique_contracts,
                -- Top events
                (SELECT json_agg(event_stats ORDER BY event_count DESC) 
                 FROM (
                     SELECT 
                         de2.event_name,
                         COUNT(*) as event_count,
                         COUNT(DISTINCT de2.tx_hash) as unique_txs
                     FROM mc_decoded_events de2
                     LEFT JOIN mc_registry r2 ON de2.registry_id = r2.id
                     LEFT JOIN mc_chains c2 ON r2.chain_id = c2.id
                     ${whereClause.replace(/\bde\./g, 'de2.').replace(/\br\./g, 'r2.').replace(/\bc\./g, 'c2.')}
                     GROUP BY de2.event_name
                     ORDER BY COUNT(*) DESC
                     LIMIT 10
                 ) event_stats
                ) as top_events,
                -- Top contracts
                (SELECT json_agg(contract_stats ORDER BY event_count DESC) 
                 FROM (
                     SELECT 
                         r2.address,
                         r2.name,
                         COUNT(*) as event_count,
                         COUNT(DISTINCT de2.event_name) as unique_events
                     FROM mc_decoded_events de2
                     LEFT JOIN mc_registry r2 ON de2.registry_id = r2.id
                     LEFT JOIN mc_chains c2 ON r2.chain_id = c2.id
                     ${whereClause.replace(/\bde\./g, 'de2.').replace(/\br\./g, 'r2.').replace(/\bc\./g, 'c2.')}
                     AND r2.address IS NOT NULL
                     GROUP BY r2.address, r2.name
                     ORDER BY COUNT(*) DESC
                     LIMIT 10
                 ) contract_stats
                ) as top_contracts
            FROM mc_decoded_events de
            LEFT JOIN mc_registry r ON de.registry_id = r.id
            LEFT JOIN mc_chains c ON r.chain_id = c.id
            ${whereClause}
        `;
        
        const result = await client.query(summaryQuery, queryParams);
        
        // Get hourly event volume
        const volumeQuery = `
            SELECT 
                DATE_TRUNC('hour', de.captured_at) as hour,
                COUNT(*) as event_count,
                COUNT(DISTINCT de.event_name) as unique_events,
                COUNT(DISTINCT de.tx_hash) as unique_transactions
            FROM mc_decoded_events de
            LEFT JOIN mc_registry r ON de.registry_id = r.id
            LEFT JOIN mc_chains c ON r.chain_id = c.id
            ${whereClause}
            GROUP BY DATE_TRUNC('hour', de.captured_at)
            ORDER BY hour DESC
            LIMIT 24
        `;
        
        const volumeResult = await client.query(volumeQuery, queryParams);
        
        res.json({
            success: true,
            data: {
                summary: result.rows[0],
                hourly_volume: volumeResult.rows,
                timeRange,
                chainId: chainId ? parseInt(chainId) : null
            }
        });
        
    } catch (error) {
        console.error('Error fetching events analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events analytics',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/events/types
 * Get all available event types with usage statistics
 */
router.get('/types', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { chainId, timeRange = '7d' } = req.query;
        
        let whereClause = `WHERE de.captured_at > NOW() - INTERVAL '${timeRange === '1h' ? '1 hour' : timeRange === '24h' ? '24 hours' : timeRange === '30d' ? '30 days' : '7 days'}'`;
        let queryParams = [];
        
        if (chainId) {
            whereClause += ` AND c.id = $1`;
            queryParams.push(parseInt(chainId));
        }
        
        const query = `
            SELECT 
                de.event_name,
                de.event_signature,
                COUNT(*) as usage_count,
                COUNT(DISTINCT de.tx_hash) as unique_transactions,
                COUNT(DISTINCT r.address) as unique_contracts,
                MIN(de.captured_at) as first_seen,
                MAX(de.captured_at) as last_seen,
                -- Sample decoded data
                (SELECT de2.decoded_data 
                 FROM mc_decoded_events de2 
                 WHERE de2.event_name = de.event_name 
                 AND de2.decoded_data IS NOT NULL 
                 LIMIT 1) as sample_decoded_data
            FROM mc_decoded_events de
            LEFT JOIN mc_registry r ON de.registry_id = r.id
            LEFT JOIN mc_chains c ON r.chain_id = c.id
            ${whereClause}
            GROUP BY de.event_name, de.event_signature
            ORDER BY usage_count DESC
        `;
        
        const result = await client.query(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            filters: {
                chainId: chainId ? parseInt(chainId) : null,
                timeRange
            }
        });
        
    } catch (error) {
        console.error('Error fetching event types:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event types',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

module.exports = router;