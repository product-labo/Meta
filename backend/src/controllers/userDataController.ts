import { Request, Response } from 'express';
import { dataCollectionService } from '../services/dataCollectionService.js';
import { secureDataSyncService } from '../services/secureDataSyncService.js';

/**
 * Get user's transactions across all projects or specific project
 */
export const getUserTransactions = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, limit = 50, offset = 0 } = req.query;

        const transactions = await dataCollectionService.getUserTransactions(
            userId,
            projectId as string,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            status: 'success',
            data: transactions,
            pagination: {
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                count: transactions.length
            }
        });
    } catch (error) {
        console.error('Get User Transactions Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get user's contract events
 */
export const getUserEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, eventName, limit = 50, offset = 0 } = req.query;

        const events = await dataCollectionService.getUserEvents(
            userId,
            projectId as string,
            eventName as string,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            status: 'success',
            data: events,
            pagination: {
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
                count: events.length
            }
        });
    } catch (error) {
        console.error('Get User Events Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get analytics for user's project
 */
export const getProjectAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.params;

        const analytics = await dataCollectionService.getProjectAnalytics(userId, projectId);

        res.json({
            status: 'success',
            data: analytics
        });
    } catch (error) {
        console.error('Get Project Analytics Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Manually trigger secure data sync for user's project
 */
export const syncProjectData = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.params;

        // Use secure sync service with ownership verification
        await secureDataSyncService.triggerUserSync(userId, projectId);

        res.json({
            status: 'success',
            message: 'Secure data sync completed'
        });
    } catch (error) {
        console.error('Sync Project Data Error:', error);
        
        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get user's sync status and history
 */
export const getSyncStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        
        const syncHistory = await secureDataSyncService.getUserSyncStatus(userId);
        
        res.json({
            status: 'success',
            data: syncHistory
        });
    } catch (error) {
        console.error('Get Sync Status Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get user's dashboard summary
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        // Get all user projects with analytics
        const projects = await dataCollectionService.getUserTransactions(userId, undefined, 0, 0);
        const events = await dataCollectionService.getUserEvents(userId, undefined, undefined, 0, 0);

        // Group by project
        const projectSummary = projects.reduce((acc: any, tx: any) => {
            if (!acc[tx.project_id]) {
                acc[tx.project_id] = {
                    projectId: tx.project_id,
                    transactionCount: 0,
                    eventCount: 0,
                    chain: tx.chain
                };
            }
            acc[tx.project_id].transactionCount++;
            return acc;
        }, {});

        events.forEach((event: any) => {
            if (projectSummary[event.project_id]) {
                projectSummary[event.project_id].eventCount++;
            }
        });

        res.json({
            status: 'success',
            data: {
                totalProjects: Object.keys(projectSummary).length,
                totalTransactions: projects.length,
                totalEvents: events.length,
                projects: Object.values(projectSummary)
            }
        });
    } catch (error) {
        console.error('Get Dashboard Summary Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
