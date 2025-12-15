const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testConnection() {
    console.log('Testing database connection...');

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('✅ Database connected successfully');

        const result = await client.query('SELECT COUNT(*) as chains FROM mc_chains WHERE is_active = true');
        console.log(`✅ Found ${result.rows[0].chains} active chains`);

        const contracts = await client.query('SELECT COUNT(*) as contracts FROM mc_registry');
        console.log(`✅ Found ${contracts.rows[0].contracts} contracts in registry`);

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    } finally {
        await client.end();
    }
}

testConnection();