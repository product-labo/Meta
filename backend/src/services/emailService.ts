import nodemailer from 'nodemailer';

// Create transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

export const sendEmailOTP = async (email: string, otp: string): Promise<void> => {
    try {
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            console.log(`[DEV] Email service not configured. OTP for ${email}: ${otp}`);
            return;
        }

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

        console.log(`[PROD] OTP sent to email: ${email}`);
    } catch (error) {
        console.error('Failed to send email OTP:', error);
        // Fallback to console for development
        console.log(`[FALLBACK] OTP for ${email}: ${otp}`);
    }
};
