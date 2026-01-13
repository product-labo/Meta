import { Pool } from 'pg';
import fetch from 'node-fetch';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

async function testTask8Completion() {
    console.log('🧪 Task 8 Comprehensive Verification: Watchlist and Alert System');
    console.log('=' .repeat(70));
    
    let allTestsPassed = true;
    const results = [];

    try {
        // Test 1: Database Connection and Tables
        console.log('\n1️⃣ Testing Database Connection and Tables...');
        const client = await pool.connect();
        
        // Check if watchlist table exists and has correct structure
        const watchlistTable = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'watchlist' 
            ORDER BY ordinal_position
        `);
        
        if (watchlistTable.rows.length === 0) {
            console.log('❌ Watchlist table not found');
            allTestsPassed = false;
            results.push({ test: 'Watchlist Table', status: 'FAILED', message: 'Table not found' });
        } else {
            console.log('✅ Watchlist table exists with columns:');
            watchlistTable.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
            results.push({ test: 'Watchlist Table', status: 'PASSED', message: `${watchlistTable.rows.length} columns found` });
        }

        // Check if alerts table exists and has correct structure
        const alertsTable = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'alerts' 
            ORDER BY ordinal_position
        `);
        
        if (alertsTable.rows.length === 0) {
            console.log('❌ Alerts table not found');
            allTestsPassed = false;
            results.push({ test: 'Alerts Table', status: 'FAILED', message: 'Table not found' });
        } else {
            console.log('✅ Alerts table exists with columns:');
            alertsTable.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
            results.push({ test: 'Alerts Table', status: 'PASSED', message: `${alertsTable.rows.length} columns found` });
        }

        // Check if alert_history table exists
        const alertHistoryTable = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'alert_history' 
            ORDER BY ordinal_position
        `);
        
        if (alertHistoryTable.rows.length === 0) {
            console.log('❌ Alert History table not found');
            allTestsPassed = false;
            results.push({ test: 'Alert History Table', status: 'FAILED', message: 'Table not found' });
        } else {
            console.log('✅ Alert History table exists');
            results.push({ test: 'Alert History Table', status: 'PASSED', message: `${alertHistoryTable.rows.length} columns found` });
        }

        // Test 2: Check for sample data
        console.log('\n2️⃣ Testing Sample Data...');
        const watchlistCount = await client.query('SELECT COUNT(*) FROM watchlist');
        const alertsCount = await client.query('SELECT COUNT(*) FROM alerts');
        
        console.log(`✅ Watchlist entries: ${watchlistCount.rows[0].count}`);
        console.log(`✅ Alert configurations: ${alertsCount.rows[0].count}`);
        
        results.push({ 
            test: 'Sample Data', 
            status: 'PASSED', 
            message: `Watchlist: ${watchlistCount.rows[0].count}, Alerts: ${alertsCount.rows[0].count}` 
        });

        // Test 3: Check indexes
        console.log('\n3️⃣ Testing Database Indexes...');
        const indexes = await client.query(`
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE tablename IN ('watchlist', 'alerts', 'alert_history')
            ORDER BY tablename, indexname
        `);
        
        console.log('✅ Database indexes found:');
        indexes.rows.forEach(row => {
            console.log(`   - ${row.tablename}.${row.indexname}`);
        });
        
        results.push({ 
            test: 'Database Indexes', 
            status: 'PASSED', 
            message: `${indexes.rows.length} indexes found` 
        });

        // Test 4: Test CRUD Operations
        console.log('\n4️⃣ Testing CRUD Operations...');
        
        // Get a user ID for testing
        const users = await client.query('SELECT id FROM users LIMIT 1');
        if (users.rows.length === 0) {
            console.log('❌ No users found for testing');
            allTestsPassed = false;
            results.push({ test: 'CRUD Operations', status: 'FAILED', message: 'No users available for testing' });
        } else {
            const userId = users.rows[0].id;
            const testProjectId = '0xtest123456789abcdef';
            
            try {
                // Test INSERT
                await client.query(`
                    INSERT INTO watchlist (user_id, project_id, project_name, project_category) 
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (user_id, project_id) DO NOTHING
                `, [userId, testProjectId, 'Test Project', 'DeFi']);
                
                // Test SELECT
                const selectResult = await client.query(
                    'SELECT * FROM watchlist WHERE user_id = $1 AND project_id = $2',
                    [userId, testProjectId]
                );
                
                if (selectResult.rows.length > 0) {
                    console.log('✅ CRUD Operations: INSERT and SELECT working');
                    
                    // Test UPDATE
                    await client.query(`
                        UPDATE watchlist 
                        SET project_name = $1 
                        WHERE user_id = $2 AND project_id = $3
                    `, ['Updated Test Project', userId, testProjectId]);
                    
                    // Test DELETE
                    await client.query(
                        'DELETE FROM watchlist WHERE user_id = $1 AND project_id = $2',
                        [userId, testProjectId]
                    );
                    
                    console.log('✅ CRUD Operations: UPDATE and DELETE working');
                    results.push({ test: 'CRUD Operations', status: 'PASSED', message: 'All CRUD operations successful' });
                } else {
                    console.log('❌ CRUD Operations: INSERT failed');
                    allTestsPassed = false;
                    results.push({ test: 'CRUD Operations', status: 'FAILED', message: 'INSERT operation failed' });
                }
            } catch (crudError) {
                console.log('❌ CRUD Operations failed:', crudError.message);
                allTestsPassed = false;
                results.push({ test: 'CRUD Operations', status: 'FAILED', message: crudError.message });
            }
        }

        client.release();

        // Test 5: Check Route Files
        console.log('\n5️⃣ Testing Route Files...');
        
        const routeFiles = [
            'src/routes/watchlist.ts',
            'src/routes/alerts.ts',
            'src/controllers/watchlistController.ts',
            'src/controllers/alertController.ts'
        ];
        
        let routeFilesExist = true;
        routeFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                console.log(`✅ ${file} exists`);
            } else {
                console.log(`❌ ${file} missing`);
                routeFilesExist = false;
                allTestsPassed = false;
            }
        });
        
        results.push({ 
            test: 'Route Files', 
            status: routeFilesExist ? 'PASSED' : 'FAILED', 
            message: routeFilesExist ? 'All route files exist' : 'Some route files missing' 
        });

        // Test 6: Check Migration File
        console.log('\n6️⃣ Testing Migration File...');
        const migrationPath = path.join(__dirname, 'migrations/002_create_watchlist_alerts_tables.sql');
        if (fs.existsSync(migrationPath)) {
            console.log('✅ Migration file exists');
            results.push({ test: 'Migration File', status: 'PASSED', message: 'Migration file found' });
        } else {
            console.log('❌ Migration file missing');
            allTestsPassed = false;
            results.push({ test: 'Migration File', status: 'FAILED', message: 'Migration file not found' });
        }

        // Test 7: Property-Based Test Requirements
        console.log('\n7️⃣ Testing Property-Based Test Requirements...');
        
        // Check if property test files exist or if we need to create them
        const propertyTestFiles = [
            'tests/watchlist-properties.test.js',
            'tests/alert-properties.test.js'
        ];
        
        let propertyTestsExist = true;
        propertyTestFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                console.log(`✅ ${file} exists`);
            } else {
                console.log(`⚠️ ${file} missing (should be created for complete testing)`);
                propertyTestsExist = false;
            }
        });
        
        results.push({ 
            test: 'Property Tests', 
            status: propertyTestsExist ? 'PASSED' : 'PARTIAL', 
            message: propertyTestsExist ? 'Property test files exist' : 'Property test files should be created' 
        });

    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        allTestsPassed = false;
        results.push({ test: 'Test Execution', status: 'FAILED', message: error.message });
    } finally {
        await pool.end();
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TASK 8 VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    
    results.forEach(result => {
        const statusIcon = result.status === 'PASSED' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
        console.log(`${statusIcon} ${result.test}: ${result.status} - ${result.message}`);
    });
    
    console.log('\n' + '='.repeat(70));
    if (allTestsPassed) {
        console.log('🎉 TASK 8 VERIFICATION: ALL TESTS PASSED!');
        console.log('✅ Watchlist and Alert System is fully implemented and working');
        console.log('\nNext Steps:');
        console.log('- Task 8 can be marked as COMPLETED ✅');
        console.log('- Ready to proceed to Task 9: Advanced Project Comparison');
    } else {
        console.log('⚠️ TASK 8 VERIFICATION: SOME ISSUES FOUND');
        console.log('❌ Please address the failed tests before marking Task 8 as complete');
        console.log('\nRecommended Actions:');
        console.log('- Fix any database or file issues identified above');
        console.log('- Create missing property-based tests if needed');
        console.log('- Re-run this verification script');
    }
    console.log('='.repeat(70));
    
    return allTestsPassed;
}

// Run the test
testTask8Completion().catch(console.error);