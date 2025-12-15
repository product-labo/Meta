const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testProjectCreation() {
    try {
        console.log('🧪 Testing Complete Onboarding + Project Creation Flow...');
        
        const testEmail = 'startup@zcash.com';
        const testOTP = '9999';
        
        // Clean up first
        await pool.query('DELETE FROM projects WHERE name = $1', ['Test Startup']);
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        // Step 1: OTP Signup
        console.log('\n📝 Step 1: OTP Signup');
        const userResult = await pool.query(`
            INSERT INTO users (email, otp_secret, is_verified, roles, onboarding_completed)
            VALUES ($1, $2, false, $3, false) 
            RETURNING id, email, onboarding_completed
        `, [testEmail, testOTP, ['startup']]);
        
        const user = userResult.rows[0];
        console.log('✅ User created:', user);
        
        // Step 2: OTP Verification
        console.log('\n🔐 Step 2: OTP Verification');
        await pool.query('UPDATE users SET is_verified = true, otp_secret = null WHERE id = $1', [user.id]);
        console.log('✅ User verified');
        
        // Step 3: Project Creation (Frontend startup form data)
        console.log('\n🚀 Step 3: Project Creation');
        const projectData = {
            name: 'Test Startup',
            description: 'A test DeFi startup',
            category: 'defi',
            contract_address: '0x1234567890abcdef',
            chain: 'lisk',
            abi: '{"inputs":[],"name":"test","outputs":[],"type":"function"}'
        };
        
        const projectResult = await pool.query(`
            INSERT INTO projects (user_id, name, description, category, contract_address, chain, abi, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            RETURNING id, name, category, contract_address, chain
        `, [user.id, projectData.name, projectData.description, projectData.category, 
            projectData.contract_address, projectData.chain, projectData.abi]);
        
        console.log('✅ Project created:', projectResult.rows[0]);
        
        // Step 4: Complete Onboarding
        console.log('\n🎯 Step 4: Complete Onboarding');
        await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [user.id]);
        
        // Final verification
        const finalCheck = await pool.query(`
            SELECT u.email, u.onboarding_completed, p.name as project_name, p.chain, p.contract_address
            FROM users u 
            LEFT JOIN projects p ON u.id = p.user_id 
            WHERE u.email = $1
        `, [testEmail]);
        
        console.log('✅ Final state:', finalCheck.rows[0]);
        
        // Cleanup
        await pool.query('DELETE FROM projects WHERE name = $1', ['Test Startup']);
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        console.log('\n✅ Complete onboarding flow test successful');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Project creation test failed:', err.message);
        process.exit(1);
    }
}

testProjectCreation();
