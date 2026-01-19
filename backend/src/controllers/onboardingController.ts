import { Request, Response } from 'express';
import { pool } from '../config/database.js';

// =============================================================================
// C2: ONBOARDING FLOW (6 endpoints)
// Complete user onboarding process management
// =============================================================================

export const setUserRole = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { role, additional_info } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!role || !['startup', 'researcher', 'investor', 'developer'].includes(role)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Valid role is required (startup, researcher, investor, developer)' 
        });
    }

    try {
        // Update user role
        await pool.query(
            `UPDATE users 
             SET roles = array_append(roles, $1)
             WHERE id = $2 AND NOT ($1 = ANY(roles))`,
            [role, userId]
        );

        // Create or update onboarding status
        await pool.query(
            `INSERT INTO onboarding_status (
                user_id, current_step, role_selected, role_type, additional_info, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                role_selected = true,
                role_type = EXCLUDED.role_type,
                additional_info = EXCLUDED.additional_info,
                updated_at = NOW()`,
            [userId, 'role_completed', true, role, JSON.stringify(additional_info)]
        );

        res.json({
            status: 'success',
            data: {
                message: 'Role set successfully',
                role: role,
                next_step: role === 'startup' ? 'company_details' : 'wallet_connection'
            }
        });

    } catch (error) {
        console.error('Set user role error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to set user role' 
        });
    }
};

export const setCompanyDetails = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { 
        company_name, 
        company_size, 
        industry, 
        website, 
        description,
        founding_year,
        location,
        funding_stage 
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!company_name) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Company name is required' 
        });
    }

    try {
        // Create or update startup details
        await pool.query(
            `INSERT INTO startup_details (
                user_id, company_name, company_size, industry, website, 
                description, founding_year, location, funding_stage, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                company_name = EXCLUDED.company_name,
                company_size = EXCLUDED.company_size,
                industry = EXCLUDED.industry,
                website = EXCLUDED.website,
                description = EXCLUDED.description,
                founding_year = EXCLUDED.founding_year,
                location = EXCLUDED.location,
                funding_stage = EXCLUDED.funding_stage,
                updated_at = NOW()`,
            [userId, company_name, company_size, industry, website, description, founding_year, location, funding_stage]
        );

        // Update onboarding status
        await pool.query(
            `UPDATE onboarding_status 
             SET company_details_completed = true,
                 current_step = 'wallet_connection',
                 updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            status: 'success',
            data: {
                message: 'Company details saved successfully',
                next_step: 'wallet_connection'
            }
        });

    } catch (error) {
        console.error('Set company details error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to save company details' 
        });
    }
};

export const connectWallet = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { 
        wallet_address, 
        wallet_type, 
        chain, 
        is_primary = true,
        verification_signature 
    } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!wallet_address || !wallet_type || !chain) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Wallet address, type, and chain are required' 
        });
    }

    try {
        // Verify wallet ownership (in production, verify signature)
        if (verification_signature) {
            // TODO: Implement signature verification logic
            console.log('Verifying wallet signature:', verification_signature);
        }

        // Check if wallet is already connected to another user
        const existingWallet = await pool.query(
            'SELECT user_id FROM user_wallets WHERE wallet_address = $1 AND chain = $2',
            [wallet_address, chain]
        );

        if (existingWallet.rows.length > 0 && existingWallet.rows[0].user_id !== userId) {
            return res.status(409).json({ 
                status: 'error', 
                message: 'This wallet is already connected to another account' 
            });
        }

        // Connect wallet to user
        await pool.query(
            `INSERT INTO user_wallets (
                user_id, wallet_address, wallet_type, chain, is_primary, 
                is_verified, connected_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (user_id, wallet_address, chain) 
            DO UPDATE SET 
                wallet_type = EXCLUDED.wallet_type,
                is_primary = EXCLUDED.is_primary,
                is_verified = EXCLUDED.is_verified,
                updated_at = NOW()`,
            [userId, wallet_address, wallet_type, chain, is_primary, !!verification_signature]
        );

        // Update onboarding status
        await pool.query(
            `UPDATE onboarding_status 
             SET wallet_connected = true,
                 current_step = 'project_setup',
                 updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            status: 'success',
            data: {
                message: 'Wallet connected successfully',
                wallet_address: wallet_address,
                chain: chain,
                verified: !!verification_signature,
                next_step: 'project_setup'
            }
        });

    } catch (error) {
        console.error('Connect wallet error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to connect wallet' 
        });
    }
};

