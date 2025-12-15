require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailSend() {
    try {
        console.log('🧪 Testing Real Email Send...');
        
        console.log('\n📧 Gmail Configuration:');
        console.log('  User:', process.env.GMAIL_USER);
        console.log('  Password: SET');
        
        // Create transporter
const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
        
        console.log('\n📧 Testing email send...');
        
        // Test email
        const testOTP = '1234';
        const result = await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER, // Send to self for testing
            subject: 'Test OTP - Zcash Indexer',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Test Verification Code</h2>
                    <p>Your test verification code is:</p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
                        ${testOTP}
                    </div>
                    <p>This is a test email from your Zcash Indexer backend.</p>
                </div>
            `
        });
        
        console.log('✅ Email sent successfully!');
        console.log('  Message ID:', result.messageId);
        console.log('  Check your inbox:', process.env.GMAIL_USER);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Email send failed:', err.message);
        process.exit(1);
    }
}

testEmailSend();
