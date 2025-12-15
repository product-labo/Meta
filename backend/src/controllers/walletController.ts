import { Request, Response } from 'express';
import { pool } from '../config/database.js';

// Helper to validate address type
const getAddressType = (address: string): 't' | 'z' | 'u' | null => {
    if (address.startsWith('t1') || address.startsWith('t3')) return 't';
    if (address.startsWith('zs')) return 'z';
    if (address.startsWith('u1')) return 'u';
    return null;
};

export const createWallet = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { address, network = 'mainnet', privacy_mode = 'private', description, chain = 'lisk' } = req.body;

    if (!address) {
        return res.status(400).json({ status: 'error', data: { error: 'Address is required' } });
    }

    const type = getAddressType(address);
    if (!type) {
        return res.status(400).json({ status: 'error', data: { error: 'Invalid address format' } });
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

        const result = await pool.query(
            `INSERT INTO wallets (
                project_id, address, type, privacy_mode, description, network, chain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [projectId, address, type, privacy_mode, description, network, chain]
        );

        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error: any) {
        console.error('Create wallet error:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ status: 'error', data: { error: 'Wallet already exists for this project' } });
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

        const result = await pool.query(
            'SELECT * FROM wallets WHERE project_id = $1 ORDER BY created_at DESC',
            [projectId]
        );

        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Get wallets error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve wallets' } });
    }
};

export const getWallet = async (req: Request, res: Response) => {
    const { projectId, walletId } = req.params;

    try {
        const result = await pool.query(
            `SELECT w.* FROM wallets w
             JOIN projects p ON w.project_id = p.id
             WHERE w.id = $1 AND w.project_id = $2 AND p.user_id = $3`,
            [walletId, projectId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Wallet not found' } });
        }

        res.json({ status: 'success', data: result.rows[0] });
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
