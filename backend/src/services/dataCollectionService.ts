import { Pool } from 'pg';
import { pool } from '../config/database.js';

interface IndexedTransaction {
    transaction_hash: string;
    block_number: number;
    from_address: string;
    to_address: string;
    value: string;
    gas_used: number;
    gas_price: string;
    function_name?: string;
    function_inputs?: any;
    chain: string;
}

interface IndexedEvent {
    transaction_hash: string;
    block_number: number;
    log_index: number;
    event_name: string;
    event_data: any;
    chain: string;
}

export class DataCollectionService {
    private indexerPool: Pool;

    constructor() {
        // Connection to indexer database (could be same or different)
        this.indexerPool = new Pool({
            host: process.env.INDEXER_DB_HOST || process.env.DB_HOST,
            port: parseInt(process.env.INDEXER_DB_PORT || process.env.DB_PORT || '5432'),
            user: process.env.INDEXER_DB_USER || process.env.DB_USER,
            password: process.env.INDEXER_DB_PASS || process.env.DB_PASS,
            database: process.env.INDEXER_DB_NAME || process.env.DB_NAME,
        });
    }

    /**
     * Collect and sync indexed data for a specific user project
     */
    async syncProjectData(userId: string, projectId: string): Promise<void> {
        try {
            console.log(`🔄 Syncing data for project ${projectId}`);

            // Get project details
            const projectResult = await pool.query(
                'SELECT contract_address, chain FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projectResult.rows.length === 0) {
                throw new Error('Project not found');
            }

            const { contract_address, chain } = projectResult.rows[0];

            // Sync transactions
            await this.syncTransactions(userId, projectId, contract_address, chain);

            // Sync events
            await this.syncEvents(userId, projectId, contract_address, chain);

            console.log(`✅ Data sync completed for project ${projectId}`);
        } catch (error) {
            console.error(`❌ Failed to sync data for project ${projectId}:`, error);
            throw error;
        }
    }

    /**
     * Sync transactions from indexer to user-specific table
     */
    private async syncTransactions(userId: string, projectId: string, contractAddress: string, chain: string): Promise<void> {
        try {
            // Query indexer database for new transactions
            const indexerTxs = await this.indexerPool.query(`
                SELECT transaction_hash, block_number, from_address, to_address, 
                       value, gas_used, gas_price, function_name, function_inputs
                FROM contract_transactions 
                WHERE contract_address = $1 
                AND NOT EXISTS (
                    SELECT 1 FROM user_contract_transactions 
                    WHERE transaction_hash = contract_transactions.transaction_hash 
                    AND project_id = $2
                )
                ORDER BY block_number DESC
                LIMIT 1000
            `, [contractAddress, projectId]);

            // Insert into user-specific table
            for (const tx of indexerTxs.rows) {
                await pool.query(`
                    INSERT INTO user_contract_transactions 
                    (user_id, project_id, transaction_hash, block_number, from_address, to_address, 
                     value, gas_used, gas_price, function_name, function_inputs, chain)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (transaction_hash, project_id) DO NOTHING
                `, [userId, projectId, tx.transaction_hash, tx.block_number, tx.from_address, 
                    tx.to_address, tx.value, tx.gas_used, tx.gas_price, tx.function_name, 
                    tx.function_inputs, chain]);
            }

            console.log(`📊 Synced ${indexerTxs.rows.length} transactions for project ${projectId}`);
        } catch (error) {
            console.error('Failed to sync transactions:', error);
        }
    }

