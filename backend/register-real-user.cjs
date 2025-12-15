require('dotenv').config();
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'zcash_user', 
    password: 'yourpassword',
    database: 'zcash_indexer',
});

// Helper to generate OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Email service
const sendEmailOTP = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Your Verification Code - Zcash Indexer',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verification Code</h2>
                <p>Your verification code is:</p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            </div>
        `
    });
};

async function registerRealUser() {
    try {
        console.log('🧪 Registering Real User: soyaya1015@gmail.com');
        
        const email = 'soyaya1015@gmail.com';
        const role = 'startup';
        
        // Clean up first
        await pool.query('DELETE FROM custodial_wallets WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
        await pool.query('DELETE FROM users WHERE email = $1', [email]);
        
        // Step 1: Generate OTP
        const otp = generateOTP();
        console.log(`\n🔐 Generated OTP: ${otp}`);
        
        // Step 2: Create unverified user
        console.log('\n📝 Creating user in database...');
        await pool.query(`
            INSERT INTO users (email, otp_secret, is_verified, roles, onboarding_completed)
            VALUES ($1, $2, false, $3, false)
        `, [email, otp, [role]]);
        
        console.log('✅ User created in database');
        
        // Step 3: Send real OTP email
        console.log('\n📧 Sending OTP email...');
        await sendEmailOTP(email, otp);
        
        console.log('✅ OTP email sent successfully!');
        console.log(`📬 Check inbox: ${email}`);
        
        // Step 4: Show user details
        const userCheck = await pool.query('SELECT id, email, otp_secret, is_verified, onboarding_completed FROM users WHERE email = $1', [email]);
        const user = userCheck.rows[0];
        
        console.log('\n👤 User Details:');
        console.log('  ID:', user.id);
        console.log('  Email:', user.email);
        console.log('  OTP Secret:', user.otp_secret);
        console.log('  Verified:', user.is_verified);
        console.log('  Onboarding Complete:', user.onboarding_completed);
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Check email inbox for OTP');
        console.log('2. Use OTP to verify account');
        console.log('3. Multi-chain wallets will be created on verification');
        
        console.log('\n✅ Registration complete - waiting for OTP verification!');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Registration failed:', err.message);
        process.exit(1);
    }
}

registerRealUser();
