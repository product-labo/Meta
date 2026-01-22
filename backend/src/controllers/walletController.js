/**
 * JavaScript version of wallet controller for testing
 */

import { pool } from '../config/appConfig.js';
import { validateAddress, SUPPORTED_CHAINS } from '../middleware/validation.js';

// Helper to validate address type (legacy for existing functionality)
const getAddressType = (address) => {
    if (address.startsWith('t1') || address.startsWith('t3')) return 't';
    if (address.startsWith('zs')) return 'z';
    if (address.startsWith('u1')) return 'u';
    return null;
};

export const createWallet = async (req, res) => {
    const { projectId } = req.params;
    const { address, description, chain } = req.body;

    if (!address) {
        return res.status(400).json({ status: 'error', data: { error: 'Address is required' } });
    }

    if (!chain) {
        return res.status(400).json({ status: 'error', data: { error: 'Chain is required' } });
    }

    // Validate address format for the specified chain
    const validation = validateAddress(address, chain);
    if (!validation.valid) {
        return res.status(400).json({ status: 'error', data: { error: validation.error } });
    }

    // Get chain configuration
    const chainConfig = SUPPORTED_CHAINS[chain];
    if (!chainConfig) {
        return res.status(400).json({ status: 'error', data: { error: `Unsupported chain: ${chain}` } });
    }

    try {
        // Verify project ownership
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Project not found or unauthorized' } });
        }

        // Check for duplicate wallet
        const duplicateCheck = await pool.query(
            'SELECT id FROM wallets WHERE project_id = $1 AND address = $2 AND chain = $3',
            [projectId, address, chain]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ status: 'error', data: { error: 'Wallet already exists for this project and chain' } });
        }

        // Create wallet with multi-chain support
        // For legacy compatibility, set type to 't' for all new multi-chain wallets
        const result = await pool.query(
            `INSERT INTO wallets (
                project_id, address, type, chain, chain_type, description, is_active,
                last_indexed_block, total_transactions, total_events
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [projectId, address, 't', chain, chainConfig.type, description, true, 0, 0, 0]
        );

        const wallet = result.rows[0];

        // Create initial indexing job
        const jobResult = await pool.query(
            `INSERT INTO indexing_jobs (
                wallet_id, project_id, status, start_block, end_block, priority
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [wallet.id, projectId, 'queued', 0, 999999999, 1] // High priority for new wallets
        );

        res.status(201).json({ 
            status: 'success', 
            data: {
                ...wallet,
                indexingJobId: jobResult.rows[0].id,
                indexingStatus: 'queued'
            }
        });
    } catch (error) {
        console.error('Create wallet error:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ status: 'error', data: { error: 'Wallet already exists for this project and chain' } });
        }
        res.status(500).json({ status: 'error', data: { error: 'Failed to create wallet' } });
    }
};

export const getWallets = async (req, res) => {
    const { projectId } = req.params;

    try {
        // Verify project ownership
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Project not found or unauthorized' } });
        }

        // Get wallets with latest indexing job status
        const result = await pool.query(
            `SELECT 
                w.*,
                ij.status as indexing_status,
                ij.current_block,
                ij.start_block,
                ij.end_block,
                ij.transactions_found,
                ij.events_found,
                ij.blocks_per_second,
                ij.error_message,
                ij.started_at,
                ij.completed_at
            FROM wallets w
            LEFT JOIN LATERAL (
                SELECT * FROM indexing_jobs 
                WHERE wallet_id = w.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) ij ON true
            WHERE w.project_id = $1 
            ORDER BY w.created_at DESC`,
            [projectId]
        );

        // Transform data to include indexing status
        const wallets = result.rows.map(row => ({
            id: row.id,
            address: row.address,
            chain: row.chain,
            chain_type: row.chain_type,
            description: row.description,
            is_active: row.is_active,
            last_indexed_block: row.last_indexed_block,
            last_synced_at: row.last_synced_at,
            total_transactions: row.total_transactions,
            total_events: row.total_events,
            created_at: row.created_at,
            updated_at: row.updated_at,
            indexingStatus: {
                state: row.indexing_status || 'ready',
                currentBlock: row.current_block,
                startBlock: row.start_block,
                endBlock: row.end_block,
                transactionsFound: row.transactions_found,
                eventsFound: row.events_found,
                blocksPerSecond: row.blocks_per_second,
                errorMessage: row.error_message,
                startedAt: row.started_at,
                completedAt: row.completed_at
            }
        }));

        res.json({ status: 'success', data: wallets });
    } catch (error) {
        console.error('Get wallets error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve wallets' } });
    }
};

