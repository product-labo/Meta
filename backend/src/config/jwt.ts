import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Auto-generate JWT secret if not provided
if (!process.env.JWT_SECRET) {
    const generatedSecret = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  JWT_SECRET not found in .env file');
    console.warn('⚠️  Using auto-generated secret (not recommended for production)');
    console.warn(`⚠️  Add this to your .env file: JWT_SECRET=${generatedSecret}`);
    process.env.JWT_SECRET = generatedSecret;
}

export const JWT_SECRET = process.env.JWT_SECRET;
