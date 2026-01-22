import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { validateAddress, detectChainType, SUPPORTED_CHAINS } from '../middleware/validation.js';
import { indexingOrchestrator } from '../services/indexingOrchestratorService.js';

// Helper to validate address type (legacy for existing functionality)
const getAddressType = (address: string): 't' | 'z' | 'u' | null => {
    if (address.startsWith('t1') || address.startsWith('t3')) return 't';
    if (address.startsWith('zs')) return 'z';
    if (address.startsWith('u1')) return 'u';
    return null;
};

export const createWallet = async (req: Request, res: Response) => {
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

        // Determine wallet type based on address format (for legacy compatibility)
        const walletType = getAddressType(address) || 't'; // Default to 't' for non-Zcash addresses

        // Create wallet with multi-chain support
        const result = await pool.query(
            `INSERT INTO wallets (
                project_id, address, type, chain, chain_type, description, is_active,
                last_indexed_block, total_transactions, total_events
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [projectId, address, walletType, chain, chainConfig.type, description, true, 0, 0, 0]
        );

        const wallet = result.rows[0];

        // Create initial indexing job using orchestrator
        const jobId = await indexingOrchestrator.queueIndexingJob({
            walletId: wallet.id,
            projectId: projectId,
            address: address,
            chain: chain,
            chainType: chainConfig.type,
            startBlock: 0,
            endBlock: 999999999, // Will be updated to current block by indexer
            priority: 1 // High priority for new wallets
        });

        res.status(201).json({ 
            status: 'success', 
            data: {
                ...wallet,
                indexingJobId: jobId,
                indexingStatus: 'queued'
            }
        });
    } catch (error: any) {
        console.error('Create wallet error:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ status: 'error', data: { error: 'Wallet already exists for this project and chain' } });
        }
        res.status(500).json({ status: 'error', data: { error: 'Failed to create wallet' } });
    }
};

export const getWallets = async (req: Request, res: Response) => {
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

export const getWallet = async (req: Request, res: Response) => {
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

export const updateWallet = async (req: Request, res: Response) => {
    const { projectId, walletId } = req.params;
    const { privacy_mode, description, is_active } = req.body;

    try {
        const result = await pool.query(
            `UPDATE wallets w
             SET privacy_mode = COALESCE($1, privacy_mode),
                 description = COALESCE($2, w.description),
                 is_active = COALESCE($3, w.is_active),
                 updated_at = NOW()
             FROM projects p
             WHERE w.id = $4 AND w.project_id = $5 AND w.project_id = p.id AND p.user_id = $6
             RETURNING w.*`,
            [privacy_mode, description, is_active, walletId, projectId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Wallet not found or unauthorized' } });
        }

        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Update wallet error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to update wallet' } });
    }
};

export const deleteWallet = async (req: Request, res: Response) => {
    const { projectId, walletId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM wallets w
             USING projects p
             WHERE w.id = $1 AND w.project_id = $2 AND w.project_id = p.id AND p.user_id = $3
             RETURNING w.id`,
            [walletId, projectId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Wallet not found or unauthorized' } });
        }

        res.json({ status: 'success', data: { message: 'Wallet deleted' } });
    } catch (error) {
        console.error('Delete wallet error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to delete wallet' } });
    }
};

export const validateWallet = async (req: Request, res: Response) => {
    const { address, network = 'mainnet' } = req.body;

    if (!address) {
        return res.status(400).json({ status: 'error', data: { error: 'Address is required' } });
    }

    const type = getAddressType(address);
    if (!type) {
        return res.status(200).json({ status: 'error', data: { valid: false, error: 'Invalid address format' } });
    }

    const typeNames: Record<string, string> = {
        't': 'Transparent',
        'z': 'Shielded',
        'u': 'Unified'
    };

    res.json({
        status: 'success',
        data: {
            valid: true,
            type,
            typeName: typeNames[type],
            network
        }
    });
};

