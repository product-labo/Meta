import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { indexerService } from '../services/indexerService.js';

export const getProjects = async (req: Request, res: Response) => {
    try {
        const { chain, category, sortBy, search, limit = 10, page = 1 } = req.query;

        // Base Query with JOIN
        let query = `
            SELECT p.*, 
                   m.retention_rate, m.adoption_rate, m.activation_rate, m.churn_rate, 
                   m.total_users, m.gas_consumed, m.fees_generated, m.new_users_7d, m.returning_users_7d
            FROM projects p
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE p.status = 'active'
        `;
        const params: any[] = [];
        let paramCount = 1;

        // Filters
        if (chain) {
            query += ` AND p.chain = $${paramCount}`;
            params.push(chain);
            paramCount++;
        }

        if (category) {
            query += ` AND p.category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }

        if (search) {
            query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        // Count Total (using subquery for accuracy)
        const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS total`, params);
        const total = parseInt(countResult.rows[0].count);

        // Sorting
        if (sortBy === 'growth') {
            query += ` ORDER BY p.growth_score DESC`;
        } else if (sortBy === 'revenue') {
            query += ` ORDER BY p.revenue_7d DESC`;
        } else if (sortBy === 'users') {
            query += ` ORDER BY m.total_users DESC`;
        } else if (sortBy === 'retention') {
            query += ` ORDER BY m.retention_rate DESC`;
        } else {
            query += ` ORDER BY p.created_at DESC`;
        }

        // Pagination
        const limitVal = parseInt(limit as string);
        const pageVal = parseInt(page as string);
        const offset = (pageVal - 1) * limitVal;

        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limitVal, offset);

        const result = await pool.query(query, params);

        res.json({
            data: result.rows,
            meta: {
                total,
                page: pageVal,
                limit: limitVal,
                totalPages: Math.ceil(total / limitVal)
            }
        });
    } catch (error) {
        console.error('Get Projects Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createProject = async (req: Request, res: Response) => {
    const { name, description, category, status, chain, contractAddress, abi, utility } = req.body;
    try {
        // Map frontend categories to DB values if needed
        const dbCategory = utility ? utility.toLowerCase() : (category || 'other');
        const dbStatus = status || 'draft'; // Default to draft if not specified? Or active?

        // Ensure user is authenticated (req.user should be populated by middleware)
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // 1. Enforce Mandatory Fields
        if (!name || !chain || !contractAddress) {
            return res.status(400).json({ message: 'Missing mandatory fields: Name, Chain, and Contract Address are required.' });
        }

        const result = await pool.query(
            'INSERT INTO projects (user_id, name, description, category, status, chain, contract_address, abi, utility) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [req.user.id, name, description, dbCategory, dbStatus, chain, contractAddress, abi, utility]
        );

        // 2. Mark Onboarding as Completed
        await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [req.user.id]);

        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Create Project Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProjectById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Project Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProjectAnalytics = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
        SELECT p.*, m.* 
        FROM projects p
        LEFT JOIN project_metrics m ON p.id = m.project_id
        WHERE p.id = $1
    `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get Project Analytics Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const compareProjects = async (req: Request, res: Response) => {
    const { ids } = req.query; // Expect comma separated IDs
    if (!ids) return res.status(400).json({ message: 'IDs required' });

    const idArray = (ids as string).split(',');

    try {
        const result = await pool.query(`
        SELECT p.*, m.* 
        FROM projects p
        LEFT JOIN project_metrics m ON p.id = m.project_id
        WHERE p.id = ANY($1::uuid[])
    `, [idArray]);

        res.json(result.rows);
    } catch (error) {
        console.error('Compare Projects Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getNewProjects = async (req: Request, res: Response) => {
    try {
        // "New" defined as launched in last 30 days, or just sort by launched_at
        const result = await pool.query(`
        SELECT * FROM projects 
        WHERE status = 'active'
        ORDER BY launched_at DESC
        LIMIT 10
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get New Projects Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRankings = async (req: Request, res: Response) => {
    try {
        // Top Projects: High Growth & Revenue
        const top = await pool.query(`
        SELECT p.*, m.mom_growth, m.revenue_per_feature 
        FROM projects p
        LEFT JOIN project_metrics m ON p.id = m.project_id
        WHERE p.status = 'active'
        ORDER BY p.growth_score DESC, p.revenue_7d DESC
        LIMIT 5
    `);

        // Failing Projects: Low Growth or Revenue (Simple logic for demo)
        const failing = await pool.query(`
        SELECT p.*, m.mom_growth, m.revenue_per_feature 
        FROM projects p
        LEFT JOIN project_metrics m ON p.id = m.project_id
        WHERE p.status = 'active'
        ORDER BY p.growth_score ASC, p.revenue_7d ASC
        LIMIT 5
    `);

        res.json({
            top: top.rows,
            failing: failing.rows
        });
    } catch (error) {
        console.error('Get Rankings Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
