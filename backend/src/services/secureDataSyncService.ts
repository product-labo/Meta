import { pool } from '../config/database.js';
import { dataCollectionService } from './dataCollectionService.js';
import cron from 'node-cron';

interface UserProject {
    userId: string;
    projectId: string;
    contractAddress: string;
    chain: string;
    userEmail: string;
}

export class SecureDataSyncService {
    private isRunning: boolean = false;

    /**
     * Start daily auto-sync at 2 AM every day
     */
    startDailySync(): void {
        console.log('🔒 Starting secure daily data sync service...');
        
        // Run at 2:00 AM every day
        cron.schedule('0 2 * * *', async () => {
            await this.performDailySync();
        });

        // Also run every hour for more frequent updates
        cron.schedule('0 * * * *', async () => {
            await this.performHourlySync();
        });

        console.log('✅ Daily sync scheduled for 2:00 AM');
        console.log('✅ Hourly sync scheduled every hour');
    }

    /**
     * Perform secure daily sync for all users
     */
    private async performDailySync(): Promise<void> {
        if (this.isRunning) {
            console.log('⚠️ Sync already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('🔄 Starting daily secure data sync...');

        try {
            // Get all verified users with active projects
            const userProjects = await this.getVerifiedUserProjects();
            console.log(`📊 Found ${userProjects.length} user projects to sync`);

            let successCount = 0;
            let errorCount = 0;

            // Process each user's projects securely
            for (const userProject of userProjects) {
                try {
                    // Verify user ownership before syncing
                    const isOwner = await this.verifyUserOwnership(userProject.userId, userProject.projectId);
                    
                    if (!isOwner) {
                        console.error(`❌ Ownership verification failed for user ${userProject.userEmail}, project ${userProject.projectId}`);
                        errorCount++;
                        continue;
                    }

                    // Perform secure sync
                    await this.secureProjectSync(userProject);
                    successCount++;

                    // Log successful sync
                    await this.logSyncActivity(userProject.userId, userProject.projectId, 'success');

                } catch (error) {
                    console.error(`❌ Sync failed for user ${userProject.userEmail}, project ${userProject.projectId}:`, error.message);
                    errorCount++;

                    // Log failed sync
                    await this.logSyncActivity(userProject.userId, userProject.projectId, 'error', error.message);
                }

                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`✅ Daily sync completed: ${successCount} success, ${errorCount} errors`);

        } catch (error) {
            console.error('❌ Daily sync failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Perform hourly sync for recent activity
     */
    private async performHourlySync(): Promise<void> {
        try {
            console.log('🔄 Starting hourly sync for recent activity...');
            
            // Only sync projects with recent activity (last 24 hours)
            const recentProjects = await pool.query(`
                SELECT DISTINCT p.id, p.user_id, p.contract_address, p.chain, u.email
                FROM projects p
                JOIN users u ON p.user_id = u.id
                WHERE p.status = 'active' 
                AND p.contract_address IS NOT NULL
                AND u.is_verified = true
                AND p.updated_at > NOW() - INTERVAL '24 hours'
            `);

            for (const project of recentProjects.rows) {
                const userProject: UserProject = {
                    userId: project.user_id,
                    projectId: project.id,
                    contractAddress: project.contract_address,
                    chain: project.chain,
                    userEmail: project.email
                };

                await this.secureProjectSync(userProject);
            }

            console.log(`✅ Hourly sync completed for ${recentProjects.rows.length} recent projects`);
        } catch (error) {
            console.error('❌ Hourly sync failed:', error);
        }
    }

    /**
     * Get all verified users with active projects
     */
    private async getVerifiedUserProjects(): Promise<UserProject[]> {
        const result = await pool.query(`
            SELECT p.id as project_id, p.user_id, p.contract_address, p.chain, u.email
            FROM projects p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'active' 
            AND p.contract_address IS NOT NULL
            AND u.is_verified = true
            AND u.onboarding_completed = true
            ORDER BY u.created_at ASC
        `);

        return result.rows.map(row => ({
            userId: row.user_id,
            projectId: row.project_id,
            contractAddress: row.contract_address,
            chain: row.chain,
            userEmail: row.email
        }));
    }

    /**
     * Verify user ownership of project (security check)
     */
    private async verifyUserOwnership(userId: string, projectId: string): Promise<boolean> {
        try {
            const result = await pool.query(
                'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );
            return result.rows.length > 0;
        } catch (error) {
            console.error('Ownership verification error:', error);
            return false;
        }
    }

    /**
     * Perform secure project sync with additional validation
     */
    private async secureProjectSync(userProject: UserProject): Promise<void> {
        try {
            // Double-check user is still verified
            const userCheck = await pool.query(
                'SELECT is_verified, onboarding_completed FROM users WHERE id = $1',
                [userProject.userId]
            );

            if (userCheck.rows.length === 0 || !userCheck.rows[0].is_verified) {
                throw new Error('User not verified or not found');
            }

            // Perform the actual data sync
            await dataCollectionService.syncProjectData(userProject.userId, userProject.projectId);

            console.log(`✅ Synced data for ${userProject.userEmail} - Project ${userProject.projectId}`);

        } catch (error) {
            console.error(`❌ Secure sync failed for ${userProject.userEmail}:`, error.message);
            throw error;
        }
    }

    /**
     * Log sync activity for audit trail
     */
    private async logSyncActivity(userId: string, projectId: string, status: 'success' | 'error', errorMessage?: string): Promise<void> {
        try {
            await pool.query(`
                INSERT INTO sync_logs (user_id, project_id, status, error_message, synced_at)
                VALUES ($1, $2, $3, $4, NOW())
            `, [userId, projectId, status, errorMessage || null]);
        } catch (error) {
            console.error('Failed to log sync activity:', error);
        }
    }

    /**
     * Get sync status for a user's projects
     */
    async getUserSyncStatus(userId: string): Promise<any[]> {
        const result = await pool.query(`
            SELECT p.name, sl.status, sl.synced_at, sl.error_message
            FROM projects p
            LEFT JOIN sync_logs sl ON p.id = sl.project_id
            WHERE p.user_id = $1
            ORDER BY sl.synced_at DESC
            LIMIT 10
        `, [userId]);

        return result.rows;
    }

    /**
     * Manual sync trigger with security validation
     */
    async triggerUserSync(userId: string, projectId: string): Promise<void> {
        // Verify ownership
        const isOwner = await this.verifyUserOwnership(userId, projectId);
        if (!isOwner) {
            throw new Error('Unauthorized: User does not own this project');
        }

        // Get project details
        const projectResult = await pool.query(
            'SELECT contract_address, chain FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (projectResult.rows.length === 0) {
            throw new Error('Project not found');
        }

        const project = projectResult.rows[0];
        const userProject: UserProject = {
            userId,
            projectId,
            contractAddress: project.contract_address,
            chain: project.chain,
            userEmail: 'manual-trigger'
        };

        await this.secureProjectSync(userProject);
        await this.logSyncActivity(userId, projectId, 'success');
    }
}

export const secureDataSyncService = new SecureDataSyncService();