export const getWalletsByType = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { type } = req.query;

    if (!type) {
        return res.status(400).json({ status: 'error', data: { error: 'Type is required' } });
    }

    try {
        const result = await pool.query(
            `SELECT w.* FROM wallets w
             JOIN projects p ON w.project_id = p.id
             WHERE w.project_id = $1 AND p.user_id = $2 AND w.type = $3`,
            [projectId, req.user.id, type]
        );

        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Get wallets by type error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve wallets' } });
    }
};

export const getActiveWallets = async (req: Request, res: Response) => {
    const { projectId } = req.params;

    try {
        const result = await pool.query(
            `SELECT w.* FROM wallets w
             JOIN projects p ON w.project_id = p.id
             WHERE w.project_id = $1 AND p.user_id = $2 AND w.is_active = true`,
            [projectId, req.user.id]
        );

        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Get active wallets error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve wallets' } });
    }
};

export const getUserWallets = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT w.* FROM wallets w
             JOIN projects p ON w.project_id = p.id
             WHERE p.user_id = $1
             ORDER BY w.created_at DESC`,
            [req.user.id]
        );

        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Get user wallets error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve user wallets' } });
    }
};

/**
 * Refresh wallet data by creating incremental indexing job
 */
export const refreshWallet = async (req: Request, res: Response) => {
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

        // Check if there's already an active indexing job using orchestrator
        const existingJob = await indexingOrchestrator.getJobStatusByWallet(walletId);
        if (existingJob && ['queued', 'running'].includes(existingJob.status)) {
            return res.status(409).json({ 
                status: 'error', 
                data: { error: 'Indexing job already in progress for this wallet' } 
            });
        }

        // Get chain configuration
        const chainConfig = SUPPORTED_CHAINS[wallet.chain];
        if (!chainConfig) {
            return res.status(400).json({ status: 'error', data: { error: `Unsupported chain: ${wallet.chain}` } });
        }

        // Create incremental indexing job from last indexed block
        const startBlock = wallet.last_indexed_block + 1;
        const endBlock = 999999999; // Will be updated by indexer with actual current block

        const jobId = await indexingOrchestrator.queueIndexingJob({
            walletId: walletId,
            projectId: projectId,
            address: wallet.address,
            chain: wallet.chain,
            chainType: chainConfig.type,
            startBlock: startBlock,
            endBlock: endBlock,
            priority: 2 // Higher priority for refresh
        });

        res.json({ 
            status: 'success', 
            data: {
                indexingJobId: jobId,
                startBlock: startBlock,
                currentBlock: endBlock,
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
export const getIndexingStatus = async (req: Request, res: Response) => {
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
                totalBlocks: (row.end_block && row.start_block) ? row.end_block - row.start_block : 0,
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
};

/**
 * Get aggregate statistics for all wallets in a project
 */
export const getProjectAggregateStats = async (req: Request, res: Response) => {
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

        // Get aggregate statistics for all wallets in the project
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_wallets,
                COALESCE(SUM(total_transactions), 0) as total_transactions,
                COALESCE(SUM(total_events), 0) as total_events,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_wallets,
                COUNT(DISTINCT chain) as unique_chains,
                MAX(last_synced_at) as most_recent_sync
            FROM wallets 
            WHERE project_id = $1`,
            [projectId]
        );

        // Get indexing status summary
        const statusResult = await pool.query(
            `SELECT 
                ij.status,
                COUNT(*) as count
            FROM wallets w
            LEFT JOIN LATERAL (
                SELECT status FROM indexing_jobs 
                WHERE wallet_id = w.id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) ij ON true
            WHERE w.project_id = $1
            GROUP BY ij.status`,
            [projectId]
        );

        // Get chain distribution
        const chainResult = await pool.query(
            `SELECT 
                chain,
                chain_type,
                COUNT(*) as wallet_count,
                COALESCE(SUM(total_transactions), 0) as transactions,
                COALESCE(SUM(total_events), 0) as events
            FROM wallets 
            WHERE project_id = $1 AND is_active = true
            GROUP BY chain, chain_type
            ORDER BY wallet_count DESC`,
            [projectId]
        );

        const stats = statsResult.rows[0];
        const statusSummary = statusResult.rows.reduce((acc, row) => {
            acc[row.status || 'ready'] = parseInt(row.count);
            return acc;
        }, {} as Record<string, number>);

        const aggregateStats = {
            totalWallets: parseInt(stats.total_wallets),
            totalTransactions: parseInt(stats.total_transactions),
            totalEvents: parseInt(stats.total_events),
            activeWallets: parseInt(stats.active_wallets),
            uniqueChains: parseInt(stats.unique_chains),
            mostRecentSync: stats.most_recent_sync,
            statusSummary: {
                synced: statusSummary.completed || statusSummary.synced || 0,
                indexing: (statusSummary.running || 0) + (statusSummary.indexing || 0),
                queued: statusSummary.queued || 0,
                error: (statusSummary.failed || 0) + (statusSummary.error || 0),
                ready: statusSummary.ready || 0
            },
            chainDistribution: chainResult.rows.map(row => ({
                chain: row.chain,
                chainType: row.chain_type,
                walletCount: parseInt(row.wallet_count),
                transactions: parseInt(row.transactions),
                events: parseInt(row.events)
            }))
        };

        res.json({ status: 'success', data: aggregateStats });
    } catch (error) {
        console.error('Get project aggregate stats error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve aggregate statistics' } });
    }
};

