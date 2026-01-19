import { Request, Response } from 'express';
import { pool } from '../config/database.js';

// =============================================================================
// B1: NOTIFICATION SYSTEM (8 endpoints)
// Enhanced notification and alert management
// =============================================================================

export const getAlerts = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { limit = 50, status, severity, project_id } = req.query;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        let query = `
            SELECT 
                a.*,
                p.name as project_name,
                p.contract_address,
                CASE 
                    WHEN a.created_at > NOW() - INTERVAL '1 hour' THEN 'new'
                    WHEN a.status = 'unread' THEN 'unread'
                    ELSE 'read'
                END as display_status
            FROM alerts a
            LEFT JOIN projects p ON a.project_id = p.id
            WHERE a.user_id = $1
        `;
        
        const params: any[] = [userId];
        let paramCount = 2;

        if (status) {
            query += ` AND a.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (severity) {
            query += ` AND a.severity = $${paramCount}`;
            params.push(severity);
            paramCount++;
        }

        if (project_id) {
            query += ` AND a.project_id = $${paramCount}`;
            params.push(project_id);
            paramCount++;
        }

        query += ` ORDER BY a.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await pool.query(query, params);

        // Get unread count
        const unreadResult = await pool.query(
            'SELECT COUNT(*) as unread_count FROM alerts WHERE user_id = $1 AND status = $2',
            [userId, 'unread']
        );

        res.json({
            status: 'success',
            data: {
                alerts: result.rows,
                unread_count: parseInt(unreadResult.rows[0].unread_count),
                total_count: result.rows.length
            }
        });
    } catch (error) {
        console.error('Get Alerts Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const createAlert = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { 
        project_id, 
        title, 
        message, 
        type = 'info', 
        severity = 'medium',
        action_url,
        metadata 
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!title || !message) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Title and message are required' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO alerts (
                user_id, project_id, title, message, type, severity, 
                action_url, metadata, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *`,
            [userId, project_id, title, message, type, severity, action_url, metadata, 'unread']
        );

        res.status(201).json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create Alert Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const updateAlertStatus = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!status || !['read', 'unread', 'archived'].includes(status)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Valid status required (read, unread, archived)' 
        });
    }

    try {
        const result = await pool.query(
            `UPDATE alerts 
             SET status = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [status, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Alert not found' 
            });
        }

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update Alert Status Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'SELECT COUNT(*) as unread_count FROM alerts WHERE user_id = $1 AND status = $2',
            [userId, 'unread']
        );

        res.json({
            status: 'success',
            data: {
                unread_count: parseInt(result.rows[0].unread_count)
            }
        });
    } catch (error) {
        console.error('Get Unread Count Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getNotificationHistory = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20, days = 30 } = req.query;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        
        const query = `
            SELECT 
                a.*,
                p.name as project_name,
                DATE_TRUNC('day', a.created_at) as date_group
            FROM alerts a
            LEFT JOIN projects p ON a.project_id = p.id
            WHERE a.user_id = $1 
            AND a.created_at >= NOW() - INTERVAL '${days} days'
            ORDER BY a.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, limit, offset]);

        // Get total count for pagination
        const countResult = await pool.query(
            `SELECT COUNT(*) as total 
             FROM alerts 
             WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
            [userId]
        );

        res.json({
            status: 'success',
            data: {
                notifications: result.rows,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total: parseInt(countResult.rows[0].total),
                    total_pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
                }
            }
        });
    } catch (error) {
        console.error('Get Notification History Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { alert_ids } = req.body; // Array of alert IDs

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!alert_ids || !Array.isArray(alert_ids)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'alert_ids array is required' 
        });
    }

    try {
        const result = await pool.query(
            `UPDATE alerts 
             SET status = 'read', updated_at = NOW()
             WHERE id = ANY($1::uuid[]) AND user_id = $2
             RETURNING id`,
            [alert_ids, userId]
        );

        res.json({
            status: 'success',
            data: {
                marked_read: result.rows.length,
                alert_ids: result.rows.map(row => row.id)
            }
        });
    } catch (error) {
        console.error('Mark As Read Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const deleteAlert = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Alert not found' 
            });
        }

        res.json({
            status: 'success',
            data: { message: 'Alert deleted successfully' }
        });
    } catch (error) {
        console.error('Delete Alert Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getNotificationSettings = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Check if user has notification settings
        let result = await pool.query(
            'SELECT * FROM notification_settings WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Create default settings
            const defaultSettings = {
                email_alerts: true,
                push_notifications: true,
                transaction_alerts: true,
                security_alerts: true,
                marketing_emails: false,
                weekly_reports: true
            };

            result = await pool.query(
                `INSERT INTO notification_settings (
                    user_id, email_alerts, push_notifications, transaction_alerts,
                    security_alerts, marketing_emails, weekly_reports
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [userId, defaultSettings.email_alerts, defaultSettings.push_notifications,
                 defaultSettings.transaction_alerts, defaultSettings.security_alerts,
                 defaultSettings.marketing_emails, defaultSettings.weekly_reports]
            );
        }

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get Notification Settings Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};
