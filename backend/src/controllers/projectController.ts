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

export const getUserProjects = async (req: Request, res: Response) => {
    try {
        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ 
                status: 'error',
                data: { error: 'Unauthorized' }
            });
        }

        const result = await pool.query(`
            SELECT p.*, 
                   COUNT(w.id) as wallet_count,
                   MAX(w.last_synced_at) as last_wallet_sync
            FROM projects p
            LEFT JOIN wallets w ON p.id = w.project_id AND w.is_active = true
            WHERE p.user_id = $1
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, [req.user.id]);

        res.json({
            status: 'success',
            data: result.rows
        });
    } catch (error) {
        console.error('Get User Projects Error:', error);
        res.status(500).json({ 
            status: 'error',
            data: { error: 'Server error' }
        });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, category, status, website_url, github_url, logo_url, tags } = req.body;
    
    try {
        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ 
                status: 'error',
                data: { error: 'Unauthorized' }
            });
        }

        // Check if project exists and belongs to user
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                data: { error: 'Project not found or unauthorized' }
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount}`);
            values.push(description);
            paramCount++;
        }
        if (category !== undefined) {
            updates.push(`category = $${paramCount}`);
            values.push(category);
            paramCount++;
        }
        if (status !== undefined) {
            updates.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }
        if (website_url !== undefined) {
            updates.push(`website_url = $${paramCount}`);
            values.push(website_url);
            paramCount++;
        }
        if (github_url !== undefined) {
            updates.push(`github_url = $${paramCount}`);
            values.push(github_url);
            paramCount++;
        }
        if (logo_url !== undefined) {
            updates.push(`logo_url = $${paramCount}`);
            values.push(logo_url);
            paramCount++;
        }
        if (tags !== undefined) {
            updates.push(`tags = $${paramCount}`);
            values.push(tags);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                status: 'error',
                data: { error: 'No fields to update' }
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE projects 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
            RETURNING *
        `;
        values.push(req.user.id);

        const result = await pool.query(query, values);

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update Project Error:', error);
        res.status(500).json({ 
            status: 'error',
            data: { error: 'Server error' }
        });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    try {
        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ 
                status: 'error',
                data: { error: 'Unauthorized' }
            });
        }

        // Check if project exists and belongs to user
        const projectCheck = await pool.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (projectCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                data: { error: 'Project not found or unauthorized' }
            });
        }

        // Delete project (wallets will be cascade deleted due to foreign key constraint)
        await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, req.user.id]);

        res.json({
            status: 'success',
            data: { message: 'Project deleted successfully' }
        });
    } catch (error) {
        console.error('Delete Project Error:', error);
        res.status(500).json({ 
            status: 'error',
            data: { error: 'Server error' }
        });
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
