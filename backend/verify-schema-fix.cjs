const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'zcash_user',
    password: process.env.DB_PASS || 'yourpassword',
    database: process.env.DB_NAME || 'zcash_indexer',
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const columns = ['chain', 'contract_address', 'abi', 'utility'];
        const types = ['VARCHAR(50)', 'VARCHAR(100)', 'TEXT', 'VARCHAR(50)'];

        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const type = types[i];

            const check = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'projects' AND column_name = $1
            `, [col]);

            if (check.rows.length === 0) {
                console.log(`Adding missing column: ${col}`);
                await client.query(`ALTER TABLE projects ADD COLUMN ${col} ${type}`);
            } else {
                console.log(`Column exists: ${col}`);
            }
        }

        console.log('Schema verification complete');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
