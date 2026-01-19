import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// B3: DATA EXPORT SYSTEM (8 endpoints)
// Comprehensive data export functionality
// =============================================================================

export const requestExport = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { 
        export_type, 
        project_id, 
        data_type, 
        format = 'csv',
        date_from,
        date_to,
        filters,
        include_fields
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!export_type || !data_type) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'export_type and data_type are required' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO export_requests (
                user_id, project_id, export_type, data_type, format,
                date_from, date_to, filters, include_fields, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            RETURNING *`,
            [
                userId, project_id, export_type, data_type, format,
                date_from, date_to, JSON.stringify(filters), include_fields, 'pending'
            ]
        );

        // Start export processing (in a real app, this would be queued)
        processExport(result.rows[0].id);

        res.status(201).json({
            status: 'success',
            data: {
                export_id: result.rows[0].id,
                status: 'pending',
                message: 'Export request created successfully'
            }
        });
    } catch (error) {
        console.error('Request Export Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getExportStatus = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM export_requests WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Export request not found' 
            });
        }

        const exportRequest = result.rows[0];

        res.json({
            status: 'success',
            data: {
                id: exportRequest.id,
                status: exportRequest.status,
                progress: exportRequest.progress || 0,
                file_size: exportRequest.file_size,
                download_url: exportRequest.status === 'completed' ? `/api/exports/${id}/download` : null,
                created_at: exportRequest.created_at,
                completed_at: exportRequest.completed_at,
                expires_at: exportRequest.expires_at,
                error_message: exportRequest.error_message
            }
        });
    } catch (error) {
        console.error('Get Export Status Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const downloadExport = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM export_requests WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Export request not found' 
            });
        }

        const exportRequest = result.rows[0];

        if (exportRequest.status !== 'completed') {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Export is not ready for download' 
            });
        }

        if (exportRequest.expires_at && new Date(exportRequest.expires_at) < new Date()) {
            return res.status(410).json({ 
                status: 'error', 
                message: 'Export has expired' 
            });
        }

        const filePath = exportRequest.file_path;
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Export file not found' 
            });
        }

        // Update download count
        await pool.query(
            'UPDATE export_requests SET download_count = download_count + 1, last_downloaded_at = NOW() WHERE id = $1',
            [id]
        );

        const fileName = `${exportRequest.data_type}_export_${exportRequest.created_at.toISOString().split('T')[0]}.${exportRequest.format}`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', getContentType(exportRequest.format));
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Download Export Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getExportHistory = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20, status, data_type } = req.query;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        let query = `
            SELECT 
                id, export_type, data_type, format, status, progress,
                file_size, created_at, completed_at, expires_at, download_count
            FROM export_requests 
            WHERE user_id = $1
        `;
        
        const params: any[] = [userId];
        let paramCount = 2;

        if (status) {
            query += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (data_type) {
            query += ` AND data_type = $${paramCount}`;
            params.push(data_type);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC`;

        // Pagination
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM export_requests 
            WHERE user_id = $1
            ${status ? ` AND status = '${status}'` : ''}
            ${data_type ? ` AND data_type = '${data_type}'` : ''}
        `;
        const countResult = await pool.query(countQuery, [userId]);

        res.json({
            status: 'success',
            data: {
                exports: result.rows,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total: parseInt(countResult.rows[0].total),
                    total_pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
                }
            }
        });
    } catch (error) {
        console.error('Get Export History Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const deleteExport = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM export_requests WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Export request not found' 
            });
        }

        const exportRequest = result.rows[0];

        // Delete file if it exists
        if (exportRequest.file_path && fs.existsSync(exportRequest.file_path)) {
            fs.unlinkSync(exportRequest.file_path);
        }

        // Delete from database
        await pool.query(
            'DELETE FROM export_requests WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        res.json({
            status: 'success',
            data: { message: 'Export deleted successfully' }
        });
    } catch (error) {
        console.error('Delete Export Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getExportTemplates = async (req: Request, res: Response) => {
    try {
        const templates = [
            {
                id: 'analytics_overview',
                name: 'Analytics Overview',
                description: 'Complete analytics data including transactions, users, and metrics',
                data_types: ['transactions', 'users', 'analytics'],
                formats: ['csv', 'json', 'pdf'],
                fields: [
                    'transaction_hash', 'from_address', 'to_address', 'value', 'gas_used',
                    'block_timestamp', 'status', 'user_metrics', 'retention_data'
                ]
            },
            {
                id: 'transaction_report',
                name: 'Transaction Report',
                description: 'Detailed transaction data with analytics',
                data_types: ['transactions'],
                formats: ['csv', 'json'],
                fields: [
                    'transaction_hash', 'from_address', 'to_address', 'value', 'gas_used',
                    'gas_price', 'block_number', 'block_timestamp', 'status', 'function_name'
                ]
            },
            {
                id: 'user_analytics',
                name: 'User Analytics',
                description: 'User behavior and retention analytics',
                data_types: ['users', 'analytics'],
                formats: ['csv', 'json', 'pdf'],
                fields: [
                    'wallet_address', 'first_transaction', 'last_transaction', 'total_transactions',
                    'total_volume', 'retention_cohort', 'user_segment'
                ]
            },
            {
                id: 'financial_summary',
                name: 'Financial Summary',
                description: 'Revenue and financial metrics',
                data_types: ['analytics', 'transactions'],
                formats: ['csv', 'pdf'],
                fields: [
                    'date', 'total_volume', 'transaction_count', 'unique_users',
                    'gas_fees', 'revenue_metrics'
                ]
            }
        ];

        res.json({
            status: 'success',
            data: { templates }
        });
    } catch (error) {
        console.error('Get Export Templates Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const scheduleExport = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { 
        template_id,
        project_id,
        schedule_type, // 'daily', 'weekly', 'monthly'
        schedule_time,
        email_recipients,
        format = 'csv'
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!template_id || !schedule_type) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'template_id and schedule_type are required' 
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO scheduled_exports (
                user_id, project_id, template_id, schedule_type, schedule_time,
                email_recipients, format, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING *`,
            [
                userId, project_id, template_id, schedule_type, schedule_time,
                JSON.stringify(email_recipients), format, true
            ]
        );

        res.status(201).json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Schedule Export Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getExportFormats = async (req: Request, res: Response) => {
    try {
        const formats = [
            {
                format: 'csv',
                name: 'CSV (Comma Separated Values)',
                description: 'Spreadsheet-compatible format',
                mime_type: 'text/csv',
                supports_large_datasets: true
            },
            {
                format: 'json',
                name: 'JSON (JavaScript Object Notation)',
                description: 'Developer-friendly structured data',
                mime_type: 'application/json',
                supports_large_datasets: true
            },
            {
                format: 'pdf',
                name: 'PDF (Portable Document Format)',
                description: 'Formatted report for sharing',
                mime_type: 'application/pdf',
                supports_large_datasets: false
            },
            {
                format: 'xlsx',
                name: 'Excel Spreadsheet',
                description: 'Microsoft Excel compatible',
                mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                supports_large_datasets: true
            }
        ];

        res.json({
            status: 'success',
            data: { formats }
        });
    } catch (error) {
        console.error('Get Export Formats Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// Helper functions
async function processExport(exportId: string) {
    try {
        // Update status to processing
        await pool.query(
            'UPDATE export_requests SET status = $1, started_at = NOW() WHERE id = $2',
            ['processing', exportId]
        );

        // Get export request details
        const result = await pool.query(
            'SELECT * FROM export_requests WHERE id = $1',
            [exportId]
        );

        const exportRequest = result.rows[0];
        
        // Simulate export processing (in real app, this would generate actual files)
        const data = await generateExportData(exportRequest);
        const filePath = await saveExportFile(data, exportRequest);
        
        // Update completion status
        await pool.query(
            `UPDATE export_requests 
             SET status = $1, completed_at = NOW(), file_path = $2, 
                 file_size = $3, expires_at = NOW() + INTERVAL '7 days'
             WHERE id = $4`,
            ['completed', filePath, data.length, exportId]
        );
    } catch (error) {
        console.error('Process Export Error:', error);
        await pool.query(
            'UPDATE export_requests SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', error.message, exportId]
        );
    }
}

async function generateExportData(exportRequest: any) {
    // This would generate actual export data based on the request
    // For now, return mock data
    return JSON.stringify({
        export_type: exportRequest.export_type,
        data_type: exportRequest.data_type,
        generated_at: new Date().toISOString(),
        data: []
    });
}

async function saveExportFile(data: string, exportRequest: any) {
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const fileName = `export_${exportRequest.id}.${exportRequest.format}`;
    const filePath = path.join(exportDir, fileName);
    
    fs.writeFileSync(filePath, data);
    return filePath;
}

function getContentType(format: string): string {
    const contentTypes = {
        'csv': 'text/csv',
        'json': 'application/json',
        'pdf': 'application/pdf',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return contentTypes[format] || 'application/octet-stream';
}