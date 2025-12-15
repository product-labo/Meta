import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export const createTask = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { title, status, priority, due_date, impact, verification_criteria } = req.body;

    // Basic validation
    if (!title || !projectId) {
        return res.status(400).json({ status: 'error', data: { error: 'Title and Project ID are required' } });
    }

    try {
        const result = await pool.query(
            `INSERT INTO tasks (
                project_id, title, status, priority, due_date, impact, verification_criteria
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [projectId, title, status || 'todo', priority || 'medium', due_date, impact, verification_criteria]
        );

        res.status(201).json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to create task' } });
    }
};

export const getTasks = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { status } = req.query;

    try {
        let query = 'SELECT * FROM tasks WHERE project_id = $1';
        const params: any[] = [projectId];

        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to retrieve tasks' } });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    const { projectId, taskId } = req.params;
    const { title, status, priority, due_date, impact, verification_criteria } = req.body;

    try {
        const result = await pool.query(
            `UPDATE tasks
             SET title = COALESCE($1, title),
                 status = COALESCE($2, status),
                 priority = COALESCE($3, priority),
                 due_date = COALESCE($4, due_date),
                 impact = COALESCE($5, impact),
                 verification_criteria = COALESCE($6, verification_criteria),
                 updated_at = NOW()
             WHERE id = $7 AND project_id = $8
             RETURNING *`,
            [title, status, priority, due_date, impact, verification_criteria, taskId, projectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: 'error', data: { error: 'Task not found' } });
        }

        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to update task' } });
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
            return res.status(404).json({ status: 'error', data: { error: 'Task not found' } });
        }

        res.json({ status: 'success', data: { message: 'Task deleted' } });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Failed to delete task' } });
    }
};
