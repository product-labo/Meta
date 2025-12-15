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
 * GET /api/chains
 * Get all monitored chains with their current status
 */
router.get('/', async (req, res) => {
    const client = getDbClient();
    
    try {
        await client.connect();
        
        // Get chains with latest snapshot data
        const query = `
            SELECT 
                c.id,
                c.name,
                c.id as chain_id,
                c.rpc_urls,
                c.block_time_sec,
                c.is_active,
                -- Latest snapshot info
                cs.block_number as latest_block,
                cs.block_timestamp as latest_block_time,
                cs.gas_price as current_gas_price,
                -- Contract count
                (SELECT COUNT(*) FROM mc_registry WHERE chain_id = c.id) as monitored_contracts,
                -- Recent activity stats
                (SELECT COUNT(*) FROM mc_event_logs el 
                 JOIN mc_registry r ON el.registry_id = r.id 
                 WHERE r.chain_id = c.id 
                 AND el.captured_at > NOW() - INTERVAL '1 hour') as events_last_hour,
                -- Transaction count today
                (SELECT COUNT(*) FROM mc_transaction_details td 
                 WHERE td.chain_id = c.id 
                 AND td.captured_at > CURRENT_DATE) as transactions_today
            FROM mc_chains c
            LEFT JOIN LATERAL (
                SELECT block_number, block_timestamp, gas_price
                FROM mc_chain_snapshots 
                WHERE chain_id = c.id 
                ORDER BY captured_at DESC 
                LIMIT 1
            ) cs ON true
            ORDER BY c.name
        `;
        
        const result = await client.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching chains:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chain data',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/chains/:chainId
 * Get detailed information about a specific chain
 */
router.get('/:chainId', async (req, res) => {
    const client = getDbClient();
    const { chainId } = req.params;
    
    try {
        await client.connect();
        
        // Get chain details with comprehensive stats
        const chainQuery = `
            SELECT 
                c.*,
                -- Latest snapshot
                cs.block_number as latest_block,
                cs.block_timestamp as latest_block_time,
                cs.gas_price as current_gas_price,
                cs.fee_history_json,
                -- Contract stats
                (SELECT COUNT(*) FROM mc_registry WHERE chain_id = c.id) as total_contracts,
                (SELECT COUNT(*) FROM mc_registry WHERE chain_id = c.id AND monitor_events = true) as monitored_contracts,
                -- Activity stats (last 24 hours)
                (SELECT COUNT(*) FROM mc_transaction_details WHERE chain_id = c.id AND captured_at > NOW() - INTERVAL '24 hours') as transactions_24h,
                (SELECT COUNT(*) FROM mc_event_logs el JOIN mc_registry r ON el.registry_id = r.id WHERE r.chain_id = c.id AND el.captured_at > NOW() - INTERVAL '24 hours') as events_24h,
                (SELECT COUNT(*) FROM mc_defi_interactions WHERE chain_id = c.id AND captured_at > NOW() - INTERVAL '24 hours') as defi_interactions_24h,
                -- Total stats
                (SELECT COUNT(*) FROM mc_transaction_details WHERE chain_id = c.id) as total_transactions,
                (SELECT COUNT(*) FROM mc_event_logs el JOIN mc_registry r ON el.registry_id = r.id WHERE r.chain_id = c.id) as total_events
            FROM mc_chains c
            LEFT JOIN LATERAL (
                SELECT block_number, block_timestamp, gas_price, fee_history_json
                FROM mc_chain_snapshots 
                WHERE chain_id = c.id 
                ORDER BY captured_at DESC 
                LIMIT 1
            ) cs ON true
            WHERE c.id = $1
        `;
        
        const chainResult = await client.query(chainQuery, [chainId]);
        
        if (chainResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Chain not found'
            });
        }
        
        // Get recent snapshots for trend data
        const snapshotsQuery = `
            SELECT 
                block_number,
                block_timestamp,
                gas_price,
                captured_at
            FROM mc_chain_snapshots 
            WHERE chain_id = $1 
            ORDER BY captured_at DESC 
            LIMIT 24
        `;
        
        const snapshotsResult = await client.query(snapshotsQuery, [chainId]);
        
        // Get monitored contracts
        const contractsQuery = `
            SELECT 
                id,
                address,
                name,
                contract_type,
                monitor_events,
                created_at,
                -- Recent activity
                (SELECT COUNT(*) FROM mc_event_logs WHERE registry_id = r.id AND captured_at > NOW() - INTERVAL '24 hours') as events_24h
            FROM mc_registry r
            WHERE chain_id = $1
            ORDER BY name
        `;
        
        const contractsResult = await client.query(contractsQuery, [chainId]);
        
        res.json({
            success: true,
            data: {
                chain: chainResult.rows[0],
                recent_snapshots: snapshotsResult.rows,
                monitored_contracts: contractsResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error fetching chain details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chain details',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

/**
 * GET /api/chains/:chainId/activity
 * Get recent activity timeline for a chain
 */
router.get('/:chainId/activity', async (req, res) => {
    const client = getDbClient();
    const { chainId } = req.params;
    const { hours = 24, limit = 100 } = req.query;
    
    try {
        await client.connect();
        
        const query = `
            SELECT 
                'transaction' as type,
                td.tx_hash as id,
                td.function_name as action,
                td.from_address,
                td.to_address,
                td.value,
                td.gas_used,
                td.status,
                td.captured_at,
                td.block_number
            FROM mc_transaction_details td
            WHERE td.chain_id = $1 
            AND td.captured_at > NOW() - INTERVAL '${hours} hours'
            
            UNION ALL
            
            SELECT 
                'defi' as type,
                di.tx_hash as id,
                CONCAT(di.protocol_name, ' ', di.interaction_type) as action,
                di.user_address as from_address,
                di.contract_address as to_address,
                NULL as value,
                NULL as gas_used,
                1 as status,
                di.captured_at,
                di.block_number
            FROM mc_defi_interactions di
            WHERE di.chain_id = $1 
            AND di.captured_at > NOW() - INTERVAL '${hours} hours'
            
            ORDER BY captured_at DESC
            LIMIT $2
        `;
        
        const result = await client.query(query, [chainId, limit]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            filters: {
                chainId: parseInt(chainId),
                hours: parseInt(hours),
                limit: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching chain activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chain activity',
            message: error.message
        });
    } finally {
        await client.end();
    }
});

module.exports = router;