import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export const addToWatchlist = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { projectId } = req.body;

    try {
        await pool.query(
            `INSERT INTO watchlist (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, projectId]
        );
        res.json({ message: 'Added to watchlist' });
    } catch (error) {
        console.error('Add Watchlist Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const removeFromWatchlist = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { projectId } = req.params;

    try {
        await pool.query(
            `DELETE FROM watchlist WHERE user_id = $1 AND project_id = $2`,
            [userId, projectId]
        );
        res.json({ message: 'Removed from watchlist' });
    } catch (error) {
        console.error('Remove Watchlist Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getWatchlist = async (req: Request, res: Response) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `SELECT p.* FROM projects p 
             JOIN watchlist w ON p.id = w.project_id 
             WHERE w.user_id = $1`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get Watchlist Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
