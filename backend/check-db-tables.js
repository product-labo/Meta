const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
});

async function checkTables() {
    try {
        console.log('🔍 Checking existing database tables...\n');
        
        // Get all tables
        const tablesResult = await pool.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 EXISTING TABLES:');
        console.log('==================');
        tablesResult.rows.forEach(row => {
            console.log(`- ${row.table_name} (${row.table_type})`);
        });
        
        console.log(`\nTotal tables: ${tablesResult.rows.length}\n`);
        
        // Check for specific analytics tables
        const analyticsTableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('project_metrics', 'notifications', 'tasks', 'user_cohorts', 'wallet_analytics', 'bi_contract_index', 'mc_transaction_details')
            ORDER BY table_name
        `);
        
        console.log('🎯 ANALYTICS TABLES STATUS:');
        console.log('===========================');
        const expectedTables = ['project_metrics', 'notifications', 'tasks', 'user_cohorts', 'wallet_analytics', 'bi_contract_index', 'mc_transaction_details'];
        
        expectedTables.forEach(tableName => {
            const exists = analyticsTableCheck.rows.some(row => row.table_name === tableName);
            console.log(`${exists ? '✅' : '❌'} ${tableName}`);
        });
        
        // Check projects table structure
        console.log('\n🏗️  PROJECTS TABLE STRUCTURE:');
        console.log('=============================');
        const projectsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'projects' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        if (projectsStructure.rows.length > 0) {
            projectsStructure.rows.forEach(col => {
                console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
            });
        } else {
            console.log('❌ Projects table not found');
        }
        
        // Check if we have sample data
        console.log('\n📈 SAMPLE DATA CHECK:');
        console.log('=====================');
        
        try {
            const projectCount = await pool.query('SELECT COUNT(*) as count FROM projects');
            console.log(`Projects: ${projectCount.rows[0].count} records`);
        } catch (e) {
            console.log('❌ Cannot access projects table');
        }
        
        try {
            const walletCount = await pool.query('SELECT COUNT(*) as count FROM wallets');
            console.log(`Wallets: ${walletCount.rows[0].count} records`);
        } catch (e) {
            console.log('❌ Cannot access wallets table');
        }
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        console.error('Connection details:', {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5432',
            user: process.env.DB_USER || 'zcash_user',
            database: process.env.DB_NAME || 'zcash_indexer'
        });
    } finally {
        await pool.end();
    }
}

checkTables();