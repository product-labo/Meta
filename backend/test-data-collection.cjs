const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testDataCollection() {
    try {
        console.log('🧪 Testing Data Collection & User CRUD System');
        
        // Step 1: Get user and create test project
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', ['soyaya1015@gmail.com']);
        const user = userResult.rows[0];
        
        console.log('\n👤 User:', user.email);
        
        // Create test project
        const projectResult = await pool.query(`
            INSERT INTO projects (user_id, name, description, category, contract_address, chain, abi, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            RETURNING *
        `, [user.id, 'Test Data Collection', 'Test project for data collection', 'defi', 
            '0x577d9A43D0fa564886379bdD9A56285769683C38', 'lisk', 
            JSON.stringify(["event Transfer(address indexed from, address indexed to, uint256 value)"])]);
        
        const project = projectResult.rows[0];
        console.log('✅ Test project created:', project.id);
        
        // Step 2: Simulate indexed data (what indexer would create)
        console.log('\n📊 Simulating indexed data...');
        
        // Mock transactions
        const mockTransactions = [
            {
                hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                block: 1000000,
                from: '0x1111111111111111111111111111111111111111',
                to: project.contract_address,
                value: '1000000000000000000', // 1 ETH
                gas_used: 21000,
                gas_price: '20000000000',
                function_name: 'transfer'
            },
            {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                block: 1000001,
                from: project.contract_address,
                to: '0x2222222222222222222222222222222222222222',
                value: '500000000000000000', // 0.5 ETH
                gas_used: 25000,
                gas_price: '22000000000',
                function_name: 'withdraw'
            }
        ];
        
        // Mock events
        const mockEvents = [
            {
                hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                block: 1000000,
                log_index: 0,
                event_name: 'Transfer',
                event_data: {
                    from: '0x1111111111111111111111111111111111111111',
                    to: '0x2222222222222222222222222222222222222222',
                    value: '1000000000000000000'
                }
            }
        ];
        
        // Step 3: Insert into user-specific tables
        console.log('\n💾 Storing user-specific data...');
        
        for (const tx of mockTransactions) {
            await pool.query(`
                INSERT INTO user_contract_transactions 
                (user_id, project_id, transaction_hash, block_number, from_address, to_address, 
                 value, gas_used, gas_price, function_name, chain)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [user.id, project.id, tx.hash, tx.block, tx.from, tx.to, 
                tx.value, tx.gas_used, tx.gas_price, tx.function_name, 'lisk']);
        }
        
        for (const event of mockEvents) {
            await pool.query(`
                INSERT INTO user_contract_events 
                (user_id, project_id, transaction_hash, block_number, log_index, 
                 event_name, event_data, chain)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [user.id, project.id, event.hash, event.block, 
                event.log_index, event.event_name, JSON.stringify(event.event_data), 'lisk']);
        }
        
        console.log('✅ Mock data inserted');
        
        // Step 4: Test CRUD operations
        console.log('\n🔍 Testing CRUD Operations:');
        
        // READ: Get user transactions
        const userTxs = await pool.query(
            'SELECT * FROM user_contract_transactions WHERE user_id = $1 ORDER BY block_number DESC',
            [user.id]
        );
        console.log(`📊 User Transactions: ${userTxs.rows.length}`);
        userTxs.rows.forEach(tx => {
            console.log(`  - Block ${tx.block_number}: ${tx.function_name} (${tx.value} wei)`);
        });
        
        // READ: Get user events
        const userEvents = await pool.query(
            'SELECT * FROM user_contract_events WHERE user_id = $1 ORDER BY block_number DESC',
            [user.id]
        );
        console.log(`📊 User Events: ${userEvents.rows.length}`);
        userEvents.rows.forEach(event => {
            console.log(`  - Block ${event.block_number}: ${event.event_name}`);
        });
        
        // READ: Get project analytics
        const analytics = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM user_contract_transactions WHERE project_id = $1) as tx_count,
                (SELECT COUNT(*) FROM user_contract_events WHERE project_id = $1) as event_count
        `, [project.id]);
        
        console.log('📈 Project Analytics:', analytics.rows[0]);
        
        // Step 5: Frontend API endpoints would be:
        console.log('\n🌐 Frontend API Endpoints:');
        console.log('GET /api/user-data/transactions - Get user transactions');
        console.log('GET /api/user-data/events - Get user events');
        console.log('GET /api/user-data/projects/:id/analytics - Get project analytics');
        console.log('POST /api/user-data/projects/:id/sync - Trigger data sync');
        console.log('GET /api/user-data/dashboard - Get dashboard summary');
        
        // Cleanup
        await pool.query('DELETE FROM user_contract_events WHERE project_id = $1', [project.id]);
        await pool.query('DELETE FROM user_contract_transactions WHERE project_id = $1', [project.id]);
        await pool.query('DELETE FROM projects WHERE id = $1', [project.id]);
        
        console.log('\n✅ Data collection & CRUD system test complete!');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Data collection test failed:', err.message);
        process.exit(1);
    }
}

testDataCollection();
