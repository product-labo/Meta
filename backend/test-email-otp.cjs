const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

async function testEmailOTP() {
    try {
        console.log('🧪 Testing Email OTP Service...');
        
        const testEmail = 'test-email-otp@example.com';
        
        // Clean up first
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        console.log('\n📧 Email Service Status:');
        console.log('  GMAIL_USER:', process.env.GMAIL_USER || 'NOT SET');
        console.log('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');
        
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            console.log('\n⚠️  Email service not configured - will fallback to console');
            console.log('\n📝 To enable real email OTP:');
            console.log('1. Set GMAIL_USER=your-gmail@gmail.com in .env');
            console.log('2. Generate app password in Gmail settings');
            console.log('3. Set GMAIL_APP_PASSWORD=your-app-password in .env');
        } else {
            console.log('\n✅ Email service configured - will send real emails');
        }
        
        // Test OTP generation
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        console.log(`\n🔐 Generated OTP: ${otp}`);
        
        // Create user with OTP
        await pool.query(`
            INSERT INTO users (email, otp_secret, is_verified, roles, onboarding_completed)
            VALUES ($1, $2, false, $3, false)
        `, [testEmail, otp, ['startup']]);
        
        console.log('✅ User created with OTP in database');
        
        // Cleanup
        await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
        console.log('✅ Email OTP test complete');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Email OTP test failed:', err.message);
        process.exit(1);
    }
}

testEmailOTP();
