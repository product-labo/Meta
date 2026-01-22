import { Request, Response } from 'express';
import { pool } from '../config/database.js';

// =============================================================================
// B2: TASK MANAGEMENT (10 endpoints)
// Enhanced task management with full CRUD operations
// =============================================================================

export const getTasks = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { 
        status, 
        priority, 
        assigned_to, 
        page = 1, 
        limit = 20,
        search,
        sort_by = 'created_at',
        sort_order = 'DESC'
    } = req.query;

    try {
        let query = `
            SELECT 
                t.*,
                p.name as project_name,
                u.email as assigned_to_email,
                COUNT(*) OVER() as total_count
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramCount = 1;

        if (projectId) {
            query += ` AND t.project_id = $${paramCount}`;
            params.push(projectId);
            paramCount++;
        }

        if (status) {
            query += ` AND t.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (priority) {
            query += ` AND t.priority = $${paramCount}`;
            params.push(priority);
            paramCount++;
        }

        if (assigned_to) {
            query += ` AND t.assigned_to = $${paramCount}`;
            params.push(assigned_to);
            paramCount++;
        }

        if (search) {
            query += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        // Sorting
        const validSortFields = ['created_at', 'updated_at', 'due_date', 'priority', 'status', 'title'];
        const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
        const sortDirection = sort_order === 'ASC' ? 'ASC' : 'DESC';
        
        query += ` ORDER BY t.${sortField} ${sortDirection}`;

        // Pagination
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            status: 'success',
            data: {
                tasks: result.rows,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total: totalCount,
                    total_pages: Math.ceil(totalCount / parseInt(limit as string))
                }
            }
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve tasks' });
    }
};

export const createTask = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { 
        title, 
        description,
        status = 'todo', 
        priority = 'medium', 
        due_date, 
        impact,
        verification_criteria,
        assigned_to,
        tags,
        estimated_hours
    } = req.body;

    if (!title) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Title is required' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO tasks (
                project_id, title, description, status, priority, due_date, 
                impact, verification_criteria, assigned_to, tags, estimated_hours,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING *`,
            [
                projectId, title, description, status, priority, due_date,
                impact, verification_criteria, assigned_to, tags, estimated_hours
            ]
        );

        res.status(201).json({ 
            status: 'success', 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to create task' 
        });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    const { projectId, taskId } = req.params;
    const { 
        title, 
        description,
        status, 
        priority, 
        due_date, 
        impact,
        verification_criteria,
        assigned_to,
        tags,
        estimated_hours,
        actual_hours
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE tasks
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 status = COALESCE($3, status),
                 priority = COALESCE($4, priority),
                 due_date = COALESCE($5, due_date),
                 impact = COALESCE($6, impact),
                 verification_criteria = COALESCE($7, verification_criteria),
                 assigned_to = COALESCE($8, assigned_to),
                 tags = COALESCE($9, tags),
                 estimated_hours = COALESCE($10, estimated_hours),
                 actual_hours = COALESCE($11, actual_hours),
                 updated_at = NOW()
             WHERE id = $12 AND project_id = $13
             RETURNING *`,
            [
                title, description, status, priority, due_date, impact,
                verification_criteria, assigned_to, tags, estimated_hours,
                actual_hours, taskId, projectId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Task not found' 
            });
        }

        res.json({ 
            status: 'success', 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update task' 
        });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    const { projectId, taskId } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND project_id = $2 RETURNING id',
            [taskId, projectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Task not found' 
            });
        }

        res.json({ 
            status: 'success', 
            data: { message: 'Task deleted successfully' } 
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete task' 
        });
    }
};

export const searchTasks = async (req: Request, res: Response) => {
    const { q, project_id, status, priority, limit = 10 } = req.query;

    if (!q) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Search query (q) is required' 
        });
    }

    try {
        let query = `
            SELECT 
                t.*,
                p.name as project_name,
                ts_rank(to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')), plainto_tsquery('english', $1)) as rank
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', $1)
        `;
        
        const params: any[] = [q];
        let paramCount = 2;

        if (project_id) {
            query += ` AND t.project_id = $${paramCount}`;
            params.push(project_id);
            paramCount++;
        }

        if (status) {
            query += ` AND t.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (priority) {
            query += ` AND t.priority = $${paramCount}`;
            params.push(priority);
            paramCount++;
        }

        query += ` ORDER BY rank DESC, t.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await pool.query(query, params);

        res.json({
            status: 'success',
            data: {
                tasks: result.rows,
                search_query: q,
                total_results: result.rows.length
            }
        });
    } catch (error) {
        console.error('Search tasks error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to search tasks' 
        });
    }
};

