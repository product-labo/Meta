const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testChainsQuery() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('🔗 Testing Chains API Query...');

        const query = `
            SELECT 
                c.id,
                c.name,
                c.id as chain_id,
                c.is_active,
                c.rpc_urls,
                c.block_time_sec,
                (SELECT COUNT(*) FROM mc_registry WHERE chain_id = c.id) as monitored_contracts
            FROM mc_chains c
            ORDER BY c.name
        `;

        const result = await client.query(query);

        console.log('✅ Chains API Query Results:');
        console.log('📊 Found', result.rows.length, 'chains');

        result.rows.forEach(chain => {
            console.log(`🔗 ${chain.name} (ID: ${chain.id})`);
            console.log(`   Chain ID: ${chain.chain_id}`);
            console.log(`   Active: ${chain.is_active}`);
            console.log(`   Monitored Contracts: ${chain.monitored_contracts}`);
            console.log('');
        });

        console.log('🎉 Chains API query test successful!');

    } catch (error) {
        console.error('❌ Error testing chains query:', error.message);
    } finally {
        await client.end();
    }
}

testChainsQuery();