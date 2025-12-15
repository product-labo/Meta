
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'boardling',
});

async function verifySetup() {
    console.log('=== Verifying Custody Wallet Setup ===');

    // 1. Check Env
    console.log('\n1. Checking Environment Variables');
    if (process.env.ENCRYPTION_KEY) {
        console.log('   [PASS] ENCRYPTION_KEY is set.');
    } else {
        console.log('   [FAIL] ENCRYPTION_KEY is NOT set in .env.');
    }

    try {
        // 2. Check Table Existence
        console.log('\n2. Checking Database Schema');
        const tableRes = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'custodial_wallets'
            );
        `);

        if (tableRes.rows[0].exists) {
            console.log('   [PASS] custodial_wallets table exists.');

            // Check for constraints
            const constraints = await pool.query(`
                SELECT conname, contype
                FROM pg_constraint 
                WHERE conrelid = 'custodial_wallets'::regclass;
            `);
            console.log('   Existing constraints:', constraints.rows.map(r => r.conname).join(', '));

        } else {
            console.log('   [FAIL] custodial_wallets table does NOT exist.');
        }

        const userCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('google_id', 'github_id');
        `);

        const foundCols = userCols.rows.map(r => r.column_name);
        console.log('   Found user columns:', foundCols);

        if (foundCols.includes('google_id') && foundCols.includes('github_id')) {
            console.log('   [PASS] Users table has social columns.');
        } else {
            console.log('   [FAIL] Users table missing social columns.');
        }

    } catch (err) {
        console.error('Error during verification:', err);
    } finally {
        await pool.end();
    }
}

verifySetup();
