import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export const getProfile = async (req: Request, res: Response) => {
    const userId = req.user.id;
    try {
        const userResult = await pool.query(
            'SELECT email, phone_number, roles, onboarding_completed FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = userResult.rows[0];

        const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
        const profile = profileResult.rows[0] || {};

        let startupDetails = null;
        if (user.roles && user.roles.includes('startup')) {
            const sdResult = await pool.query('SELECT * FROM startup_details WHERE user_id = $1', [userId]);
            startupDetails = sdResult.rows[0];
        }

        res.json({
            user,
            profile,
            startupDetails
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const completeOnboarding = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const {
        displayName,
        role, // 'startup', 'investor', etc.
        companyName,
        contractAddress,
        chain,
        category,
        utilityDescription,
        socialLinks
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update user onboarding status and roles if needed
        // Add role if not already present
        await client.query(
            `UPDATE users 
       SET onboarding_completed = true,
           roles = array_append(roles, $1)
       WHERE id = $2 AND NOT ($1 = ANY(roles))`,
            [role, userId]
        );
        // If role was already there, update onboarding_completed ensuring it is set
        await client.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);

        // Upsert Profile
        await client.query(
            `INSERT INTO profiles (user_id, display_name, social_links) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET display_name = EXCLUDED.display_name, social_links = COALESCE(profiles.social_links || EXCLUDED.social_links, EXCLUDED.social_links)`,
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
        res.json({ success: true, message: 'Onboarding completed' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Onboarding error:', error);
        res.status(500).json({ message: 'Onboarding failed' });
    } finally {
        client.release();
    }
};
