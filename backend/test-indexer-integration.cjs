const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testIndexerIntegration() {
    try {
        console.log('🧪 Testing Backend → Custom Contract Indexer Integration');
        
        // Step 1: Get verified user
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', ['soyaya1015@gmail.com']);
        
        if (userResult.rows.length === 0) {
            console.log('❌ User not found. Please run signup flow first.');
            return;
        }
        
        const user = userResult.rows[0];
        console.log('\n👤 User Found:', user.email);
        
        // Step 2: Simulate project creation with contract details
        console.log('\n🚀 Simulating Project Creation...');
        
        const projectData = {
            name: 'Test DeFi Protocol',
            description: 'A test DeFi protocol for indexing',
            category: 'defi',
            contract_address: '0x577d9A43D0fa564886379bdD9A56285769683C38',
            chain: 'lisk',
            abi: JSON.stringify([
                "event Transfer(address indexed from, address indexed to, uint256 value)",
                "function transfer(address to, uint256 amount) returns (bool)",
                "function balanceOf(address account) view returns (uint256)"
            ])
        };
        
        // Create project
        const projectResult = await pool.query(`
            INSERT INTO projects (user_id, name, description, category, contract_address, chain, abi, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            RETURNING *
        `, [user.id, projectData.name, projectData.description, projectData.category, 
            projectData.contract_address, projectData.chain, projectData.abi]);
        
        const project = projectResult.rows[0];
        console.log('✅ Project Created:', {
            id: project.id,
            name: project.name,
            contract_address: project.contract_address,
            chain: project.chain
        });
        
        // Step 3: Show what would happen with indexer integration
        console.log('\n🔍 Indexer Integration Flow:');
        console.log('1. ✅ Project created in database');
        console.log('2. 🔄 Custom indexer config would be generated:');
        
        const indexerConfig = {
            chains: {
                4202: "https://rpc.sepolia-api.lisk.com"
            },
            contracts: [
                {
                    chainId: 4202,
                    address: project.contract_address,
                    startBlock: "latest",
                    abi: JSON.parse(project.abi),
                    metadata: {
                        userId: user.id,
                        projectId: project.id,
                        chain: project.chain
                    }
                }
            ]
        };
        
        console.log('   Config:', JSON.stringify(indexerConfig, null, 2));
        
        console.log('3. 🚀 Custom contract indexer would start with this config');
        console.log('4. 📊 Indexer would create tables:');
        console.log('   - indexed_contracts (track progress)');
        console.log('   - contract_transactions (all txs)');
        console.log('   - contract_events (decoded events)');
        
        console.log('5. 🔄 Indexer would continuously monitor the contract');
        console.log('6. 📬 Backend could query indexed data for analytics');
        
        // Step 4: Mark onboarding complete
        await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [user.id]);
        console.log('\n✅ User onboarding marked complete');
        
        // Step 5: Show final state
        const finalUser = await pool.query('SELECT email, onboarding_completed FROM users WHERE id = $1', [user.id]);
        const userProjects = await pool.query('SELECT name, contract_address, chain FROM projects WHERE user_id = $1', [user.id]);
        
        console.log('\n🎯 Final State:');
        console.log('  User:', finalUser.rows[0]);
        console.log('  Projects:', userProjects.rows);
        
        console.log('\n✅ Backend → Indexer integration flow complete!');
        
        // Cleanup
        await pool.query('DELETE FROM projects WHERE id = $1', [project.id]);
        console.log('✅ Test cleanup complete');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Integration test failed:', err.message);
        process.exit(1);
    }
}

testIndexerIntegration();
