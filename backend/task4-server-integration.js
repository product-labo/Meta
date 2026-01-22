/**
 * Task 4 Server Integration - Add enhanced endpoints to main server
 * Integrates all Task 4 enhancements: 4.1, 4.2, and 4.3
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

// Import enhanced endpoints
import { enhancedBusinessDirectory } from './task4-1-enhance-directory.js';
import { enhancedBusinessDetail } from './task4-2-enhance-detail.js';
import { 
    getChainMetrics, 
    getCategoryMetrics, 
    getWalletMetrics, 
    getTrendMetrics 
} from './task4-3-metrics-endpoints.js';

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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    
    res.json({
      status: 'ok',
      message: 'Task 4 Enhanced Server is running',
      timestamp: new Date().toISOString(),
      database: 'connected',
      db_time: result.rows[0].current_time,
      port: process.env.PORT || 3003,
      enhancements: {
        task_4_1: 'Enhanced business directory with metrics filtering',
        task_4_2: 'Enhanced business detail with wallet analytics',
        task_4_3: 'New metrics-specific API endpoints'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Task 4.1: Enhanced business directory endpoint
app.get('/api/contract-business', enhancedBusinessDirectory);

// Task 4.2: Enhanced business detail endpoint
app.get('/api/contract-business/:address', enhancedBusinessDetail);

// Task 4.3: New metrics-specific endpoints
app.get('/api/metrics/chains', getChainMetrics);
app.get('/api/metrics/categories', getCategoryMetrics);
app.get('/api/metrics/wallets/:address', getWalletMetrics);
app.get('/api/metrics/trends', getTrendMetrics);

// Database info endpoint for testing
app.get('/api/database/info', async (req, res) => {
    try {
        const tablesQuery = `
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        const tablesResult = await pool.query(tablesQuery);
        
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
                record_counts: tableCounts,
                task_4_status: 'All enhancements integrated'
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

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        message: 'Task 4 Enhanced API Documentation',
        endpoints: {
            enhanced_endpoints: {
                'GET /api/contract-business': {
                    description: 'Enhanced business directory with comprehensive metrics filtering',
                    enhancements: [
                        'Metrics range filtering (growth, health, risk scores)',
                        'Advanced sorting by all metric types',
                        'Category and chain-level aggregations',
                        'Pagination support'
                    ],
                    parameters: {
                        category: 'Filter by category',
                        chainId: 'Filter by blockchain',
                        sortBy: 'Sort by: customers, revenue, transactions, growth_score, health_score, risk_score',
                        limit: 'Number of results (default: 10)',
                        offset: 'Pagination offset (default: 0)',
                        minGrowthScore: 'Minimum growth score filter',
                        maxGrowthScore: 'Maximum growth score filter',
                        minHealthScore: 'Minimum health score filter',
                        maxHealthScore: 'Maximum health score filter',
                        minRiskScore: 'Minimum risk score filter',
                        maxRiskScore: 'Maximum risk score filter',
                        verified: 'Filter by verification status'
                    }
                },
                'GET /api/contract-business/:address': {
                    description: 'Enhanced business detail with wallet analytics and trends',
                    enhancements: [
                        'Comprehensive metrics integration',
                        'Wallet analytics and customer segmentation',
                        'Historical trend data (30 days)',
                        'Competitive analysis',
                        'Customer insights and classifications'
                    ]
                }
            },
            new_metrics_endpoints: {
                'GET /api/metrics/chains': {
                    description: 'Chain-level metrics and analytics',
                    features: [
                        'Project counts per chain',
                        'Volume and transaction aggregations',
                        'Average performance scores',
                        'Market share calculations'
                    ],
                    parameters: {
                        timeframe: 'Analysis timeframe (default: 30d)'
                    }
                },
                'GET /api/metrics/categories': {
                    description: 'Category analytics and performance metrics',
                    features: [
                        'Category performance breakdown',
                        'Customer and transaction metrics',
                        'Financial performance analysis',
                        'Market dominance calculations'
                    ],
                    parameters: {
                        chainId: 'Filter by specific chain',
                        limit: 'Number of categories (default: 20)'
                    }
                },
                'GET /api/metrics/wallets/:address': {
                    description: 'Comprehensive wallet analytics',
                    features: [
                        'Wallet overview and classification',
                        'Project interaction breakdown',
                        'Activity timeline (30 days)',
                        'Portfolio diversification analysis',
                        'Risk profile assessment'
                    ]
                },
                'GET /api/metrics/trends': {
                    description: 'Growth trend analysis and market insights',
                    features: [
                        'Trending projects identification',
                        'Growth rate analysis',
                        'Category trend breakdown',
                        'Market sentiment indicators'
                    ],
                    parameters: {
                        timeframe: 'Analysis period (default: 30d)',
                        metric: 'Trend metric: volume, customers, transactions (default: volume)',
                        category: 'Filter by category',
                        chainId: 'Filter by chain',
                        limit: 'Number of results (default: 10)'
                    }
                }
            },
            utility_endpoints: {
                'GET /health': 'Server health check with enhancement status',
                'GET /api/database/info': 'Database information and table counts',
                'GET /api/docs': 'This API documentation'
            }
        },
        task_4_completion: {
            task_4_1: 'Enhanced business directory - COMPLETED',
            task_4_2: 'Enhanced business detail - COMPLETED', 
            task_4_3: 'New metrics endpoints - COMPLETED',
            task_4_4: 'Property tests - PENDING'
        }
    });
});

const PORT = process.env.PORT || 3003;
const server = app.listen(PORT, async () => {
  console.log(`🚀 Task 4 Enhanced Server running on port ${PORT}`);
  console.log('✅ All Task 4 enhancements integrated');
  
  // Test database connection and show metrics
  try {
    const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
    console.log(`✅ Database connected - Current time: ${result.rows[0].current_time}`);
    
    const contractResult = await pool.query('SELECT COUNT(*) as count FROM bi_contract_index');
    console.log(`✅ Contract index: ${contractResult.rows[0].count} records`);
    
    const metricsResult = await pool.query('SELECT COUNT(*) as count FROM project_metrics_realtime');
    console.log(`✅ Project metrics: ${metricsResult.rows[0].count} records`);
    
    const transactionResult = await pool.query('SELECT COUNT(*) as count FROM mc_transaction_details');
    console.log(`✅ Transaction details: ${transactionResult.rows[0].count} records`);
    
    console.log('\n🎯 Task 4 API Endpoints Available:');
    console.log('📊 Enhanced Endpoints:');
    console.log('   - GET /api/contract-business (enhanced with metrics filtering)');
    console.log('   - GET /api/contract-business/:address (enhanced with analytics)');
    console.log('📊 New Metrics Endpoints:');
    console.log('   - GET /api/metrics/chains');
    console.log('   - GET /api/metrics/categories');
    console.log('   - GET /api/metrics/wallets/:address');
    console.log('   - GET /api/metrics/trends');
    console.log('📊 Utility Endpoints:');
    console.log('   - GET /health');
    console.log('   - GET /api/database/info');
    console.log('   - GET /api/docs');
    
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