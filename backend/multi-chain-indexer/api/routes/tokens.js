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
 * GET /api/tokens/transfers
 * Get token transfers with filtering and pagination
 */
router.get('/transfers', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const {
            chainId,
            tokenAddress,
            fromAddress,
            toAddress,
            tokenSymbol,
            transferType, // 'transfer', 'mint', 'burn'
            minAmount,
            maxAmount,
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
            whereConditions.push(`tt.captured_at > NOW() - INTERVAL '${timeRangeMap[timeRange]}'`);
        }
        
        if (chainId) {
            whereConditions.push(`tt.chain_id = $${paramIndex}`);
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }
        
        if (tokenAddress) {
            whereConditions.push(`tt.token_address = $${paramIndex}`);
            queryParams.push(tokenAddress.toLowerCase());
            paramIndex++;
        }
        
        if (fromAddress) {
            whereConditions.push(`tt.from_address = $${paramIndex}`);
            queryParams.push(fromAddress.toLowerCase());
            paramIndex++;
        }
        
        if (toAddress) {
            whereConditions.push(`tt.to_address = $${paramIndex}`);
            queryParams.push(toAddress.toLowerCase());
            paramIndex++;
        }
        
        if (tokenSymbol) {
            whereConditions.push(`tt.token_symbol ILIKE $${paramIndex}`);
            queryParams.push(`%${tokenSymbol}%`);
            paramIndex++;
        }
        
        if (transferType) {
            whereConditions.push(`tt.transfer_type = $${paramIndex}`);
            queryParams.push(transferType);
            paramIndex++;
        }
        
        if (minAmount) {
            whereConditions.push(`tt.amount_formatted >= $${paramIndex}`);
            queryParams.push(parseFloat(minAmount));
            paramIndex++;
        }
        
        if (maxAmount) {
            whereConditions.push(`tt.amount_formatted <= $${paramIndex}`);
            queryParams.push(parseFloat(maxAmount));
            paramIndex++;
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Validate sort parameters
        const validSortColumns = ['captured_at', 'amount_formatted', 'block_number'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'captured_at';
        const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        const query = `
            SELECT 
                tt.id,
                tt.tx_hash,
                tt.block_number,
                tt.log_index,
                tt.token_address,
                tt.token_name,
                tt.token_symbol,
                tt.token_decimals,
                tt.from_address,
                tt.to_address,
                tt.amount_raw,
                tt.amount_formatted,
                tt.usd_value,
                tt.transfer_type,
                tt.captured_at,
                c.name as chain_name
            FROM mc_token_transfers tt
            JOIN mc_chains c ON tt.chain_id = c.id
            ${whereClause}
            ORDER BY tt.${finalSortBy} ${finalSortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await client.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM mc_token_transfers tt
            JOIN mc_chains c ON tt.chain_id = c.id
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
                tokenAddress,
                fromAddress,
                toAddress,
                tokenSymbol,
                transferType,
                minAmount: minAmount ? parseFloat(minAmount) : null,
                maxAmount: maxAmount ? parseFloat(maxAmount) : null,
                timeRange,
                sortBy: finalSortBy,
                sortOrder: finalSortOrder
            }
        });
        
    } catch (error) {
        console.error('Error fetching token transfers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch token transfers',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/tokens/analytics/summary
 * Get token transfer analytics summary
 */
router.get('/analytics/summary', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { chainId, timeRange = '24h' } = req.query;
        
        let whereClause = `WHERE tt.captured_at > NOW() - INTERVAL '${timeRange === '1h' ? '1 hour' : timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '24 hours'}'`;
        let queryParams = [];
        
        if (chainId) {
            whereClause += ` AND tt.chain_id = $1`;
            queryParams.push(parseInt(chainId));
        }
        
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_transfers,
                COUNT(DISTINCT tt.token_address) as unique_tokens,
                COUNT(DISTINCT tt.from_address) as unique_senders,
                COUNT(DISTINCT tt.to_address) as unique_receivers,
                COUNT(CASE WHEN tt.transfer_type = 'transfer' THEN 1 END) as regular_transfers,
                COUNT(CASE WHEN tt.transfer_type = 'mint' THEN 1 END) as mints,
                COUNT(CASE WHEN tt.transfer_type = 'burn' THEN 1 END) as burns,
                SUM(CASE WHEN tt.usd_value IS NOT NULL THEN tt.usd_value ELSE 0 END) as total_usd_value,
                -- Top tokens by transfer count
                (SELECT json_agg(token_stats ORDER BY transfer_count DESC) 
                 FROM (
                     SELECT 
                         tt2.token_address,
                         tt2.token_symbol,
                         tt2.token_name,
                         COUNT(*) as transfer_count,
                         SUM(tt2.amount_formatted) as total_amount,
                         COUNT(DISTINCT tt2.from_address) as unique_senders,
                         COUNT(DISTINCT tt2.to_address) as unique_receivers
                     FROM mc_token_transfers tt2
                     ${whereClause.replace('tt.', 'tt2.')}
                     GROUP BY tt2.token_address, tt2.token_symbol, tt2.token_name
                     ORDER BY COUNT(*) DESC
                     LIMIT 10
                 ) token_stats
                ) as top_tokens_by_volume,
                -- Top tokens by USD value
                (SELECT json_agg(value_stats ORDER BY total_usd DESC) 
                 FROM (
                     SELECT 
                         tt2.token_address,
                         tt2.token_symbol,
                         tt2.token_name,
                         COUNT(*) as transfer_count,
                         SUM(CASE WHEN tt2.usd_value IS NOT NULL THEN tt2.usd_value ELSE 0 END) as total_usd
                     FROM mc_token_transfers tt2
                     ${whereClause.replace('tt.', 'tt2.')}
                     AND tt2.usd_value IS NOT NULL
                     GROUP BY tt2.token_address, tt2.token_symbol, tt2.token_name
                     HAVING SUM(tt2.usd_value) > 0
                     ORDER BY SUM(tt2.usd_value) DESC
                     LIMIT 10
                 ) value_stats
                ) as top_tokens_by_value
            FROM mc_token_transfers tt
            ${whereClause}
        `;
        
        const result = await client.query(summaryQuery, queryParams);
        
        // Get hourly transfer volume
        const volumeQuery = `
            SELECT 
                DATE_TRUNC('hour', tt.captured_at) as hour,
                COUNT(*) as transfer_count,
                COUNT(DISTINCT tt.token_address) as unique_tokens,
                SUM(CASE WHEN tt.usd_value IS NOT NULL THEN tt.usd_value ELSE 0 END) as total_usd_value
            FROM mc_token_transfers tt
            ${whereClause}
            GROUP BY DATE_TRUNC('hour', tt.captured_at)
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
        console.error('Error fetching token analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch token analytics',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/tokens/:tokenAddress
 * Get detailed information about a specific token
 */
router.get('/:tokenAddress', async (req, res) => {
    const client = getDbClient();
    const { tokenAddress } = req.params;
    
    try {
        await client.connect();
        
        const { chainId, timeRange = '7d' } = req.query;
        
        let whereClause = `WHERE tt.token_address = $1`;
        let queryParams = [tokenAddress.toLowerCase()];
        let paramIndex = 2;
        
        if (chainId) {
            whereClause += ` AND tt.chain_id = $${paramIndex}`;
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }
        
        if (timeRange) {
            const timeRangeMap = {
                '1h': '1 hour',
                '24h': '24 hours',
                '7d': '7 days',
                '30d': '30 days'
            };
            
            if (timeRangeMap[timeRange]) {
                whereClause += ` AND tt.captured_at > NOW() - INTERVAL '${timeRangeMap[timeRange]}'`;
            }
        }
        
        // Get token details and statistics
        const tokenQuery = `
            SELECT 
                tt.token_address,
                tt.token_name,
                tt.token_symbol,
                tt.token_decimals,
                c.name as chain_name,
                c.id as chain_id,
                COUNT(*) as total_transfers,
                COUNT(DISTINCT tt.from_address) as unique_senders,
                COUNT(DISTINCT tt.to_address) as unique_receivers,
                COUNT(CASE WHEN tt.transfer_type = 'transfer' THEN 1 END) as regular_transfers,
                COUNT(CASE WHEN tt.transfer_type = 'mint' THEN 1 END) as mints,
                COUNT(CASE WHEN tt.transfer_type = 'burn' THEN 1 END) as burns,
                SUM(tt.amount_formatted) as total_volume,
                AVG(tt.amount_formatted) as avg_transfer_amount,
                MAX(tt.amount_formatted) as max_transfer_amount,
                MIN(tt.captured_at) as first_transfer,
                MAX(tt.captured_at) as last_transfer
            FROM mc_token_transfers tt
            JOIN mc_chains c ON tt.chain_id = c.id
            ${whereClause}
            GROUP BY tt.token_address, tt.token_name, tt.token_symbol, tt.token_decimals, c.name, c.id
        `;
        
        const tokenResult = await client.query(tokenQuery, queryParams);
        
        if (tokenResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Token not found'
            });
        }
        
        // Get recent transfers
        const recentTransfersQuery = `
            SELECT 
                tt.tx_hash,
                tt.from_address,
                tt.to_address,
                tt.amount_formatted,
                tt.transfer_type,
                tt.captured_at,
                tt.block_number
            FROM mc_token_transfers tt
            ${whereClause}
            ORDER BY tt.captured_at DESC
            LIMIT 20
        `;
        
        const recentTransfersResult = await client.query(recentTransfersQuery, queryParams);
        
        // Get top holders (by transfer volume)
        const holdersQuery = `
            SELECT 
                address,
                SUM(net_amount) as net_balance,
                COUNT(*) as transfer_count
            FROM (
                SELECT 
                    tt.to_address as address,
                    SUM(tt.amount_formatted) as net_amount
                FROM mc_token_transfers tt
                ${whereClause}
                GROUP BY tt.to_address
                
                UNION ALL
                
                SELECT 
                    tt.from_address as address,
                    -SUM(tt.amount_formatted) as net_amount
                FROM mc_token_transfers tt
                ${whereClause}
                AND tt.from_address != '0x0000000000000000000000000000000000000000'
                GROUP BY tt.from_address
            ) combined
            GROUP BY address
            HAVING SUM(net_amount) > 0
            ORDER BY SUM(net_amount) DESC
            LIMIT 20
        `;
        
        const holdersResult = await client.query(holdersQuery, queryParams);
        
        // Get daily transfer volume
        const dailyVolumeQuery = `
            SELECT 
                DATE_TRUNC('day', tt.captured_at) as day,
                COUNT(*) as transfer_count,
                SUM(tt.amount_formatted) as volume,
                COUNT(DISTINCT tt.from_address) as unique_senders,
                COUNT(DISTINCT tt.to_address) as unique_receivers
            FROM mc_token_transfers tt
            ${whereClause}
            GROUP BY DATE_TRUNC('day', tt.captured_at)
            ORDER BY day DESC
            LIMIT 30
        `;
        
        const dailyVolumeResult = await client.query(dailyVolumeQuery, queryParams);
        
        res.json({
            success: true,
            data: {
                token_info: tokenResult.rows[0],
                recent_transfers: recentTransfersResult.rows,
                top_holders: holdersResult.rows,
                daily_volume: dailyVolumeResult.rows
            },
            filters: {
                tokenAddress,
                chainId: chainId ? parseInt(chainId) : null,
                timeRange
            }
        });
        
    } catch (error) {
        console.error('Error fetching token details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch token details',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/tokens/list
 * Get list of all tokens with basic statistics
 */
router.get('/list', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        const { chainId, limit = 100, offset = 0, sortBy = 'transfer_count', sortOrder = 'DESC' } = req.query;
        
        let whereClause = '';
        let queryParams = [];
        
        if (chainId) {
            whereClause = 'WHERE tt.chain_id = $1';
            queryParams.push(parseInt(chainId));
        }
        
        const validSortColumns = ['transfer_count', 'unique_holders', 'total_volume', 'token_symbol'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'transfer_count';
        const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        const query = `
            SELECT 
                tt.token_address,
                tt.token_name,
                tt.token_symbol,
                tt.token_decimals,
                c.name as chain_name,
                c.id as chain_id,
                COUNT(*) as transfer_count,
                COUNT(DISTINCT tt.from_address) + COUNT(DISTINCT tt.to_address) as unique_holders,
                SUM(tt.amount_formatted) as total_volume,
                MIN(tt.captured_at) as first_seen,
                MAX(tt.captured_at) as last_activity
            FROM mc_token_transfers tt
            JOIN mc_chains c ON tt.chain_id = c.id
            ${whereClause}
            GROUP BY tt.token_address, tt.token_name, tt.token_symbol, tt.token_decimals, c.name, c.id
            ORDER BY ${finalSortBy} ${finalSortOrder}
            LIMIT ${limit} OFFSET ${offset}
        `;
        
        const result = await client.query(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            filters: {
                chainId: chainId ? parseInt(chainId) : null,
                limit: parseInt(limit),
                offset: parseInt(offset),
                sortBy: finalSortBy,
                sortOrder: finalSortOrder
            }
        });
        
    } catch (error) {
        console.error('Error fetching token list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch token list',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

module.exports = router;