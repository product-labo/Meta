import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
});

async function fixUsersTable() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing users table - adding missing otp_expires_at column...\n');
        
        // Check if column exists
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'otp_expires_at'
        `);
        
        if (columnCheck.rows.length === 0) {
            console.log('➕ Adding otp_expires_at column...');
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN otp_expires_at TIMESTAMP WITHOUT TIME ZONE
            `);
            console.log('✅ Column added successfully');
        } else {
            console.log('✅ Column already exists');
        }
        
        // Verify the fix
        const updatedColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('otp_secret', 'otp_expires_at')
            ORDER BY column_name
        `);
        
        console.log('\n📋 OTP-related columns in users table:');
        updatedColumns.rows.forEach(col => {
            console.log(`  ✓ ${col.column_name}: ${col.data_type}`);
        });
        
        console.log('\n🎉 Users table fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixUsersTable().catch(console.error);