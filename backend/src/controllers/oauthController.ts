import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// =============================================================================
// C1: OAUTH INTEGRATION (8 endpoints)
// Complete OAuth integration with Google and GitHub
// =============================================================================

export const initiateGoogleOAuth = async (req: Request, res: Response) => {
    try {
        // Generate state parameter for security
        const state = crypto.randomBytes(32).toString('hex');
        
        // Store state in session or temporary storage
        // In production, you'd use Redis or session store
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || '')}&` +
            `response_type=code&` +
            `scope=openid%20email%20profile&` +
            `state=${state}`;

        res.json({
            status: 'success',
            data: {
                auth_url: googleAuthUrl,
                state: state,
                provider: 'google'
            }
        });
    } catch (error) {
        console.error('Google OAuth initiation error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to initiate Google OAuth' 
        });
    }
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Authorization code is required' 
        });
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID || '',
                client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                code: code as string,
                grant_type: 'authorization_code',
                redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error_description || 'Failed to exchange code for token');
        }

        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const userData = await userResponse.json();

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user data from Google');
        }

        // Check if user exists or create new user
        let user = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [userData.email]
        );

        if (user.rows.length === 0) {
            // Create new user
            const newUser = await pool.query(
                `INSERT INTO users (email, email_verified, roles, onboarding_completed, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 RETURNING *`,
                [userData.email, true, ['user'], false]
            );
            user = newUser;

            // Create profile
            await pool.query(
                `INSERT INTO profiles (user_id, display_name, avatar_url)
                 VALUES ($1, $2, $3)`,
                [newUser.rows[0].id, userData.name, userData.picture]
            );
        }

        // Store OAuth provider info
        await pool.query(
            `INSERT INTO oauth_providers (user_id, provider, provider_id, access_token, refresh_token, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (user_id, provider) 
             DO UPDATE SET 
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                updated_at = NOW()`,
            [user.rows[0].id, 'google', userData.id, tokenData.access_token, tokenData.refresh_token]
        );

        // Generate JWT token
        const jwtToken = jwt.sign(
            { 
                id: user.rows[0].id, 
                email: user.rows[0].email,
                roles: user.rows[0].roles 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}&provider=google`);

    } catch (error) {
        console.error('Google OAuth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/error?message=oauth_failed`);
    }
};

export const initiateGitHubOAuth = async (req: Request, res: Response) => {
    try {
        const state = crypto.randomBytes(32).toString('hex');
        
        const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
            `client_id=${process.env.GITHUB_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.GITHUB_REDIRECT_URI || '')}&` +
            `scope=user:email&` +
            `state=${state}`;

        res.json({
            status: 'success',
            data: {
                auth_url: githubAuthUrl,
                state: state,
                provider: 'github'
            }
        });
    } catch (error) {
        console.error('GitHub OAuth initiation error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to initiate GitHub OAuth' 
        });
    }
};

export const handleGitHubCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Authorization code is required' 
        });
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description || 'Failed to exchange code for token');
        }

        // Get user info from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'Meta-Analytics-App',
            },
        });

        const userData = await userResponse.json();

        // Get user email (GitHub might not return email in user endpoint)
        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'Meta-Analytics-App',
            },
        });

        const emailData = await emailResponse.json();
        const primaryEmail = emailData.find((email: any) => email.primary)?.email || userData.email;

        if (!primaryEmail) {
            throw new Error('Unable to retrieve email from GitHub');
        }

        // Check if user exists or create new user
        let user = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [primaryEmail]
        );

        if (user.rows.length === 0) {
            // Create new user
            const newUser = await pool.query(
                `INSERT INTO users (email, email_verified, roles, onboarding_completed, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 RETURNING *`,
                [primaryEmail, true, ['user'], false]
            );
            user = newUser;

            // Create profile
            await pool.query(
                `INSERT INTO profiles (user_id, display_name, avatar_url)
                 VALUES ($1, $2, $3)`,
                [newUser.rows[0].id, userData.name || userData.login, userData.avatar_url]
            );
        }

        // Store OAuth provider info
        await pool.query(
            `INSERT INTO oauth_providers (user_id, provider, provider_id, access_token, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, provider) 
             DO UPDATE SET 
                access_token = EXCLUDED.access_token,
                updated_at = NOW()`,
            [user.rows[0].id, 'github', userData.id.toString(), tokenData.access_token]
        );

        // Generate JWT token
        const jwtToken = jwt.sign(
            { 
                id: user.rows[0].id, 
                email: user.rows[0].email,
                roles: user.rows[0].roles 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}&provider=github`);

    } catch (error) {
        console.error('GitHub OAuth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/error?message=oauth_failed`);
    }
};

