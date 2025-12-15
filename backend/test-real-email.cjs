require('dotenv').config();

async function testRealEmail() {
    try {
        console.log('🧪 Testing Real Gmail Configuration...');
        
        console.log('\n📧 Current Gmail Settings:');
        console.log('  GMAIL_USER:', process.env.GMAIL_USER);
        console.log('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? `SET (${process.env.GMAIL_APP_PASSWORD.length} chars)` : 'NOT SET');
        
        // Check if real Gmail credentials are set
        const isRealGmail = process.env.GMAIL_USER && 
                           process.env.GMAIL_USER !== 'your-gmail@gmail.com' &&
                           process.env.GMAIL_APP_PASSWORD &&
                           process.env.GMAIL_APP_PASSWORD !== 'your-app-password';
        
        if (isRealGmail) {
            console.log('\n✅ Real Gmail credentials detected!');
            console.log('  Email OTP will be sent to real users');
            
            // Test email service
            const { sendEmailOTP } = require('./src/services/emailService.js');
            console.log('\n📧 Testing email service...');
            
            try {
                await sendEmailOTP('test@example.com', '1234');
                console.log('✅ Email service test completed');
            } catch (error) {
                console.log('❌ Email service test failed:', error.message);
            }
        } else {
            console.log('\n⚠️  Placeholder Gmail credentials detected');
            console.log('  Email OTP will fallback to console');
            console.log('\n📝 To enable real email:');
            console.log('1. Update GMAIL_USER in .env');
            console.log('2. Update GMAIL_APP_PASSWORD in .env');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Gmail test failed:', err.message);
        process.exit(1);
    }
}

testRealEmail();
