import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

async function runWatchlistMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting Watchlist and Alerts Migration...\n');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', '002_create_watchlist_alerts_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        console.log('📝 Executing migration SQL...');
        await client.query(migrationSQL);
        
        // Verify tables were created
        console.log('\n✅ Verifying table creation...');
        
        const tablesCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('watchlist', 'alerts', 'alert_history')
            ORDER BY table_name
        `);
        
        console.log('📋 Created tables:');
        tablesCheck.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });
        
        // Check table structures
        console.log('\n📊 Table structures:');
        
        for (const tableName of ['watchlist', 'alerts', 'alert_history']) {
            const columns = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [tableName]);
            
            console.log(`\n🔍 ${tableName.toUpperCase()} table:`);
            columns.rows.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
            });
        }
        
        // Check indexes
        console.log('\n🔗 Indexes created:');
        const indexes = await client.query(`
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE tablename IN ('watchlist', 'alerts', 'alert_history')
            AND indexname NOT LIKE '%_pkey'
            ORDER BY tablename, indexname
        `);
        
        indexes.rows.forEach(idx => {
            console.log(`  ✓ ${idx.indexname} on ${idx.tablename}`);
        });
        
        // Check sample data
        console.log('\n📈 Sample data verification:');
        
        const watchlistCount = await client.query('SELECT COUNT(*) FROM watchlist');
        const alertsCount = await client.query('SELECT COUNT(*) FROM alerts');
        
        console.log(`  📋 Watchlist entries: ${watchlistCount.rows[0].count}`);
        console.log(`  🔔 Alert configurations: ${alertsCount.rows[0].count}`);
        
        if (parseInt(watchlistCount.rows[0].count) > 0) {
            const sampleWatchlist = await client.query(`
                SELECT w.project_name, w.project_category, w.added_at, u.email 
                FROM watchlist w 
                JOIN users u ON w.user_id = u.id 
                LIMIT 3
            `);
            
            console.log('\n📋 Sample watchlist entries:');
            sampleWatchlist.rows.forEach(item => {
                console.log(`  - ${item.project_name} (${item.project_category}) - User: ${item.email}`);
            });
        }
        
        if (parseInt(alertsCount.rows[0].count) > 0) {
            const sampleAlerts = await client.query(`
                SELECT a.type, a.condition, a.threshold, a.threshold_unit, a.frequency, u.email 
                FROM alerts a 
                JOIN users u ON a.user_id = u.id 
                LIMIT 3
            `);
            
            console.log('\n🔔 Sample alert configurations:');
            sampleAlerts.rows.forEach(alert => {
                console.log(`  - ${alert.type} ${alert.condition} ${alert.threshold}${alert.threshold_unit} (${alert.frequency}) - User: ${alert.email}`);
            });
        }
        
        console.log('\n🎉 Watchlist and Alerts Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('  1. Register watchlist and alert routes in app.js');
        console.log('  2. Add API methods to frontend');
        console.log('  3. Connect frontend to backend APIs');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runWatchlistMigration().catch(console.error);