export const socialLogin = async (req: Request, res: Response) => {
    const { provider, access_token, id_token } = req.body;

    if (!provider || !access_token) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Provider and access_token are required' 
        });
    }

    try {
        let userData;
        
        if (provider === 'google') {
            // Verify Google token and get user info
            const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`);
            userData = await response.json();
            
            if (!response.ok) {
                throw new Error('Invalid Google access token');
            }
        } else if (provider === 'github') {
            // Verify GitHub token and get user info
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    'User-Agent': 'Meta-Analytics-App',
                },
            });
            userData = await response.json();
            
            if (!response.ok) {
                throw new Error('Invalid GitHub access token');
            }
        } else {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Unsupported provider' 
            });
        }

        // Find or create user
        let user = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [userData.email]
        );

        if (user.rows.length === 0) {
            // Create new user
            const newUser = await pool.query(
                `INSERT INTO users (email, email_verified, roles, onboarding_completed, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 RETURNING *`,
                [userData.email, true, ['user'], false]
            );
            user = newUser;

            // Create profile
            await pool.query(
                `INSERT INTO profiles (user_id, display_name, avatar_url)
                 VALUES ($1, $2, $3)`,
                [newUser.rows[0].id, userData.name || userData.login, userData.picture || userData.avatar_url]
            );
        }

        // Update OAuth provider info
        await pool.query(
            `INSERT INTO oauth_providers (user_id, provider, provider_id, access_token, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, provider) 
             DO UPDATE SET 
                access_token = EXCLUDED.access_token,
                updated_at = NOW()`,
            [user.rows[0].id, provider, userData.id.toString(), access_token]
        );

        // Generate JWT token
        const jwtToken = jwt.sign(
            { 
                id: user.rows[0].id, 
                email: user.rows[0].email,
                roles: user.rows[0].roles 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.json({
            status: 'success',
            data: {
                token: jwtToken,
                user: {
                    id: user.rows[0].id,
                    email: user.rows[0].email,
                    roles: user.rows[0].roles,
                    onboarding_completed: user.rows[0].onboarding_completed
                }
            }
        });

    } catch (error) {
        console.error('Social login error:', error);
        res.status(401).json({ 
            status: 'error', 
            message: 'Social login failed' 
        });
    }
};

export const getAuthProviders = async (req: Request, res: Response) => {
    try {
        const providers = [
            {
                name: 'google',
                display_name: 'Google',
                enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
                icon: 'https://developers.google.com/identity/images/g-logo.png',
                scopes: ['openid', 'email', 'profile']
            },
            {
                name: 'github',
                display_name: 'GitHub',
                enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
                icon: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
                scopes: ['user:email']
            }
        ];

        res.json({
            status: 'success',
            data: { providers }
        });
    } catch (error) {
        console.error('Get auth providers error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to retrieve auth providers' 
        });
    }
};

export const linkProvider = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { provider, access_token, provider_user_id } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!provider || !access_token || !provider_user_id) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Provider, access_token, and provider_user_id are required' 
        });
    }

    try {
        // Check if provider is already linked to another user
        const existingLink = await pool.query(
            'SELECT user_id FROM oauth_providers WHERE provider = $1 AND provider_id = $2',
            [provider, provider_user_id]
        );

        if (existingLink.rows.length > 0 && existingLink.rows[0].user_id !== userId) {
            return res.status(409).json({ 
                status: 'error', 
                message: 'This provider account is already linked to another user' 
            });
        }

        // Link provider to user
        await pool.query(
            `INSERT INTO oauth_providers (user_id, provider, provider_id, access_token, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, provider) 
             DO UPDATE SET 
                provider_id = EXCLUDED.provider_id,
                access_token = EXCLUDED.access_token,
                updated_at = NOW()`,
            [userId, provider, provider_user_id, access_token]
        );

        res.json({
            status: 'success',
            data: {
                message: `${provider} account linked successfully`,
                provider: provider
            }
        });

    } catch (error) {
        console.error('Link provider error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to link provider' 
        });
    }
};

export const unlinkProvider = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { provider } = req.params;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Check if user has other login methods
        const userAuth = await pool.query(
            `SELECT 
                (password_hash IS NOT NULL) as has_password,
                COUNT(op.provider) as linked_providers
             FROM users u
             LEFT JOIN oauth_providers op ON u.id = op.user_id
             WHERE u.id = $1
             GROUP BY u.id, u.password_hash`,
            [userId]
        );

        const authMethods = userAuth.rows[0];
        
        if (!authMethods.has_password && authMethods.linked_providers <= 1) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Cannot unlink the only authentication method. Please set a password first.' 
            });
        }

        // Unlink provider
        const result = await pool.query(
            'DELETE FROM oauth_providers WHERE user_id = $1 AND provider = $2 RETURNING provider',
            [userId, provider]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Provider not linked to this account' 
            });
        }

        res.json({
            status: 'success',
            data: {
                message: `${provider} account unlinked successfully`,
                provider: provider
            }
        });

    } catch (error) {
        console.error('Unlink provider error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to unlink provider' 
        });
    }
};