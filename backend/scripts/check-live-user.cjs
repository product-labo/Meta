
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

console.log('Loading env...');
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
    connectionTimeoutMillis: 5000,
});

async function checkLastUser() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected.');

        // Get last user
        const userRes = await client.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 1');

        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            console.log('\n--- User Data ---');
            console.log(JSON.stringify(user, null, 2));

            // Get wallets for this user
            const walletRes = await client.query('SELECT * FROM custodial_wallets WHERE user_id = $1 ORDER BY network', [user.id]);

            console.log('\n--- Custodial Wallets Data ---');
            if (walletRes.rows.length > 0) {
                console.log(JSON.stringify(walletRes.rows, null, 2));
            } else {
                console.log('No custodial wallets found for this user.');
            }

        } else {
            console.log('No users found.');
        }

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        console.log('Closing pool...');
        await pool.end();
    }
}

checkLastUser();
