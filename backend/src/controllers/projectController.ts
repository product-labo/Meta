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

// =============================================================================
// B5: ENHANCED PROJECT MANAGEMENT (6 endpoints)
// Advanced project filtering, sorting, bookmarking, and monitoring
// =============================================================================

export const getProjectsAdvancedFilter = async (req: Request, res: Response) => {
    try {
        const {
            chains,
            categories,
            min_users,
            max_users,
            min_revenue,
            max_revenue,
            min_retention,
            max_retention,
            growth_trend, // 'up', 'down', 'stable'
            launched_after,
            launched_before,
            tags,
            status,
            limit = 20,
            page = 1
        } = req.query;

        let query = `
            SELECT p.*, 
                   m.retention_rate, m.adoption_rate, m.activation_rate, m.churn_rate,
                   m.total_users, m.gas_consumed, m.fees_generated, m.new_users_7d, m.returning_users_7d,
                   COUNT(*) OVER() as total_count
            FROM projects p
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramCount = 1;

        // Chain filter (multiple chains)
        if (chains) {
            const chainArray = Array.isArray(chains) ? chains : [chains];
            query += ` AND p.chain = ANY(${paramCount}::text[])`;
            params.push(chainArray);
            paramCount++;
        }

        // Category filter (multiple categories)
        if (categories) {
            const categoryArray = Array.isArray(categories) ? categories : [categories];
            query += ` AND p.category = ANY(${paramCount}::text[])`;
            params.push(categoryArray);
            paramCount++;
        }

        // User count range
        if (min_users) {
            query += ` AND m.total_users >= ${paramCount}`;
            params.push(parseInt(min_users as string));
            paramCount++;
        }

        if (max_users) {
            query += ` AND m.total_users <= ${paramCount}`;
            params.push(parseInt(max_users as string));
            paramCount++;
        }

        // Revenue range
        if (min_revenue) {
            query += ` AND p.revenue_7d >= ${paramCount}`;
            params.push(parseFloat(min_revenue as string));
            paramCount++;
        }

        if (max_revenue) {
            query += ` AND p.revenue_7d <= ${paramCount}`;
            params.push(parseFloat(max_revenue as string));
            paramCount++;
        }

        // Retention rate range
        if (min_retention) {
            query += ` AND m.retention_rate >= ${paramCount}`;
            params.push(parseFloat(min_retention as string));
            paramCount++;
        }

        if (max_retention) {
            query += ` AND m.retention_rate <= ${paramCount}`;
            params.push(parseFloat(max_retention as string));
            paramCount++;
        }

        // Growth trend filter
        if (growth_trend) {
            if (growth_trend === 'up') {
                query += ` AND p.growth_score > 0`;
            } else if (growth_trend === 'down') {
                query += ` AND p.growth_score < 0`;
            } else if (growth_trend === 'stable') {
                query += ` AND p.growth_score = 0`;
            }
        }

        // Launch date range
        if (launched_after) {
            query += ` AND p.launched_at >= ${paramCount}`;
            params.push(launched_after);
            paramCount++;
        }

        if (launched_before) {
            query += ` AND p.launched_at <= ${paramCount}`;
            params.push(launched_before);
            paramCount++;
        }

        // Tags filter
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            query += ` AND p.tags && ${paramCount}::text[]`;
            params.push(tagArray);
            paramCount++;
        }

        // Status filter
        if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            query += ` AND p.status = ANY(${paramCount}::text[])`;
            params.push(statusArray);
            paramCount++;
        }

        // Default sorting by growth score
        query += ` ORDER BY p.growth_score DESC, m.total_users DESC`;

        // Pagination
        const limitVal = parseInt(limit as string);
        const pageVal = parseInt(page as string);
        const offset = (pageVal - 1) * limitVal;

        query += ` LIMIT ${paramCount} OFFSET ${paramCount + 1}`;
        params.push(limitVal, offset);

        const result = await pool.query(query, params);
        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            status: 'success',
            data: {
                projects: result.rows,
                filters_applied: {
                    chains, categories, min_users, max_users, min_revenue, max_revenue,
                    min_retention, max_retention, growth_trend, launched_after, launched_before,
                    tags, status
                },
                pagination: {
                    page: pageVal,
                    limit: limitVal,
                    total: totalCount,
                    total_pages: Math.ceil(totalCount / limitVal)
                }
            }
        });
    } catch (error) {
        console.error('Advanced Filter Projects Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getProjectsMultiSort = async (req: Request, res: Response) => {
    try {
        const {
            sort_criteria, // JSON array of sort objects: [{"field": "total_users", "order": "desc"}, {"field": "retention_rate", "order": "asc"}]
            limit = 20,
            page = 1
        } = req.query;

        let query = `
            SELECT p.*, 
                   m.retention_rate, m.adoption_rate, m.activation_rate, m.churn_rate,
                   m.total_users, m.gas_consumed, m.fees_generated, m.new_users_7d, m.returning_users_7d,
                   COUNT(*) OVER() as total_count
            FROM projects p
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE p.status = 'active'
        `;

        // Parse and validate sort criteria
        let sortClauses: string[] = [];
        if (sort_criteria) {
            try {
                const criteria = typeof sort_criteria === 'string' ? JSON.parse(sort_criteria as string) : sort_criteria;
                
                const validFields = [
                    'name', 'created_at', 'launched_at', 'growth_score', 'revenue_7d',
                    'total_users', 'retention_rate', 'adoption_rate', 'activation_rate',
                    'churn_rate', 'gas_consumed', 'fees_generated', 'new_users_7d', 'returning_users_7d'
                ];

                for (const criterion of criteria) {
                    if (validFields.includes(criterion.field)) {
                        const order = criterion.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
                        const fieldName = ['total_users', 'retention_rate', 'adoption_rate', 'activation_rate', 
                                         'churn_rate', 'gas_consumed', 'fees_generated', 'new_users_7d', 'returning_users_7d']
                                         .includes(criterion.field) ? `m.${criterion.field}` : `p.${criterion.field}`;
                        sortClauses.push(`${fieldName} ${order}`);
                    }
                }
            } catch (e) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid sort_criteria format. Expected JSON array.' 
                });
            }
        }

        // Apply sorting
        if (sortClauses.length > 0) {
            query += ` ORDER BY ${sortClauses.join(', ')}`;
        } else {
            query += ` ORDER BY p.growth_score DESC, m.total_users DESC`; // Default sort
        }

        // Pagination
        const limitVal = parseInt(limit as string);
        const pageVal = parseInt(page as string);
        const offset = (pageVal - 1) * limitVal;

        query += ` LIMIT $1 OFFSET $2`;
        const params = [limitVal, offset];

        const result = await pool.query(query, params);
        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            status: 'success',
            data: {
                projects: result.rows,
                sort_criteria: sort_criteria,
                pagination: {
                    page: pageVal,
                    limit: limitVal,
                    total: totalCount,
                    total_pages: Math.ceil(totalCount / limitVal)
                }
            }
        });
    } catch (error) {
        console.error('Multi-Sort Projects Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const bookmarkProject = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Check if project exists
        const projectResult = await pool.query(
            'SELECT id, name FROM projects WHERE id = $1',
            [id]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Project not found' 
            });
        }

        // Check if already bookmarked
        const existingBookmark = await pool.query(
            'SELECT id FROM project_bookmarks WHERE user_id = $1 AND project_id = $2',
            [userId, id]
        );

        if (existingBookmark.rows.length > 0) {
            // Remove bookmark (toggle)
            await pool.query(
                'DELETE FROM project_bookmarks WHERE user_id = $1 AND project_id = $2',
                [userId, id]
            );

            res.json({
                status: 'success',
                data: {
                    bookmarked: false,
                    message: 'Project bookmark removed'
                }
            });
        } else {
            // Add bookmark
            const result = await pool.query(
                `INSERT INTO project_bookmarks (user_id, project_id, created_at)
                 VALUES ($1, $2, NOW())
                 RETURNING *`,
                [userId, id]
            );

            res.json({
                status: 'success',
                data: {
                    bookmarked: true,
                    bookmark_id: result.rows[0].id,
                    message: 'Project bookmarked successfully'
                }
            });
        }
    } catch (error) {
        console.error('Bookmark Project Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getBookmarkedProjects = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { limit = 20, page = 1, sort_by = 'created_at' } = req.query;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const validSortFields = ['created_at', 'name', 'growth_score', 'total_users', 'retention_rate'];
        const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
        
        let query = `
            SELECT 
                p.*,
                m.retention_rate, m.adoption_rate, m.activation_rate, m.churn_rate,
                m.total_users, m.gas_consumed, m.fees_generated, m.new_users_7d, m.returning_users_7d,
                pb.created_at as bookmarked_at,
                COUNT(*) OVER() as total_count
            FROM project_bookmarks pb
            JOIN projects p ON pb.project_id = p.id
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE pb.user_id = $1
        `;

        // Sorting
        if (['retention_rate', 'adoption_rate', 'activation_rate', 'churn_rate', 'total_users', 
             'gas_consumed', 'fees_generated', 'new_users_7d', 'returning_users_7d'].includes(sortField)) {
            query += ` ORDER BY m.${sortField} DESC`;
        } else if (sortField === 'created_at') {
            query += ` ORDER BY pb.created_at DESC`;
        } else {
            query += ` ORDER BY p.${sortField} DESC`;
        }

        // Pagination
        const limitVal = parseInt(limit as string);
        const pageVal = parseInt(page as string);
        const offset = (pageVal - 1) * limitVal;

        query += ` LIMIT $2 OFFSET $3`;
        const params = [userId, limitVal, offset];

        const result = await pool.query(query, params);
        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            status: 'success',
            data: {
                bookmarked_projects: result.rows,
                pagination: {
                    page: pageVal,
                    limit: limitVal,
                    total: totalCount,
                    total_pages: Math.ceil(totalCount / limitVal)
                }
            }
        });
    } catch (error) {
        console.error('Get Bookmarked Projects Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getProjectHealthStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Get project with comprehensive health metrics
        const result = await pool.query(`
            SELECT 
                p.*,
                m.retention_rate, m.adoption_rate, m.activation_rate, m.churn_rate,
                m.total_users, m.gas_consumed, m.fees_generated, m.new_users_7d, m.returning_users_7d,
                -- Calculate health scores
                CASE 
                    WHEN m.retention_rate >= 0.7 THEN 'excellent'
                    WHEN m.retention_rate >= 0.5 THEN 'good'
                    WHEN m.retention_rate >= 0.3 THEN 'fair'
                    ELSE 'poor'
                END as retention_health,
                CASE 
                    WHEN m.adoption_rate >= 0.8 THEN 'excellent'
                    WHEN m.adoption_rate >= 0.6 THEN 'good'
                    WHEN m.adoption_rate >= 0.4 THEN 'fair'
                    ELSE 'poor'
                END as adoption_health,
                CASE 
                    WHEN p.growth_score >= 50 THEN 'excellent'
                    WHEN p.growth_score >= 20 THEN 'good'
                    WHEN p.growth_score >= 0 THEN 'fair'
                    ELSE 'poor'
                END as growth_health,
                CASE 
                    WHEN m.churn_rate <= 0.1 THEN 'excellent'
                    WHEN m.churn_rate <= 0.2 THEN 'good'
                    WHEN m.churn_rate <= 0.3 THEN 'fair'
                    ELSE 'poor'
                END as churn_health
            FROM projects p
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Project not found' 
            });
        }

        const project = result.rows[0];

        // Calculate overall health score
        const healthScores = {
            retention: project.retention_health,
            adoption: project.adoption_health,
            growth: project.growth_health,
            churn: project.churn_health
        };

        const scoreValues = {
            'excellent': 4,
            'good': 3,
            'fair': 2,
            'poor': 1
        };

        const avgScore = Object.values(healthScores).reduce((sum, health) => 
            sum + scoreValues[health as keyof typeof scoreValues], 0) / 4;

        let overallHealth = 'poor';
        if (avgScore >= 3.5) overallHealth = 'excellent';
        else if (avgScore >= 2.5) overallHealth = 'good';
        else if (avgScore >= 1.5) overallHealth = 'fair';

        // Get recent alerts/issues
        const alertsResult = await pool.query(`
            SELECT title, severity, created_at
            FROM alerts 
            WHERE project_id = $1 
            AND created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 5
        `, [id]);

        // Health recommendations
        const recommendations = [];
        if (project.retention_rate < 0.5) {
            recommendations.push({
                type: 'retention',
                priority: 'high',
                message: 'Low user retention detected. Consider improving user onboarding and engagement features.'
            });
        }
        if (project.churn_rate > 0.2) {
            recommendations.push({
                type: 'churn',
                priority: 'high',
                message: 'High churn rate detected. Analyze user feedback and improve core functionality.'
            });
        }
        if (project.growth_score < 0) {
            recommendations.push({
                type: 'growth',
                priority: 'medium',
                message: 'Negative growth trend. Focus on user acquisition and marketing strategies.'
            });
        }

        res.json({
            status: 'success',
            data: {
                project_id: project.id,
                project_name: project.name,
                overall_health: overallHealth,
                health_score: Math.round(avgScore * 25), // Convert to 0-100 scale
                health_breakdown: healthScores,
                metrics: {
                    retention_rate: project.retention_rate,
                    adoption_rate: project.adoption_rate,
                    activation_rate: project.activation_rate,
                    churn_rate: project.churn_rate,
                    total_users: project.total_users,
                    growth_score: project.growth_score,
                    new_users_7d: project.new_users_7d,
                    returning_users_7d: project.returning_users_7d
                },
                recent_alerts: alertsResult.rows,
                recommendations,
                last_updated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get Project Health Status Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getMonitoringDashboard = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Get user's projects overview
        const projectsOverview = await pool.query(`
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_projects,
                COUNT(CASE WHEN p.status = 'draft' THEN 1 END) as draft_projects,
                AVG(m.retention_rate) as avg_retention,
                AVG(m.total_users) as avg_users,
                SUM(p.revenue_7d) as total_revenue_7d
            FROM projects p
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE p.user_id = $1
        `, [userId]);

        // Get system-wide statistics
        const systemStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT p.id) as total_system_projects,
                COUNT(DISTINCT u.id) as total_users,
                COUNT(DISTINCT t.hash) as total_transactions,
                AVG(m.retention_rate) as system_avg_retention
            FROM projects p
            LEFT JOIN users u ON true
            LEFT JOIN mc_transaction_details t ON p.contract_address = t.to_address
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE p.status = 'active'
        `);

        // Get recent activity
        const recentActivity = await pool.query(`
            SELECT 
                'project_created' as activity_type,
                p.name as title,
                p.created_at as timestamp,
                'success' as status
            FROM projects p
            WHERE p.user_id = $1 AND p.created_at >= NOW() - INTERVAL '7 days'
            
            UNION ALL
            
            SELECT 
                'alert_triggered' as activity_type,
                a.title,
                a.created_at,
                CASE WHEN a.severity = 'high' THEN 'error' ELSE 'warning' END
            FROM alerts a
            WHERE a.user_id = $1 AND a.created_at >= NOW() - INTERVAL '7 days'
            
            ORDER BY timestamp DESC
            LIMIT 10
        `, [userId]);

        // Get performance trends (last 7 days)
        const performanceTrends = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as daily_transactions,
                AVG(gas_used) as avg_gas_used
            FROM mc_transaction_details t
            JOIN projects p ON t.to_address = p.contract_address
            WHERE p.user_id = $1 
            AND t.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [userId]);

        // Get alerts summary
        const alertsSummary = await pool.query(`
            SELECT 
                severity,
                COUNT(*) as count
            FROM alerts
            WHERE user_id = $1 
            AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY severity
        `, [userId]);

        // Health status of user's projects
        const healthStatus = await pool.query(`
            SELECT 
                p.id,
                p.name,
                CASE 
                    WHEN m.retention_rate >= 0.7 AND m.churn_rate <= 0.1 THEN 'healthy'
                    WHEN m.retention_rate >= 0.5 AND m.churn_rate <= 0.2 THEN 'warning'
                    ELSE 'critical'
                END as health_status,
                m.retention_rate,
                m.churn_rate,
                m.total_users
            FROM projects p
            LEFT JOIN project_metrics m ON p.id = m.project_id
            WHERE p.user_id = $1 AND p.status = 'active'
            ORDER BY 
                CASE 
                    WHEN m.retention_rate >= 0.7 AND m.churn_rate <= 0.1 THEN 1
                    WHEN m.retention_rate >= 0.5 AND m.churn_rate <= 0.2 THEN 2
                    ELSE 3
                END DESC
        `, [userId]);

        const overview = projectsOverview.rows[0] || {};
        const systemData = systemStats.rows[0] || {};

        res.json({
            status: 'success',
            data: {
                overview: {
                    total_projects: parseInt(overview.total_projects) || 0,
                    active_projects: parseInt(overview.active_projects) || 0,
                    draft_projects: parseInt(overview.draft_projects) || 0,
                    avg_retention: parseFloat(overview.avg_retention) || 0,
                    avg_users: parseInt(overview.avg_users) || 0,
                    total_revenue_7d: parseFloat(overview.total_revenue_7d) || 0
                },
                system_stats: {
                    total_system_projects: parseInt(systemData.total_system_projects) || 0,
                    total_users: parseInt(systemData.total_users) || 0,
                    total_transactions: parseInt(systemData.total_transactions) || 0,
                    system_avg_retention: parseFloat(systemData.system_avg_retention) || 0
                },
                recent_activity: recentActivity.rows,
                performance_trends: performanceTrends.rows,
                alerts_summary: alertsSummary.rows.reduce((acc, row) => {
                    acc[row.severity] = parseInt(row.count);
                    return acc;
                }, {}),
                health_status: healthStatus.rows,
                last_updated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get Monitoring Dashboard Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};
