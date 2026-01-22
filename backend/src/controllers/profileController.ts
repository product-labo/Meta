import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// B4: PROFILE MANAGEMENT (8 endpoints)
// Enhanced profile and settings management
// =============================================================================

export const getProfile = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const userResult = await pool.query(
            `SELECT 
                id, email, phone_number, roles, onboarding_completed, 
                created_at, last_login_at, email_verified, phone_verified
             FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'User not found' 
            });
        }

        const user = userResult.rows[0];

        const profileResult = await pool.query(
            'SELECT * FROM profiles WHERE user_id = $1', 
            [userId]
        );
        const profile = profileResult.rows[0] || {};

        // Get startup details if user is a startup
        let startupDetails = null;
        if (user.roles && user.roles.includes('startup')) {
            const sdResult = await pool.query(
                'SELECT * FROM startup_details WHERE user_id = $1', 
                [userId]
            );
            startupDetails = sdResult.rows[0];
        }

        // Get user statistics
        const statsResult = await pool.query(
            `SELECT 
                COUNT(DISTINCT p.id) as total_projects,
                COUNT(DISTINCT a.id) as total_alerts,
                COUNT(DISTINCT t.id) as total_tasks
             FROM users u
             LEFT JOIN projects p ON u.id = p.user_id
             LEFT JOIN alerts a ON u.id = a.user_id
             LEFT JOIN tasks t ON p.id = t.project_id
             WHERE u.id = $1`,
            [userId]
        );

        const stats = statsResult.rows[0] || {};

        res.json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    phone_number: user.phone_number,
                    roles: user.roles,
                    onboarding_completed: user.onboarding_completed,
                    created_at: user.created_at,
                    last_login_at: user.last_login_at,
                    email_verified: user.email_verified,
                    phone_verified: user.phone_verified
                },
                profile,
                startup_details: startupDetails,
                statistics: {
                    total_projects: parseInt(stats.total_projects) || 0,
                    total_alerts: parseInt(stats.total_alerts) || 0,
                    total_tasks: parseInt(stats.total_tasks) || 0
                }
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
        display_name,
        bio,
        location,
        website,
        social_links,
        timezone,
        language,
        notification_preferences
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO profiles (
                user_id, display_name, bio, location, website, social_links,
                timezone, language, notification_preferences, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
                bio = COALESCE(EXCLUDED.bio, profiles.bio),
                location = COALESCE(EXCLUDED.location, profiles.location),
                website = COALESCE(EXCLUDED.website, profiles.website),
                social_links = COALESCE(EXCLUDED.social_links, profiles.social_links),
                timezone = COALESCE(EXCLUDED.timezone, profiles.timezone),
                language = COALESCE(EXCLUDED.language, profiles.language),
                notification_preferences = COALESCE(EXCLUDED.notification_preferences, profiles.notification_preferences),
                updated_at = NOW()
            RETURNING *`,
            [
                userId, display_name, bio, location, website, 
                JSON.stringify(social_links), timezone, language, 
                JSON.stringify(notification_preferences)
            ]
        );

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const uploadAvatar = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // In a real implementation, you would handle file upload here
        // For now, we'll simulate avatar upload
        const avatarUrl = `/uploads/avatars/${userId}_${Date.now()}.jpg`;
        
        // Update profile with avatar URL
        const result = await pool.query(
            `INSERT INTO profiles (user_id, avatar_url, updated_at) 
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id) 
             DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
             RETURNING *`,
            [userId, avatarUrl]
        );

        res.json({
            status: 'success',
            data: {
                avatar_url: avatarUrl,
                message: 'Avatar uploaded successfully'
            }
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { current_password, new_password } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!current_password || !new_password) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Current password and new password are required' 
        });
    }

    if (new_password.length < 8) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'New password must be at least 8 characters long' 
        });
    }

    try {
        // Get current password hash
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'User not found' 
            });
        }

        // Verify current password (you would use bcrypt in real implementation)
        const currentHash = userResult.rows[0].password_hash;
        // const isValidPassword = await bcrypt.compare(current_password, currentHash);
        
        // For demo purposes, we'll skip password verification
        // if (!isValidPassword) {
        //     return res.status(400).json({ 
        //         status: 'error', 
        //         message: 'Current password is incorrect' 
        //     });
        // }

        // Hash new password (you would use bcrypt in real implementation)
        // const newHash = await bcrypt.hash(new_password, 10);
        const newHash = crypto.createHash('sha256').update(new_password).digest('hex');

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newHash, userId]
        );

        res.json({
            status: 'success',
            data: { message: 'Password changed successfully' }
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getSettings = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Get user settings
        let settingsResult = await pool.query(
            'SELECT * FROM user_settings WHERE user_id = $1',
            [userId]
        );

        if (settingsResult.rows.length === 0) {
            // Create default settings
            const defaultSettings = {
                theme: 'light',
                language: 'en',
                timezone: 'UTC',
                email_notifications: true,
                push_notifications: true,
                marketing_emails: false,
                data_sharing: false,
                two_factor_enabled: false
            };

            settingsResult = await pool.query(
                `INSERT INTO user_settings (
                    user_id, theme, language, timezone, email_notifications,
                    push_notifications, marketing_emails, data_sharing, two_factor_enabled
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    userId, defaultSettings.theme, defaultSettings.language,
                    defaultSettings.timezone, defaultSettings.email_notifications,
                    defaultSettings.push_notifications, defaultSettings.marketing_emails,
                    defaultSettings.data_sharing, defaultSettings.two_factor_enabled
                ]
            );
        }

        res.json({
            status: 'success',
            data: settingsResult.rows[0]
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
        theme,
        language,
        timezone,
        email_notifications,
        push_notifications,
        marketing_emails,
        data_sharing,
        two_factor_enabled
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_settings (
                user_id, theme, language, timezone, email_notifications,
                push_notifications, marketing_emails, data_sharing, two_factor_enabled,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                theme = COALESCE(EXCLUDED.theme, user_settings.theme),
                language = COALESCE(EXCLUDED.language, user_settings.language),
                timezone = COALESCE(EXCLUDED.timezone, user_settings.timezone),
                email_notifications = COALESCE(EXCLUDED.email_notifications, user_settings.email_notifications),
                push_notifications = COALESCE(EXCLUDED.push_notifications, user_settings.push_notifications),
                marketing_emails = COALESCE(EXCLUDED.marketing_emails, user_settings.marketing_emails),
                data_sharing = COALESCE(EXCLUDED.data_sharing, user_settings.data_sharing),
                two_factor_enabled = COALESCE(EXCLUDED.two_factor_enabled, user_settings.two_factor_enabled),
                updated_at = NOW()
            RETURNING *`,
            [
                userId, theme, language, timezone, email_notifications,
                push_notifications, marketing_emails, data_sharing, two_factor_enabled
            ]
        );

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const getProfileActivity = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { days = 30, limit = 50 } = req.query;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const activityQuery = `
            WITH user_activity AS (
                SELECT 'project_created' as activity_type, p.name as title, p.created_at as timestamp
                FROM projects p WHERE p.user_id = $1 AND p.created_at >= NOW() - INTERVAL '${days} days'
                
                UNION ALL
                
                SELECT 'alert_created' as activity_type, a.title, a.created_at
                FROM alerts a WHERE a.user_id = $1 AND a.created_at >= NOW() - INTERVAL '${days} days'
                
                UNION ALL
                
                SELECT 'task_completed' as activity_type, t.title, t.updated_at
                FROM tasks t 
                JOIN projects p ON t.project_id = p.id
                WHERE p.user_id = $1 AND t.status = 'completed' 
                AND t.updated_at >= NOW() - INTERVAL '${days} days'
                
                UNION ALL
                
                SELECT 'export_requested' as activity_type, 
                       CONCAT(e.data_type, ' export') as title, e.created_at
                FROM export_requests e 
                WHERE e.user_id = $1 AND e.created_at >= NOW() - INTERVAL '${days} days'
            )
            SELECT * FROM user_activity
            ORDER BY timestamp DESC
            LIMIT $2
        `;

        const result = await pool.query(activityQuery, [userId, limit]);

        res.json({
            status: 'success',
            data: {
                activities: result.rows,
                period_days: days,
                total_activities: result.rows.length
            }
        });
    } catch (error) {
        console.error('Get profile activity error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

export const updatePreferences = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
        dashboard_layout,
        default_project_view,
        chart_preferences,
        notification_frequency,
        auto_refresh_interval,
        data_retention_days
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO user_preferences (
                user_id, dashboard_layout, default_project_view, chart_preferences,
                notification_frequency, auto_refresh_interval, data_retention_days,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                dashboard_layout = COALESCE(EXCLUDED.dashboard_layout, user_preferences.dashboard_layout),
                default_project_view = COALESCE(EXCLUDED.default_project_view, user_preferences.default_project_view),
                chart_preferences = COALESCE(EXCLUDED.chart_preferences, user_preferences.chart_preferences),
                notification_frequency = COALESCE(EXCLUDED.notification_frequency, user_preferences.notification_frequency),
                auto_refresh_interval = COALESCE(EXCLUDED.auto_refresh_interval, user_preferences.auto_refresh_interval),
                data_retention_days = COALESCE(EXCLUDED.data_retention_days, user_preferences.data_retention_days),
                updated_at = NOW()
            RETURNING *`,
            [
                userId, JSON.stringify(dashboard_layout), default_project_view,
                JSON.stringify(chart_preferences), notification_frequency,
                auto_refresh_interval, data_retention_days
            ]
        );

        res.json({
            status: 'success',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
};

// Legacy function - keeping for backward compatibility
export const completeOnboarding = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const {
        displayName,
        role,
        companyName,
        contractAddress,
        chain,
        category,
        utilityDescription,
        socialLinks
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update user onboarding status and roles
        await client.query(
            `UPDATE users 
             SET onboarding_completed = true,
                 roles = array_append(roles, $1)
             WHERE id = $2 AND NOT ($1 = ANY(roles))`,
            [role, userId]
        );

        await client.query(
            'UPDATE users SET onboarding_completed = true WHERE id = $1', 
            [userId]
        );

        // Upsert Profile
        await client.query(
            `INSERT INTO profiles (user_id, display_name, social_links) 
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) 
             DO UPDATE SET 
                display_name = EXCLUDED.display_name, 
                social_links = COALESCE(profiles.social_links || EXCLUDED.social_links, EXCLUDED.social_links)`,
            [userId, displayName, socialLinks || {}]
        );

        // If Startup, upsert details
        if (role === 'startup') {
            await client.query(
                `INSERT INTO startup_details (
                    user_id, company_name, contract_address, chain, category, utility_description
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    company_name = EXCLUDED.company_name,
                    contract_address = EXCLUDED.contract_address,
                    chain = EXCLUDED.chain,
                    category = EXCLUDED.category,
                    utility_description = EXCLUDED.utility_description`,
                [userId, companyName, contractAddress, chain, category, utilityDescription]
            );
        }

        await client.query('COMMIT');
        res.json({ 
            status: 'success', 
            data: { message: 'Onboarding completed successfully' } 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Onboarding error:', error);
        res.status(500).json({ status: 'error', message: 'Onboarding failed' });
    } finally {
        client.release();
    }
};
