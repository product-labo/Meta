/**
 * Task 2 Server - Backend server setup and database connections
 * Requirements: 8.1, 8.4 - Start backend server on port 3003, verify database connectivity, test existing API endpoints
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    
    res.json({
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      database: 'connected',
      db_time: result.rows[0].current_time,
      port: process.env.PORT || 3003
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Contract-business API endpoints (from existing contractBusiness.ts route)
app.get('/api/contract-business', async (req, res) => {
    try {
        const { category, chainId, sortBy = 'customers', limit = 10 } = req.query;

        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;

        if (category && category !== 'all') {
            whereClause += `WHERE bci.category = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }

        if (chainId) {
            whereClause += whereClause ? ` AND bci.chain_id = $${paramIndex}` : `WHERE bci.chain_id = $${paramIndex}`;
            queryParams.push(parseInt(chainId));
            paramIndex++;
        }

        const businessQuery = `
            SELECT 
                bci.contract_address,
                bci.contract_name as business_name,
                bci.category,
                bci.chain_id,
                bci.is_verified,
                COALESCE(pmr.total_customers, 0) as total_customers,
                COALESCE(pmr.total_transactions, 0) as total_transactions,
                COALESCE(pmr.total_volume_eth, 0) as total_revenue_eth,
                COALESCE(pmr.success_rate_percent, 0) as success_rate,
                COALESCE(pmr.customer_retention_rate, 0) as customer_retention_rate_percent,
                COALESCE(pmr.avg_transaction_value_eth, 0) as avg_transaction_value_eth,
                COALESCE(pmr.growth_score, 50) as growth_score,
                COALESCE(pmr.health_score, 50) as health_score,
                COALESCE(pmr.risk_score, 50) as risk_score
            FROM bi_contract_index bci
            LEFT JOIN project_metrics_realtime pmr ON bci.contract_address = pmr.contract_address
            ${whereClause}
            ORDER BY 
                CASE 
                    WHEN '${sortBy}' = 'customers' THEN COALESCE(pmr.total_customers, 0)
                    WHEN '${sortBy}' = 'revenue' THEN COALESCE(pmr.total_volume_eth, 0)
                    WHEN '${sortBy}' = 'transactions' THEN COALESCE(pmr.total_transactions, 0)
                    WHEN '${sortBy}' = 'growth' THEN COALESCE(pmr.growth_score, 0)
                    ELSE COALESCE(pmr.total_customers, 0)
                END DESC NULLS LAST
            LIMIT $${paramIndex}
        `;

        queryParams.push(parseInt(limit));

        const result = await pool.query(businessQuery, queryParams);

        res.json({
            success: true,
            data: {
                businesses: result.rows,
                filters: {
                    category,
                    chainId: chainId ? parseInt(chainId) : null,
                    sortBy,
                    limit: parseInt(limit)
                },
                total_businesses: result.rows.length
            }
        });

    } catch (error) {
        console.error('Error fetching business directory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business directory',
            message: error.message
        });
    }
});

// Contract-business detail endpoint
app.get('/api/contract-business/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const detailQuery = `
            SELECT 
                bci.contract_address,
                bci.contract_name as business_name,
                bci.category,
                bci.subcategory,
                bci.chain_id,
                bci.is_verified,
                bci.description,
                pmr.*
            FROM bi_contract_index bci
            LEFT JOIN project_metrics_realtime pmr ON bci.contract_address = pmr.contract_address
            WHERE bci.contract_address = $1
        `;

        const result = await pool.query(detailQuery, [address]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching project details:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Database info endpoint for testing
app.get('/api/database/info', async (req, res) => {
    try {
        // Get table information
        const tablesQuery = `
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        const tablesResult = await pool.query(tablesQuery);
        
        // Get record counts for key tables
        const keyTables = ['users', 'projects', 'bi_contract_index', 'mc_transaction_details', 'project_metrics_realtime'];
        const tableCounts = {};
        
        for (const table of keyTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                tableCounts[table] = parseInt(countResult.rows[0].count);
            } catch (error) {
                tableCounts[table] = 'N/A';
            }
        }

        res.json({
            success: true,
            data: {
                database_name: process.env.DB_NAME || 'david',
                total_tables: tablesResult.rows.length,
                tables: tablesResult.rows,
                record_counts: tableCounts
            }
        });

    } catch (error) {
        console.error('Error fetching database info:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

const PORT = process.env.PORT || 3003;
const server = app.listen(PORT, async () => {
  console.log(`🚀 Task 2 Server running on port ${PORT}`);
  console.log('✅ Backend server started successfully');
  
  // Test database connection on startup
  try {
    const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
    console.log(`✅ Database connected - Current time: ${result.rows[0].current_time}`);
    console.log(`✅ Users table has ${result.rows[0].user_count} records`);
    
    // Test contract business data
    const contractResult = await pool.query('SELECT COUNT(*) as count FROM bi_contract_index');
    console.log(`✅ Contract index has ${contractResult.rows[0].count} records`);
    
    const metricsResult = await pool.query('SELECT COUNT(*) as count FROM project_metrics_realtime');
    console.log(`✅ Project metrics has ${metricsResult.rows[0].count} records`);
    
  } catch (error) {
    console.log(`⚠️ Database connection issue: ${error.message}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end();
  });
});

export { server, pool };