import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'david',
});

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Watchlist routes
app.get('/api/watchlist', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                w.id,
                w.project_id,
                w.project_name,
                w.project_category,
                w.added_at,
                w.updated_at,
                COUNT(a.id) as alert_count
             FROM watchlist w
             LEFT JOIN alerts a ON w.project_id = a.project_id AND w.user_id = a.user_id AND a.is_active = true
             WHERE w.user_id = $1
             GROUP BY w.id, w.project_id, w.project_name, w.project_category, w.added_at, w.updated_at
             ORDER BY w.added_at DESC`,
            [req.user.id]
        );
        
        res.json({
            watchlist: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Get Watchlist Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/watchlist', authenticateToken, async (req, res) => {
    const { projectId, projectName, projectCategory } = req.body;

    if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (user_id, project_id) DO NOTHING
             RETURNING *`,
            [req.user.id, projectId, projectName || null, projectCategory || null]
        );
        
        if (result.rows.length > 0) {
            res.json({ 
                message: 'Added to watchlist', 
                watchlistItem: result.rows[0] 
            });
        } else {
            res.json({ message: 'Project already in watchlist' });
        }
    } catch (error) {
        console.error('Add Watchlist Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/watchlist/:projectId', authenticateToken, async (req, res) => {
    const { projectId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM watchlist WHERE user_id = $1 AND project_id = $2 RETURNING *`,
            [req.user.id, projectId]
        );
        
        if (result.rows.length > 0) {
            res.json({ 
                message: 'Removed from watchlist',
                removedItem: result.rows[0]
            });
        } else {
            res.status(404).json({ message: 'Project not found in watchlist' });
        }
    } catch (error) {
        console.error('Remove Watchlist Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/watchlist/status/:projectId', authenticateToken, async (req, res) => {
    const { projectId } = req.params;

    try {
        const result = await pool.query(
            `SELECT id FROM watchlist WHERE user_id = $1 AND project_id = $2`,
            [req.user.id, projectId]
        );
        
        res.json({
            isWatchlisted: result.rows.length > 0,
            watchlistId: result.rows.length > 0 ? result.rows[0].id : null
        });
    } catch (error) {
        console.error('Check Watchlist Status Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Alert routes
app.get('/api/alerts', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.query;
        let query = `
            SELECT a.*, w.project_name, w.project_category
            FROM alerts a
            LEFT JOIN watchlist w ON a.project_id = w.project_id AND a.user_id = w.user_id
            WHERE a.user_id = $1
        `;
        const params = [req.user.id];
        
        if (projectId) {
            query += ` AND a.project_id = $2`;
            params.push(projectId);
        }
        
        query += ` ORDER BY a.created_at DESC`;
        
        const result = await pool.query(query, params);
        
        res.json({
            alerts: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Get Alerts Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/alerts', authenticateToken, async (req, res) => {
    const { projectId, type, condition, threshold, thresholdUnit, frequency } = req.body;

    if (!projectId || !type || !condition) {
        return res.status(400).json({ message: 'Project ID, type, and condition are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO alerts (user_id, project_id, type, condition, threshold, threshold_unit, frequency) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [req.user.id, projectId, type, condition, threshold || null, thresholdUnit || null, frequency || 'immediate']
        );
        
        res.status(201).json({ 
            message: 'Alert created', 
            alert: result.rows[0] 
        });
    } catch (error) {
        console.error('Create Alert Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/api/alerts/:alertId', authenticateToken, async (req, res) => {
    const { alertId } = req.params;
    const { type, condition, threshold, thresholdUnit, frequency, isActive } = req.body;

    try {
        const result = await pool.query(
            `UPDATE alerts 
             SET type = COALESCE($3, type),
                 condition = COALESCE($4, condition),
                 threshold = COALESCE($5, threshold),
                 threshold_unit = COALESCE($6, threshold_unit),
                 frequency = COALESCE($7, frequency),
                 is_active = COALESCE($8, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [alertId, req.user.id, type, condition, threshold, thresholdUnit, frequency, isActive]
        );
        
        if (result.rows.length > 0) {
            res.json({ 
                message: 'Alert updated', 
                alert: result.rows[0] 
            });
        } else {
            res.status(404).json({ message: 'Alert not found' });
        }
    } catch (error) {
        console.error('Update Alert Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/alerts/:alertId', authenticateToken, async (req, res) => {
    const { alertId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM alerts WHERE id = $1 AND user_id = $2 RETURNING *`,
            [alertId, req.user.id]
        );
        
        if (result.rows.length > 0) {
            res.json({ 
                message: 'Alert deleted',
                deletedAlert: result.rows[0]
            });
        } else {
            res.status(404).json({ message: 'Alert not found' });
        }
    } catch (error) {
        console.error('Delete Alert Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/alerts/history', authenticateToken, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        
        const result = await pool.query(
            `SELECT ah.*, w.project_name, w.project_category
             FROM alert_history ah
             LEFT JOIN watchlist w ON ah.project_id = w.project_id AND ah.user_id = w.user_id
             WHERE ah.user_id = $1
             ORDER BY ah.triggered_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );
        
        res.json({
            history: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Get Alert History Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}`);
    console.log('✅ Watchlist and Alert APIs ready for testing');
});