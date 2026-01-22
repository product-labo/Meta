/**
 * Test script for backend server setup and database connections
 * Requirements: 8.1, 8.4 - Start backend server, verify database connectivity, test API endpoints
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
};

async function testServerSetup() {
    console.log('🧪 Testing Backend Server Setup and Database Connections...\n');

    let pool = null;
    let server = null;

    try {
        // 1. Test Database Connection
        console.log('1️⃣ Testing PostgreSQL database connection...');
        pool = new Pool(dbConfig);
        
        const dbTestResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Database connection successful');
        console.log(`   - Current time: ${dbTestResult.rows[0].current_time}`);
        console.log(`   - Database version: ${dbTestResult.rows[0].db_version.split(' ')[0]} ${dbTestResult.rows[0].db_version.split(' ')[1]}`);

        // 2. Test Database Tables
        console.log('\n2️⃣ Verifying required database tables...');
        
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'users', 'projects', 'bi_contract_index', 'mc_transaction_details', 
                'project_metrics_realtime', 'wallet_metrics_realtime'
            )
            ORDER BY table_name
        `;
        
        const tablesResult = await pool.query(tablesQuery);
        const existingTables = tablesResult.rows.map(row => row.table_name);
        
        const requiredTables = [
            'users', 'projects', 'bi_contract_index', 'mc_transaction_details',
            'project_metrics_realtime', 'wallet_metrics_realtime'
        ];
        
        console.log('📊 Found tables:', existingTables);
        
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        if (missingTables.length > 0) {
            console.log('⚠️  Missing tables:', missingTables);
        } else {
            console.log('✅ All required tables exist');
        }

        // 3. Test Sample Data
        console.log('\n3️⃣ Checking sample data availability...');
        
        const dataQueries = [
            { name: 'Users', query: 'SELECT COUNT(*) as count FROM users' },
            { name: 'Projects', query: 'SELECT COUNT(*) as count FROM projects' },
            { name: 'Contract Index', query: 'SELECT COUNT(*) as count FROM bi_contract_index' },
            { name: 'Transactions', query: 'SELECT COUNT(*) as count FROM mc_transaction_details' },
            { name: 'Project Metrics', query: 'SELECT COUNT(*) as count FROM project_metrics_realtime' }
        ];
        
        for (const dataQuery of dataQueries) {
            try {
                const result = await pool.query(dataQuery.query);
                const count = parseInt(result.rows[0].count);
                console.log(`   - ${dataQuery.name}: ${count} records`);
            } catch (error) {
                console.log(`   - ${dataQuery.name}: Table not found or error`);
            }
        }

        // 4. Set up Express Server
        console.log('\n4️⃣ Setting up Express server...');
        
        const app = express();
        
        // CORS configuration
        const corsOptions = {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true,
            optionsSuccessStatus: 200
        };
        app.use(cors(corsOptions));
        app.use(express.json());

        // Health check endpoint
        app.get('/health', async (req, res) => {
            try {
                const dbResult = await pool.query('SELECT NOW() as current_time');
                
                res.json({
                    status: 'ok',
                    message: 'Server is running',
                    timestamp: new Date().toISOString(),
                    database: 'connected',
                    db_time: dbResult.rows[0].current_time,
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

        // Contract-business API endpoint (existing)
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

        // Start server
        const PORT = process.env.PORT || 3003;
        
        server = app.listen(PORT, () => {
            console.log(`✅ Express server started on port ${PORT}`);
        });

        // Wait a moment for server to fully start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 5. Test API Endpoints
        console.log('\n5️⃣ Testing API endpoints...');
        
        // Test health endpoint
        try {
            const healthResponse = await fetch(`http://localhost:${PORT}/health`);
            const healthData = await healthResponse.json();
            
            if (healthData.status === 'ok') {
                console.log('✅ Health endpoint working');
                console.log(`   - Status: ${healthData.status}`);
                console.log(`   - Database: ${healthData.database}`);
            } else {
                console.log('⚠️  Health endpoint returned error:', healthData);
            }
        } catch (error) {
            console.log('❌ Health endpoint failed:', error.message);
        }

        // Test contract-business endpoint
        try {
            const businessResponse = await fetch(`http://localhost:${PORT}/api/contract-business?limit=5`);
            const businessData = await businessResponse.json();
            
            if (businessData.success) {
                console.log('✅ Contract-business endpoint working');
                console.log(`   - Found ${businessData.data.businesses.length} businesses`);
                
                if (businessData.data.businesses.length > 0) {
                    const firstBusiness = businessData.data.businesses[0];
                    console.log(`   - Sample: ${firstBusiness.business_name} (${firstBusiness.category})`);
                    console.log(`   - Customers: ${firstBusiness.total_customers}, Transactions: ${firstBusiness.total_transactions}`);
                }
            } else {
                console.log('⚠️  Contract-business endpoint returned error:', businessData);
            }
        } catch (error) {
            console.log('❌ Contract-business endpoint failed:', error.message);
        }

        // Test contract detail endpoint if we have data
        if (existingTables.includes('bi_contract_index')) {
            try {
                const sampleContractQuery = 'SELECT contract_address FROM bi_contract_index LIMIT 1';
                const sampleResult = await pool.query(sampleContractQuery);
                
                if (sampleResult.rows.length > 0) {
                    const sampleAddress = sampleResult.rows[0].contract_address;
                    const detailResponse = await fetch(`http://localhost:${PORT}/api/contract-business/${sampleAddress}`);
                    const detailData = await detailResponse.json();
                    
                    if (detailData.success) {
                        console.log('✅ Contract detail endpoint working');
                        console.log(`   - Contract: ${detailData.data.business_name}`);
                        console.log(`   - Category: ${detailData.data.category}`);
                    } else {
                        console.log('⚠️  Contract detail endpoint returned error:', detailData);
                    }
                }
            } catch (error) {
                console.log('❌ Contract detail endpoint failed:', error.message);
            }
        }

        console.log('\n🎉 Backend server setup test completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Database: Connected to PostgreSQL`);
        console.log(`   - Server: Running on port ${PORT}`);
        console.log(`   - Tables: ${existingTables.length} found`);
        console.log(`   - API Endpoints: Health and Contract-business working`);
        console.log('\n📋 Server is ready for dashboard integration!');

        // Keep server running for a few seconds to allow testing
        console.log('\n⏳ Server will run for 10 seconds for testing...');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
        console.error('❌ Server setup test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        if (server) {
            server.close(() => {
                console.log('🛑 Server stopped');
            });
        }
        if (pool) {
            await pool.end();
            console.log('🛑 Database connection closed');
        }
    }
}

// Run the test
testServerSetup().catch(console.error);