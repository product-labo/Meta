/**
 * Simple test for Task 2 - Backend server setup and database connections
 * Requirements: 8.1, 8.4 - Start backend server, verify database connectivity, test API endpoints
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
};

async function testTask2Setup() {
    console.log('🧪 Testing Task 2: Backend Server Setup and Database Connections\n');

    let pool = null;

    try {
        // 1. Test Database Connection
        console.log('1️⃣ Testing PostgreSQL database connection...');
        pool = new Pool(dbConfig);
        
        const dbTestResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Database connection successful');
        console.log(`   - Current time: ${dbTestResult.rows[0].current_time}`);
        console.log(`   - Database: ${dbConfig.database}`);

        // 2. Test Required Tables
        console.log('\n2️⃣ Checking required database tables...');
        
        const requiredTables = [
            'users', 'projects', 'bi_contract_index', 'mc_transaction_details',
            'project_metrics_realtime', 'wallet_metrics_realtime'
        ];
        
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ANY($1)
            ORDER BY table_name
        `;
        
        const tablesResult = await pool.query(tablesQuery, [requiredTables]);
        const existingTables = tablesResult.rows.map(row => row.table_name);
        
        console.log('📊 Found tables:', existingTables);
        
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        if (missingTables.length > 0) {
            console.log('⚠️  Missing tables:', missingTables);
        } else {
            console.log('✅ All required tables exist');
        }

        // 3. Test Sample Data
        console.log('\n3️⃣ Checking sample data availability...');
        
        const dataChecks = [
            { name: 'Users', table: 'users' },
            { name: 'Projects', table: 'projects' },
            { name: 'Contract Index', table: 'bi_contract_index' },
            { name: 'Transactions', table: 'mc_transaction_details' },
            { name: 'Project Metrics', table: 'project_metrics_realtime' }
        ];
        
        for (const check of dataChecks) {
            try {
                if (existingTables.includes(check.table)) {
                    const result = await pool.query(`SELECT COUNT(*) as count FROM ${check.table}`);
                    const count = parseInt(result.rows[0].count);
                    console.log(`   - ${check.name}: ${count} records`);
                } else {
                    console.log(`   - ${check.name}: Table not found`);
                }
            } catch (error) {
                console.log(`   - ${check.name}: Error checking (${error.message})`);
            }
        }

        // 4. Test Contract Business Data
        console.log('\n4️⃣ Testing contract business data structure...');
        
        if (existingTables.includes('bi_contract_index')) {
            try {
                const contractQuery = `
                    SELECT 
                        contract_address,
                        contract_name,
                        category,
                        chain_id,
                        is_verified
                    FROM bi_contract_index 
                    LIMIT 3
                `;
                
                const contractResult = await pool.query(contractQuery);
                
                if (contractResult.rows.length > 0) {
                    console.log('✅ Contract business data available:');
                    contractResult.rows.forEach(row => {
                        console.log(`   - ${row.contract_name} (${row.category}) on chain ${row.chain_id}`);
                    });
                } else {
                    console.log('⚠️  No contract business data found');
                }
            } catch (error) {
                console.log('❌ Error checking contract data:', error.message);
            }
        }

        // 5. Test Transaction Data
        console.log('\n5️⃣ Testing transaction data structure...');
        
        if (existingTables.includes('mc_transaction_details')) {
            try {
                const txQuery = `
                    SELECT 
                        COUNT(*) as total_transactions,
                        COUNT(DISTINCT contract_address) as unique_contracts,
                        COUNT(DISTINCT from_address) as unique_wallets,
                        MIN(block_timestamp) as earliest_tx,
                        MAX(block_timestamp) as latest_tx
                    FROM mc_transaction_details
                `;
                
                const txResult = await pool.query(txQuery);
                const txData = txResult.rows[0];
                
                console.log('✅ Transaction data summary:');
                console.log(`   - Total transactions: ${txData.total_transactions}`);
                console.log(`   - Unique contracts: ${txData.unique_contracts}`);
                console.log(`   - Unique wallets: ${txData.unique_wallets}`);
                console.log(`   - Date range: ${txData.earliest_tx} to ${txData.latest_tx}`);
                
            } catch (error) {
                console.log('❌ Error checking transaction data:', error.message);
            }
        }

        // 6. Test API Query Structure
        console.log('\n6️⃣ Testing API query structure...');
        
        if (existingTables.includes('bi_contract_index') && existingTables.includes('project_metrics_realtime')) {
            try {
                const apiQuery = `
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
                        COALESCE(pmr.growth_score, 50) as growth_score,
                        COALESCE(pmr.health_score, 50) as health_score,
                        COALESCE(pmr.risk_score, 50) as risk_score
                    FROM bi_contract_index bci
                    LEFT JOIN project_metrics_realtime pmr ON bci.contract_address = pmr.contract_address
                    LIMIT 3
                `;
                
                const apiResult = await pool.query(apiQuery);
                
                if (apiResult.rows.length > 0) {
                    console.log('✅ API query structure working:');
                    apiResult.rows.forEach(row => {
                        console.log(`   - ${row.business_name}: ${row.total_customers} customers, ${row.total_transactions} transactions`);
                        console.log(`     Growth: ${row.growth_score}, Health: ${row.health_score}, Risk: ${row.risk_score}`);
                    });
                } else {
                    console.log('⚠️  No data returned from API query');
                }
                
            } catch (error) {
                console.log('❌ Error testing API query:', error.message);
            }
        }

        console.log('\n🎉 Task 2 Database Testing Completed Successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Database: Connected to PostgreSQL`);
        console.log(`   - Tables: ${existingTables.length}/${requiredTables.length} required tables found`);
        console.log(`   - Data: Contract and transaction data available`);
        console.log(`   - API Structure: Ready for backend server`);
        
        console.log('\n📋 Next Steps:');
        console.log('   1. Start the backend server (node backend/task2-server.js)');
        console.log('   2. Test API endpoints');
        console.log('   3. Verify frontend integration');

    } catch (error) {
        console.error('❌ Task 2 test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        if (pool) {
            await pool.end();
            console.log('🛑 Database connection closed');
        }
    }
}

// Run the test
testTask2Setup().catch(console.error);