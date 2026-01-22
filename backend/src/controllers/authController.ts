import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateCustodialWalletService } from './custodyController.js';
import { sendEmailOTP } from '../services/emailService.js';

// Helper to generate OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

export const signup = async (req: Request, res: Response) => {
    const { email, phone, role, password } = req.body; // role: 'startup', 'investor', etc.

    if (!email && !phone) return res.status(400).json({ message: 'Email or phone required' });

    // If password provided, use password flow
    if (password && email) {
        try {
            const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (existing.rows.length > 0) return res.status(400).json({ message: 'User already exists' });

            const hash = await bcrypt.hash(password, 10);
            const roles = role ? JSON.stringify([role]) : JSON.stringify([]);

            // Enforce OTP verification even with password
            // Generate OTP
            const otp = generateOTP();

            const result = await pool.query(
                `INSERT INTO users (email, password_hash, is_verified, roles, onboarding_completed, otp_secret)
             VALUES ($1, $2, false, $3, false, $4) RETURNING id, email, roles`,
                [email, hash, roles, otp]
            );
            const user = result.rows[0];

            await sendEmailOTP(email, otp);

            // Auto-create custodial wallet
            try {
                await generateCustodialWalletService(user.id, null, 'lisk');
                await generateCustodialWalletService(user.id, null, 'starknet');
                await generateCustodialWalletService(user.id, null, 'zcash');
            } catch (wErr) {
                console.error('Failed to auto-create wallet during signup:', wErr);
            }

            // DO NOT return token. Return success message to prompt OTP.
            return res.json({ message: 'Signup successful. Please check email for OTP.', email: user.email });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }
    }

    // OTP Flow (fallback)
    const otp = generateOTP();
    if (email) {
        await sendEmailOTP(email, otp);
    } else {
        console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }

    try {
        // Check if user exists
        const existing = await pool.query('SELECT * FROM users WHERE email = $1 OR phone_number = $2', [email, phone]);

        if (existing.rows.length > 0) {
            const user = existing.rows[0];
            if (user.is_verified) {
                return res.status(400).json({ message: 'User already exists. Please login.' });
            } else {
                // Resend OTP to unverified user
                await pool.query('UPDATE users SET otp_secret = $1 WHERE id = $2', [otp, user.id]);
                return res.json({ message: 'OTP resent', email });
            }
        }

        // Create new unverified user
        // roles is array - must be JSON stringified for JSONB column
        const roles = role ? JSON.stringify([role]) : JSON.stringify([]);

        await pool.query(
            `INSERT INTO users (email, phone_number, otp_secret, is_verified, roles)
       VALUES ($1, $2, $3, false, $4)`,
            [email || null, phone || null, otp, roles]
        );

        res.json({ message: 'OTP sent', email });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const verifyOTP = async (req: Request, res: Response) => {
    const { email, phone, otp } = req.body;

    try {
        const queryStr = email ? 'SELECT * FROM users WHERE email = $1' : 'SELECT * FROM users WHERE phone_number = $1';
        const param = email || phone;

        const result = await pool.query(queryStr, [param]);
        if (result.rows.length === 0) return res.status(400).json({ message: 'User not found' });

        const user = result.rows[0];
        if (user.otp_secret !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Mark verified
        await pool.query('UPDATE users SET is_verified = true, otp_secret = null WHERE id = $1', [user.id]);

        // Auto-create custodial wallet (if not exists)
        try {
            await generateCustodialWalletService(user.id, null, 'lisk');
            await generateCustodialWalletService(user.id, null, 'starknet');
            await generateCustodialWalletService(user.id, null, 'zcash');
        } catch (wErr) {
            console.error('Failed to ensure wallet during OTP verification:', wErr);
            // Don't fail the verification if wallet creation fails, but log it critical
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, roles: user.roles, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone_number,
                roles: user.roles,
                onboarding_completed: user.onboarding_completed,
                is_verified: user.is_verified
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, phone, password } = req.body;

    if (password && email) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

            const user = result.rows[0];

            // 1. Enforce Verification
            if (!user.is_verified) {
                // Generate new OTP and send it
                const otp = generateOTP();
                await pool.query('UPDATE users SET otp_secret = $1 WHERE id = $2', [otp, user.id]);
                await sendEmailOTP(email, otp);
                return res.status(403).json({
                    message: 'Account not verified. OTP sent to email.',
                    requiresVerification: true,
                    email: user.email
                });
            }

            if (!user.password_hash) return res.status(400).json({ message: 'Password not set. Use OTP.' });

            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) return res.status(401).json({ message: 'Invalid password' });

            // 2. Ensure Unified Wallets Exist (Backfill if needed)
            try {
                await generateCustodialWalletService(user.id, null, 'lisk');
                await generateCustodialWalletService(user.id, null, 'starknet');
                await generateCustodialWalletService(user.id, null, 'zcash');
            } catch (wErr) {
                console.error('Failed to ensure wallets during login:', wErr);
            }

            const token = jwt.sign(
                { id: user.id, roles: user.roles, email: user.email },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '1d' }
            );

            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    roles: user.roles,
                    onboarding_completed: user.onboarding_completed,
                    is_verified: user.is_verified
                }
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }
    }

    const otp = generateOTP();
    if (email) {
        await sendEmailOTP(email, otp);
    } else {
        console.log(`[DEV] Login OTP for ${phone}: ${otp}`);
    }

    try {
        const queryStr = email ? 'SELECT * FROM users WHERE email = $1' : 'SELECT * FROM users WHERE phone_number = $1';
        const param = email || phone;

        const result = await pool.query(queryStr, [param]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found. Please sign up.' });
        }

        const user = result.rows[0];
        await pool.query('UPDATE users SET otp_secret = $1 WHERE id = $2', [otp, user.id]);

        res.json({ message: 'OTP sent', email });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const socialLogin = async (req: Request, res: Response) => {
    const { email, name, avatar, provider, providerId } = req.body;

    if (!email || !provider || !providerId) {
        return res.status(400).json({ message: 'Missing required social login fields' });
    }

    try {
        // Check for existing user by email or provider ID
        let queryStr = '';
        let params: any[] = [];

        if (provider === 'google') {
            queryStr = 'SELECT * FROM users WHERE email = $1 OR google_id = $2';
            params = [email, providerId];
        } else if (provider === 'github') {
            queryStr = 'SELECT * FROM users WHERE email = $1 OR github_id = $2';
            params = [email, providerId];
        } else {
            return res.status(400).json({ message: 'Unsupported provider' });
        }

        const existing = await pool.query(queryStr, params);

        let user;
        let isNewUser = false;

        if (existing.rows.length > 0) {
            user = existing.rows[0];

            // If user exists but social ID is missing, update it (Account Linking)
            let updateQuery = '';
            let updateParams: any[] = [];

            if (provider === 'google' && !user.google_id) {
                updateQuery = 'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3 RETURNING *';
                updateParams = [providerId, avatar, user.id];
            } else if (provider === 'github' && !user.github_id) {
                updateQuery = 'UPDATE users SET github_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3 RETURNING *';
                updateParams = [providerId, avatar, user.id];
            }

            if (updateQuery) {
                const updated = await pool.query(updateQuery, updateParams);
                user = updated.rows[0];
            }
        } else {
            // Create new user
            isNewUser = true;
            const insertQuery = `
                INSERT INTO users (email, name, avatar_url, is_verified, onboarding_completed, ${provider}_id)
                VALUES ($1, $2, $3, true, false, $4)
                RETURNING *
            `;
            const newUser = await pool.query(insertQuery, [email, name, avatar, providerId]);
            user = newUser.rows[0];

            // Auto-create custodial wallet
            try {
                await generateCustodialWalletService(user.id, null, 'lisk');
                await generateCustodialWalletService(user.id, null, 'starknet');
                await generateCustodialWalletService(user.id, null, 'zcash');
            } catch (wErr) {
                console.error('Failed to auto-create wallet during social signup:', wErr);
            }
        }

        const token = jwt.sign(
            { id: user.id, roles: user.roles || [], email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar_url,
                roles: user.roles,
                onboarding_completed: user.onboarding_completed,
                is_verified: user.is_verified,
                is_new: isNewUser
            }
        });

    } catch (error) {
        console.error('Social login error:', error);
        res.status(500).json({ message: 'Server error during social login' });
    }
};