export const getOnboardingStatus = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Get user info
        const userResult = await pool.query(
            'SELECT roles, onboarding_completed, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'User not found' 
            });
        }

        const user = userResult.rows[0];

        // Get onboarding status
        const statusResult = await pool.query(
            'SELECT * FROM onboarding_status WHERE user_id = $1',
            [userId]
        );

        const onboardingStatus = statusResult.rows[0] || {
            current_step: 'role_selection',
            role_selected: false,
            company_details_completed: false,
            wallet_connected: false,
            project_created: false,
            onboarding_completed: false
        };

        // Get connected wallets count
        const walletsResult = await pool.query(
            'SELECT COUNT(*) as wallet_count FROM user_wallets WHERE user_id = $1',
            [userId]
        );

        // Get projects count
        const projectsResult = await pool.query(
            'SELECT COUNT(*) as project_count FROM projects WHERE user_id = $1',
            [userId]
        );

        // Calculate completion percentage
        const steps = [
            onboardingStatus.role_selected,
            onboardingStatus.company_details_completed || !user.roles.includes('startup'),
            onboardingStatus.wallet_connected,
            parseInt(projectsResult.rows[0].project_count) > 0
        ];
        
        const completedSteps = steps.filter(Boolean).length;
        const completionPercentage = Math.round((completedSteps / steps.length) * 100);

        // Determine next step
        let nextStep = 'completed';
        if (!onboardingStatus.role_selected) {
            nextStep = 'role_selection';
        } else if (user.roles.includes('startup') && !onboardingStatus.company_details_completed) {
            nextStep = 'company_details';
        } else if (!onboardingStatus.wallet_connected) {
            nextStep = 'wallet_connection';
        } else if (parseInt(projectsResult.rows[0].project_count) === 0) {
            nextStep = 'project_setup';
        }

        res.json({
            status: 'success',
            data: {
                user_id: userId,
                current_step: onboardingStatus.current_step,
                next_step: nextStep,
                completion_percentage: completionPercentage,
                onboarding_completed: user.onboarding_completed,
                steps: {
                    role_selected: onboardingStatus.role_selected,
                    role_type: onboardingStatus.role_type,
                    company_details_completed: onboardingStatus.company_details_completed,
                    wallet_connected: onboardingStatus.wallet_connected,
                    project_created: parseInt(projectsResult.rows[0].project_count) > 0
                },
                stats: {
                    connected_wallets: parseInt(walletsResult.rows[0].wallet_count),
                    created_projects: parseInt(projectsResult.rows[0].project_count),
                    account_age_days: Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
                }
            }
        });

    } catch (error) {
        console.error('Get onboarding status error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to retrieve onboarding status' 
        });
    }
};

export const completeOnboarding = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { skip_remaining = false } = req.body;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Get current onboarding status
        const statusResult = await pool.query(
            'SELECT * FROM onboarding_status WHERE user_id = $1',
            [userId]
        );

        const status = statusResult.rows[0];

        if (!skip_remaining) {
            // Validate required steps are completed
            if (!status?.role_selected) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Role selection is required to complete onboarding' 
                });
            }

            // Check if user is startup and needs company details
            const userResult = await pool.query(
                'SELECT roles FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows[0].roles.includes('startup') && !status?.company_details_completed) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Company details are required for startup accounts' 
                });
            }
        }

        // Mark onboarding as completed
        await pool.query(
            'UPDATE users SET onboarding_completed = true, updated_at = NOW() WHERE id = $1',
            [userId]
        );

        // Update onboarding status
        await pool.query(
            `UPDATE onboarding_status 
             SET onboarding_completed = true,
                 current_step = 'completed',
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            status: 'success',
            data: {
                message: 'Onboarding completed successfully',
                onboarding_completed: true,
                completed_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to complete onboarding' 
        });
    }
};

export const getOnboardingRequirements = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Get user role
        const userResult = await pool.query(
            'SELECT roles FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'User not found' 
            });
        }

        const userRoles = userResult.rows[0].roles;

        // Define requirements based on role
        const baseRequirements = [
            {
                step: 'role_selection',
                title: 'Select Your Role',
                description: 'Choose your primary role to customize your experience',
                required: true,
                estimated_time: '1 minute'
            },
            {
                step: 'wallet_connection',
                title: 'Connect Your Wallet',
                description: 'Connect your crypto wallet to track your projects',
                required: true,
                estimated_time: '2 minutes'
            }
        ];

        const startupRequirements = [
            {
                step: 'company_details',
                title: 'Company Information',
                description: 'Provide details about your startup for better analytics',
                required: true,
                estimated_time: '3 minutes'
            },
            {
                step: 'project_setup',
                title: 'Create Your First Project',
                description: 'Set up your first project to start tracking analytics',
                required: false,
                estimated_time: '5 minutes'
            }
        ];

        const researcherRequirements = [
            {
                step: 'research_interests',
                title: 'Research Interests',
                description: 'Tell us about your research focus areas',
                required: false,
                estimated_time: '2 minutes'
            }
        ];

        let requirements = [...baseRequirements];

        if (userRoles.includes('startup')) {
            requirements.splice(1, 0, ...startupRequirements);
        } else if (userRoles.includes('researcher')) {
            requirements.push(...researcherRequirements);
        }

        // Calculate total estimated time
        const totalTime = requirements.reduce((sum, req) => {
            const minutes = parseInt(req.estimated_time.split(' ')[0]);
            return sum + minutes;
        }, 0);

        res.json({
            status: 'success',
            data: {
                requirements,
                total_steps: requirements.length,
                required_steps: requirements.filter(req => req.required).length,
                estimated_total_time: `${totalTime} minutes`,
                user_roles: userRoles
            }
        });

    } catch (error) {
        console.error('Get onboarding requirements error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to retrieve onboarding requirements' 
        });
    }
};