export const filterTasks = async (req: Request, res: Response) => {
    const { 
        status, 
        priority, 
        assigned_to, 
        due_date_from, 
        due_date_to,
        created_from,
        created_to,
        tags,
        project_id
    } = req.query;

    try {
        let query = `
            SELECT 
                t.*,
                p.name as project_name,
                u.email as assigned_to_email
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramCount = 1;

        if (project_id) {
            query += ` AND t.project_id = $${paramCount}`;
            params.push(project_id);
            paramCount++;
        }

        if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            query += ` AND t.status = ANY($${paramCount}::text[])`;
            params.push(statusArray);
            paramCount++;
        }

        if (priority) {
            const priorityArray = Array.isArray(priority) ? priority : [priority];
            query += ` AND t.priority = ANY($${paramCount}::text[])`;
            params.push(priorityArray);
            paramCount++;
        }

        if (assigned_to) {
            query += ` AND t.assigned_to = $${paramCount}`;
            params.push(assigned_to);
            paramCount++;
        }

        if (due_date_from) {
            query += ` AND t.due_date >= $${paramCount}`;
            params.push(due_date_from);
            paramCount++;
        }

        if (due_date_to) {
            query += ` AND t.due_date <= $${paramCount}`;
            params.push(due_date_to);
            paramCount++;
        }

        if (created_from) {
            query += ` AND t.created_at >= $${paramCount}`;
            params.push(created_from);
            paramCount++;
        }

        if (created_to) {
            query += ` AND t.created_at <= $${paramCount}`;
            params.push(created_to);
            paramCount++;
        }

        if (tags) {
            query += ` AND t.tags && $${paramCount}::text[]`;
            params.push(Array.isArray(tags) ? tags : [tags]);
            paramCount++;
        }

        query += ` ORDER BY t.created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            status: 'success',
            data: {
                tasks: result.rows,
                filters_applied: {
                    status, priority, assigned_to, due_date_from, due_date_to,
                    created_from, created_to, tags, project_id
                },
                total_results: result.rows.length
            }
        });
    } catch (error) {
        console.error('Filter tasks error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to filter tasks' 
        });
    }
};

export const getTaskComments = async (req: Request, res: Response) => {
    const { taskId } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                tc.*,
                u.email as author_email,
                u.name as author_name
             FROM task_comments tc
             LEFT JOIN users u ON tc.user_id = u.id
             WHERE tc.task_id = $1
             ORDER BY tc.created_at ASC`,
            [taskId]
        );

        res.json({
            status: 'success',
            data: {
                comments: result.rows,
                total_comments: result.rows.length
            }
        });
    } catch (error) {
        console.error('Get task comments error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to retrieve task comments' 
        });
    }
};

export const addTaskComment = async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { comment } = req.body;
    const userId = req.user?.id;

    if (!comment) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Comment is required' 
        });
    }

    if (!userId) {
        return res.status(401).json({ 
            status: 'error', 
            message: 'Unauthorized' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO task_comments (task_id, user_id, comment, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [taskId, userId, comment]
        );

        res.status(201).json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Add task comment error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to add comment' 
        });
    }
};

export const updateTaskPriority = async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { priority } = req.body;

    if (!priority || !['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Valid priority required (low, medium, high, urgent)' 
        });
    }

    try {
        const result = await pool.query(
            `UPDATE tasks 
             SET priority = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [priority, taskId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Task not found' 
            });
        }

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update task priority error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update task priority' 
        });
    }
};

export const getTaskAnalytics = async (req: Request, res: Response) => {
    const { project_id, days = 30 } = req.query;

    try {
        let baseQuery = `
            WITH task_stats AS (
                SELECT 
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
                    COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
                    COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END) as overdue_tasks,
                    AVG(CASE WHEN status = 'completed' AND actual_hours IS NOT NULL THEN actual_hours END) as avg_completion_time
                FROM tasks 
                WHERE created_at >= NOW() - INTERVAL '${days} days'
        `;

        const params: any[] = [];
        let paramCount = 1;

        if (project_id) {
            baseQuery += ` AND project_id = $${paramCount}`;
            params.push(project_id);
            paramCount++;
        }

        baseQuery += `
            ),
            priority_breakdown AS (
                SELECT 
                    priority,
                    COUNT(*) as count
                FROM tasks 
                WHERE created_at >= NOW() - INTERVAL '${days} days'
        `;

        if (project_id) {
            baseQuery += ` AND project_id = $${paramCount}`;
            params.push(project_id);
            paramCount++;
        }

        baseQuery += `
                GROUP BY priority
            ),
            daily_completion AS (
                SELECT 
                    DATE(updated_at) as date,
                    COUNT(*) as completed_count
                FROM tasks 
                WHERE status = 'completed' 
                AND updated_at >= NOW() - INTERVAL '${days} days'
        `;

        if (project_id) {
            baseQuery += ` AND project_id = $${paramCount}`;
            params.push(project_id);
        }

        baseQuery += `
                GROUP BY DATE(updated_at)
                ORDER BY date DESC
                LIMIT 7
            )
            SELECT 
                (SELECT json_build_object(
                    'total_tasks', total_tasks,
                    'completed_tasks', completed_tasks,
                    'in_progress_tasks', in_progress_tasks,
                    'todo_tasks', todo_tasks,
                    'overdue_tasks', overdue_tasks,
                    'completion_rate', CASE WHEN total_tasks > 0 THEN ROUND((completed_tasks::DECIMAL / total_tasks * 100), 2) ELSE 0 END,
                    'avg_completion_time', COALESCE(avg_completion_time, 0)
                ) FROM task_stats) as overview,
                (SELECT json_agg(json_build_object('priority', priority, 'count', count)) FROM priority_breakdown) as priority_breakdown,
                (SELECT json_agg(json_build_object('date', date, 'completed', completed_count)) FROM daily_completion) as daily_completion
        `;

        const result = await pool.query(baseQuery, params);
        const data = result.rows[0];

        res.json({
            status: 'success',
            data: {
                overview: data.overview || {},
                priority_breakdown: data.priority_breakdown || [],
                daily_completion: data.daily_completion || [],
                period_days: days
            }
        });
    } catch (error) {
        console.error('Get task analytics error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to retrieve task analytics' 
        });
    }
};