/**
 * Refresh all wallets in a project
 */
export const refreshAllWallets = async (req: Request, res: Response) => {
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

        // Get all active wallets for the project
        const walletsResult = await pool.query(
            'SELECT * FROM wallets WHERE project_id = $1 AND is_active = true',
            [projectId]
        );

        const wallets = walletsResult.rows;
        const refreshResults = [];

        for (const wallet of wallets) {
            try {
                // Check if there's already an active indexing job
                const existingJob = await indexingOrchestrator.getJobStatusByWallet(wallet.id);
                if (existingJob && ['queued', 'running'].includes(existingJob.status)) {
                    refreshResults.push({
                        walletId: wallet.id,
                        address: wallet.address,
                        status: 'skipped',
                        message: 'Indexing job already in progress'
                    });
                    continue;
                }

                // Get chain configuration
                const chainConfig = SUPPORTED_CHAINS[wallet.chain];
                if (!chainConfig) {
                    refreshResults.push({
                        walletId: wallet.id,
                        address: wallet.address,
                        status: 'error',
                        message: `Unsupported chain: ${wallet.chain}`
                    });
                    continue;
                }

                // Create incremental indexing job
                const startBlock = wallet.last_indexed_block + 1;
                const endBlock = 999999999; // Will be updated by indexer

                const jobId = await indexingOrchestrator.queueIndexingJob({
                    walletId: wallet.id,
                    projectId: projectId,
                    address: wallet.address,
                    chain: wallet.chain,
                    chainType: chainConfig.type,
                    startBlock: startBlock,
                    endBlock: endBlock,
                    priority: 3 // Lower priority for bulk refresh
                });

                refreshResults.push({
                    walletId: wallet.id,
                    address: wallet.address,
                    status: 'queued',
                    jobId: jobId,
                    startBlock: startBlock
                });
            } catch (error) {
                console.error(`Error refreshing wallet ${wallet.id}:`, error);
                refreshResults.push({
                    walletId: wallet.id,
                    address: wallet.address,
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        const summary = {
            totalWallets: wallets.length,
            queued: refreshResults.filter(r => r.status === 'queued').length,
            skipped: refreshResults.filter(r => r.status === 'skipped').length,
            errors: refreshResults.filter(r => r.status === 'error').length
        };

        res.json({ 
            status: 'success', 
            data: {
                summary,
                results: refreshResults
            }
        });
    } catch (error) {
        console.error('Refresh all wallets error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to refresh wallets' } });
    }
};