    /**
     * Sync events from indexer to user-specific table
     */
    private async syncEvents(userId: string, projectId: string, contractAddress: string, chain: string): Promise<void> {
        try {
            // Query indexer database for new events
            const indexerEvents = await this.indexerPool.query(`
                SELECT transaction_hash, block_number, log_index, event_name, event_data
                FROM contract_events 
                WHERE contract_address = $1 
                AND NOT EXISTS (
                    SELECT 1 FROM user_contract_events 
                    WHERE transaction_hash = contract_events.transaction_hash 
                    AND log_index = contract_events.log_index
                    AND project_id = $2
                )
                ORDER BY block_number DESC
                LIMIT 1000
            `, [contractAddress, projectId]);

            // Insert into user-specific table
            for (const event of indexerEvents.rows) {
                await pool.query(`
                    INSERT INTO user_contract_events 
                    (user_id, project_id, transaction_hash, block_number, log_index, 
                     event_name, event_data, chain)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (transaction_hash, log_index, project_id) DO NOTHING
                `, [userId, projectId, event.transaction_hash, event.block_number, 
                    event.log_index, event.event_name, event.event_data, chain]);
            }

            console.log(`📊 Synced ${indexerEvents.rows.length} events for project ${projectId}`);
        } catch (error) {
            console.error('Failed to sync events:', error);
        }
    }

    /**
     * Get user transactions with pagination
     */
    async getUserTransactions(userId: string, projectId?: string, limit: number = 50, offset: number = 0) {
        let query = `
            SELECT * FROM user_contract_transactions 
            WHERE user_id = $1
        `;
        const params: any[] = [userId];

        if (projectId) {
            query += ` AND project_id = $2`;
            params.push(projectId);
        }

        query += ` ORDER BY block_number DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Get user events with pagination
     */
    async getUserEvents(userId: string, projectId?: string, eventName?: string, limit: number = 50, offset: number = 0) {
        let query = `
            SELECT * FROM user_contract_events 
            WHERE user_id = $1
        `;
        const params: any[] = [userId];

        if (projectId) {
            query += ` AND project_id = $${params.length + 1}`;
            params.push(projectId);
        }

        if (eventName) {
            query += ` AND event_name = $${params.length + 1}`;
            params.push(eventName);
        }

        query += ` ORDER BY block_number DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Get analytics for user's project
     */
    async getProjectAnalytics(userId: string, projectId: string) {
        const [txCount, eventCount, recentActivity] = await Promise.all([
            // Transaction count
            pool.query(
                'SELECT COUNT(*) as count FROM user_contract_transactions WHERE user_id = $1 AND project_id = $2',
                [userId, projectId]
            ),
            // Event count
            pool.query(
                'SELECT COUNT(*) as count FROM user_contract_events WHERE user_id = $1 AND project_id = $2',
                [userId, projectId]
            ),
            // Recent activity (last 24h)
            pool.query(`
                SELECT COUNT(*) as count FROM user_contract_transactions 
                WHERE user_id = $1 AND project_id = $2 
                AND created_at > NOW() - INTERVAL '24 hours'
            `, [userId, projectId])
        ]);

        return {
            totalTransactions: parseInt(txCount.rows[0].count),
            totalEvents: parseInt(eventCount.rows[0].count),
            recentActivity: parseInt(recentActivity.rows[0].count)
        };
    }

    /**
     * Start periodic sync for all user projects
     */
    startPeriodicSync(intervalMs: number = 60000): void {
        setInterval(async () => {
            try {
                // Get all active projects
                const projects = await pool.query(`
                    SELECT p.id, p.user_id, p.contract_address, p.chain 
                    FROM projects p 
                    WHERE p.status = 'active' 
                    AND p.contract_address IS NOT NULL
                `);

                console.log(`🔄 Starting periodic sync for ${projects.rows.length} projects`);

                // Sync each project
                for (const project of projects.rows) {
                    try {
                        await this.syncProjectData(project.user_id, project.id);
                    } catch (error) {
                        console.error(`Failed to sync project ${project.id}:`, error.message);
                    }
                }

                console.log('✅ Periodic sync completed');
            } catch (error) {
                console.error('❌ Periodic sync failed:', error);
            }
        }, intervalMs);
    }
}

export const dataCollectionService = new DataCollectionService();