export const getWallet = async (req, res) => {
    const { projectId, walletId } = req.params;

    try {
        // Get wallet with latest indexing job status
        const result = await pool.query(
            `SELECT 
                w.*,
                ij.status as indexing_status,
                ij.current_block,
                ij.start_block,
                ij.end_block,
                ij.transactions_found,
                ij.events_found,
                ij.blocks_per_second,
                ij.error_message,
                ij.started_at,
                ij.completed_at
            FROM wallets w
            JOIN projects p ON w.project_id = p.id
            LEFT JOIN LATERAL (
                SELECT * FROM indexing_jobs 
                WHERE wallet_id = w.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) ij ON true
            WHERE w.id = $1 AND w.project_id = $2 AND p.user_id = $3`,
            [walletId, projectId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Wallet not found' } });
        }

        const row = result.rows[0];
        const wallet = {
            id: row.id,
            address: row.address,
            chain: row.chain,
            chain_type: row.chain_type,
            description: row.description,
            is_active: row.is_active,
            last_indexed_block: row.last_indexed_block,
            last_synced_at: row.last_synced_at,
            total_transactions: row.total_transactions,
            total_events: row.total_events,
            created_at: row.created_at,
            updated_at: row.updated_at,
            indexingStatus: {
                state: row.indexing_status || 'ready',
                currentBlock: row.current_block,
                startBlock: row.start_block,
                endBlock: row.end_block,
                transactionsFound: row.transactions_found,
                eventsFound: row.events_found,
                blocksPerSecond: row.blocks_per_second,
                errorMessage: row.error_message,
                startedAt: row.started_at,
                completedAt: row.completed_at
            }
        };

        res.json({ status: 'success', data: wallet });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve wallet' } });
    }
};

/**
 * Refresh wallet data by creating incremental indexing job
 */
export const refreshWallet = async (req, res) => {
    const { projectId, walletId } = req.params;

    try {
        // Verify wallet ownership
        const walletResult = await pool.query(
            `SELECT w.* FROM wallets w
             JOIN projects p ON w.project_id = p.id
             WHERE w.id = $1 AND w.project_id = $2 AND p.user_id = $3`,
            [walletId, projectId, req.user.id]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Wallet not found' } });
        }

        const wallet = walletResult.rows[0];

        // Check if there's already an active indexing job
        const activeJobResult = await pool.query(
            `SELECT id FROM indexing_jobs 
             WHERE wallet_id = $1 AND status IN ('queued', 'running')
             ORDER BY created_at DESC LIMIT 1`,
            [walletId]
        );

        if (activeJobResult.rows.length > 0) {
            return res.status(409).json({ 
                status: 'error', 
                data: { error: 'Indexing job already in progress for this wallet' } 
            });
        }

        // Create incremental indexing job from last indexed block
        const startBlock = parseInt(wallet.last_indexed_block) + 1;
        const currentBlock = 999999999; // Will be updated by indexer with actual current block

        const jobResult = await pool.query(
            `INSERT INTO indexing_jobs (
                wallet_id, project_id, status, start_block, end_block, priority
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [walletId, projectId, 'queued', startBlock, currentBlock, 2] // Higher priority for refresh
        );

        res.json({ 
            status: 'success', 
            data: {
                indexingJobId: jobResult.rows[0].id,
                startBlock: startBlock,
                currentBlock: currentBlock,
                message: 'Refresh job queued successfully'
            }
        });
    } catch (error) {
        console.error('Refresh wallet error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to refresh wallet' } });
    }
};

/**
 * Get indexing status for a specific wallet
 */
export const getIndexingStatus = async (req, res) => {
    const { projectId, walletId } = req.params;

    try {
        // Verify wallet ownership and get latest indexing job
        const result = await pool.query(
            `SELECT 
                w.id as wallet_id,
                w.last_indexed_block,
                w.last_synced_at,
                w.total_transactions,
                w.total_events,
                ij.id as job_id,
                ij.status,
                ij.start_block,
                ij.end_block,
                ij.current_block,
                ij.transactions_found,
                ij.events_found,
                ij.blocks_per_second,
                ij.error_message,
                ij.started_at,
                ij.completed_at,
                ij.created_at as job_created_at
            FROM wallets w
            JOIN projects p ON w.project_id = p.id
            LEFT JOIN LATERAL (
                SELECT * FROM indexing_jobs 
                WHERE wallet_id = w.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) ij ON true
            WHERE w.id = $1 AND w.project_id = $2 AND p.user_id = $3`,
            [walletId, projectId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Wallet not found' } });
        }

        const row = result.rows[0];
        
        // Calculate progress metrics
        let progressPercentage = 0;
        let estimatedTimeRemaining = 0;

        if ((row.status === 'running' || row.status === 'failed') && row.start_block != null && row.end_block != null && row.current_block != null) {
            const totalBlocks = parseInt(row.end_block) - parseInt(row.start_block);
            const processedBlocks = parseInt(row.current_block) - parseInt(row.start_block);
            progressPercentage = totalBlocks > 0 ? Math.min((processedBlocks / totalBlocks) * 100, 100) : 0;
            
            if (row.blocks_per_second > 0 && row.status === 'running') {
                const remainingBlocks = parseInt(row.end_block) - parseInt(row.current_block);
                estimatedTimeRemaining = Math.ceil(remainingBlocks / parseFloat(row.blocks_per_second));
            }
        } else if (row.status === 'completed') {
            progressPercentage = 100;
        }

        const statusData = {
            walletId: row.wallet_id,
            indexingStatus: row.status || 'ready',
            progress: {
                percentage: progressPercentage,
                currentBlock: row.current_block || 0,
                totalBlocks: (row.end_block && row.start_block) ? parseInt(row.end_block) - parseInt(row.start_block) : 0,
                transactionsFound: row.transactions_found || 0,
                eventsFound: row.events_found || 0,
                blocksPerSecond: parseFloat(row.blocks_per_second) || 0,
                estimatedTimeRemaining: estimatedTimeRemaining
            },
            lastIndexedBlock: row.last_indexed_block || 0,
            lastSyncedAt: row.last_synced_at,
            totalTransactions: row.total_transactions || 0,
            totalEvents: row.total_events || 0,
            errorMessage: row.error_message,
            jobStartedAt: row.started_at,
            jobCompletedAt: row.completed_at
        };

        res.json({ status: 'success', data: statusData });
    } catch (error) {
        console.error('Get indexing status error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve indexing status' } });
    }
};/**
 
* Retry failed indexing job
 */
export const retryIndexing = async (req, res) => {
    try {
        const { projectId, walletId } = req.params;
        const userId = req.user.id;

        // Verify wallet belongs to user's project
        const walletResult = await pool.query(
            `SELECT w.*, p.user_id 
             FROM wallets w 
             JOIN projects p ON w.project_id = p.id 
             WHERE w.id = $1 AND w.project_id = $2 AND p.user_id = $3`,
            [walletId, projectId, userId]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                data: { error: 'Wallet not found or access denied' }
            });
        }

        const wallet = walletResult.rows[0];

        // Check for failed batches
        const failedBatchesResult = await pool.query(
            `SELECT start_block, end_block, error_message, retry_count, created_at, updated_at
             FROM indexing_batch_errors 
             WHERE wallet_id = $1 
             ORDER BY start_block ASC`,
            [walletId]
        );

        const failedBatches = failedBatchesResult.rows;
        
        if (failedBatches.length === 0) {
            return res.status(400).json({
                status: 'error',
                data: { error: 'No failed batches to retry' }
            });
        }

        // Create retry job
        const startBlock = Math.min(...failedBatches.map(b => b.start_block));
        const endBlock = Math.max(...failedBatches.map(b => b.end_block));

        const retryJobResult = await pool.query(
            `INSERT INTO indexing_jobs (
                wallet_id, project_id, status, start_block, end_block, priority, is_retry, failed_batch_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [walletId, projectId, 'queued', startBlock, endBlock, 10, true, failedBatches.length]
        );

        // Clear the failed batches since we're retrying them
        await pool.query(
            'DELETE FROM indexing_batch_errors WHERE wallet_id = $1',
            [walletId]
        );

        res.json({
            status: 'success',
            data: {
                retryJobId: retryJobResult.rows[0].id,
                failedBatchCount: failedBatches.length,
                startBlock,
                endBlock,
                message: `Retry job created for ${failedBatches.length} failed batches`
            }
        });

    } catch (error) {
        console.error('Error retrying indexing:', error);
        res.status(500).json({
            status: 'error',
            data: { error: 'Failed to retry indexing' }
        });
    }
};

/**
 * Get indexing error details
 */
export const getIndexingErrors = async (req, res) => {
    try {
        const { projectId, walletId } = req.params;
        const userId = req.user.id;

        // Verify wallet belongs to user's project
        const walletResult = await pool.query(
            `SELECT w.*, p.user_id 
             FROM wallets w 
             JOIN projects p ON w.project_id = p.id 
             WHERE w.id = $1 AND w.project_id = $2 AND p.user_id = $3`,
            [walletId, projectId, userId]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                data: { error: 'Wallet not found or access denied' }
            });
        }

        // Get failed batches
        const failedBatchesResult = await pool.query(
            `SELECT start_block, end_block, error_message, retry_count, created_at, updated_at
             FROM indexing_batch_errors 
             WHERE wallet_id = $1 
             ORDER BY start_block ASC`,
            [walletId]
        );

        // Get current job status
        const currentJobResult = await pool.query(
            `SELECT id, status, error_message, is_retry, failed_batch_count, rpc_endpoint_status
             FROM indexing_jobs 
             WHERE wallet_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [walletId]
        );

        const failedBatches = failedBatchesResult.rows;
        const currentJob = currentJobResult.rows[0] || null;

        res.json({
            status: 'success',
            data: {
                walletId,
                failedBatches: failedBatches.map(batch => ({
                    startBlock: batch.start_block,
                    endBlock: batch.end_block,
                    errorMessage: batch.error_message,
                    retryCount: batch.retry_count,
                    createdAt: batch.created_at,
                    updatedAt: batch.updated_at
                })),
                currentJobStatus: currentJob ? {
                    id: currentJob.id,
                    status: currentJob.status,
                    errorMessage: currentJob.error_message,
                    isRetry: currentJob.is_retry,
                    failedBatchCount: currentJob.failed_batch_count
                } : null,
                rpcEndpointStatus: currentJob?.rpc_endpoint_status || null,
                canRetry: failedBatches.length > 0 && (!currentJob || currentJob.status !== 'running'),
                summary: {
                    totalFailedBatches: failedBatches.length,
                    totalFailedBlocks: failedBatches.reduce((sum, batch) => sum + (batch.end_block - batch.start_block + 1), 0),
                    hasActiveRetry: currentJob?.is_retry && currentJob?.status === 'running'
                }
            }
        });

    } catch (error) {
        console.error('Error getting indexing errors:', error);
        res.status(500).json({
            status: 'error',
            data: { error: 'Failed to get indexing errors' }
        });
    }
};