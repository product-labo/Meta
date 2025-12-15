const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testTransactionsAPI() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('💳 Testing Transactions API Queries...');

        // Test 1: Get recent transactions
        console.log('\n📊 Test 1: Recent Transactions');
        const recentQuery = `
            SELECT 
                td.tx_hash,
                td.function_name,
                td.from_address,
                td.to_address,
                td.value,
                td.gas_used,
                td.status,
                c.name as chain_name
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            ORDER BY td.captured_at DESC
            LIMIT 5
        `;

        const recentResult = await client.query(recentQuery);
        console.log(`Found ${recentResult.rows.length} recent transactions:`);

        recentResult.rows.forEach((tx, i) => {
            const status = tx.status === 1 ? '✅ Success' : '❌ Failed';
            console.log(`${i + 1}. ${tx.chain_name} - ${tx.function_name || 'Unknown'}`);
            console.log(`   TX: ${tx.tx_hash.slice(0, 20)}...`);
            console.log(`   Status: ${status}`);
            console.log(`   Gas Used: ${tx.gas_used}`);
            console.log(`   Value: ${tx.value} wei`);
            console.log('');
        });

        // Test 2: Transaction analytics
        console.log('📈 Test 2: Transaction Analytics');
        const analyticsQuery = `
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_transactions,
                COUNT(CASE WHEN td.status = 0 THEN 1 END) as failed_transactions,
                ROUND(AVG(td.gas_used), 0) as avg_gas_used,
                COUNT(DISTINCT td.function_name) as unique_functions,
                c.name as chain_name
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            WHERE td.captured_at > NOW() - INTERVAL '24 hours'
            GROUP BY c.id, c.name
            ORDER BY total_transactions DESC
        `;

        const analyticsResult = await client.query(analyticsQuery);
        console.log('Transaction analytics by chain (last 24h):');

        analyticsResult.rows.forEach(stats => {
            const successRate = stats.total_transactions > 0
                ? ((stats.successful_transactions / stats.total_transactions) * 100).toFixed(1)
                : 0;

            console.log(`🔗 ${stats.chain_name}:`);
            console.log(`   Total: ${stats.total_transactions} transactions`);
            console.log(`   Success Rate: ${successRate}%`);
            console.log(`   Avg Gas: ${stats.avg_gas_used}`);
            console.log(`   Unique Functions: ${stats.unique_functions}`);
            console.log('');
        });

        // Test 3: Top functions
        console.log('🔧 Test 3: Top Functions');
        const functionsQuery = `
            SELECT 
                td.function_name,
                COUNT(*) as usage_count,
                ROUND(AVG(td.gas_used), 0) as avg_gas_used,
                COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_calls
            FROM mc_transaction_details td
            WHERE td.function_name IS NOT NULL
            AND td.captured_at > NOW() - INTERVAL '24 hours'
            GROUP BY td.function_name
            ORDER BY usage_count DESC
            LIMIT 10
        `;

        const functionsResult = await client.query(functionsQuery);
        console.log('Top functions (last 24h):');

        functionsResult.rows.forEach((func, i) => {
            const successRate = func.usage_count > 0
                ? ((func.successful_calls / func.usage_count) * 100).toFixed(1)
                : 0;

            console.log(`${i + 1}. ${func.function_name}`);
            console.log(`   Calls: ${func.usage_count}`);
            console.log(`   Success Rate: ${successRate}%`);
            console.log(`   Avg Gas: ${func.avg_gas_used}`);
            console.log('');
        });

        console.log('🎉 Transactions API test successful!');

    } catch (error) {
        console.error('❌ Error testing transactions API:', error.message);
    } finally {
        await client.end();
    }
}

testTransactionsAPI();