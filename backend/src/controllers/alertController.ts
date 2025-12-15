import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export const createAlert = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { projectId, type, condition, threshold, frequency } = req.body;

    if (!projectId || !type) {
        return res.status(400).json({ message: 'Project ID and Type required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO alerts (user_id, project_id, type, condition, threshold, frequency)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, projectId, type, condition, threshold, frequency || 'immediate']
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Create Alert Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAlerts = async (req: Request, res: Response) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT a.*, p.name as project_name, p.icon_url 
            FROM alerts a
            JOIN projects p ON a.project_id = p.id
            WHERE a.user_id = $1
            ORDER BY a.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get Alerts Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteAlert = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Alert not found' });
        res.json({ message: 'Alert deleted' });
    } catch (error) {
        console.error('Delete Alert Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
