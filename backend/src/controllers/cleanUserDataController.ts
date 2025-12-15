import { Request, Response } from 'express';
import { dataCollectionService } from '../services/dataCollectionService.js';
import { secureDataSyncService } from '../services/secureDataSyncService.js';
import { sendSuccess, sendError, sendUnauthorized, sendServerError } from '../utils/apiResponse.js';

/**
 * GET /api/v1/user/transactions
 * Get user's transactions with pagination
 */
export const getTransactions = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, limit, offset } = req.query;

        const transactions = await dataCollectionService.getUserTransactions(
            userId,
            projectId as string,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        const pagination = {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: transactions.length === parseInt(limit as string)
        };

        sendSuccess(res, transactions, pagination);
    } catch (error) {
        console.error('Get Transactions Error:', error);
        sendServerError(res);
    }
};

/**
 * GET /api/v1/user/events
 * Get user's contract events with pagination
 */
export const getEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, eventName, limit, offset } = req.query;

        const events = await dataCollectionService.getUserEvents(
            userId,
            projectId as string,
            eventName as string,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        const pagination = {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: events.length === parseInt(limit as string)
        };

        sendSuccess(res, events, pagination);
    } catch (error) {
        console.error('Get Events Error:', error);
        sendServerError(res);
    }
};

/**
 * GET /api/v1/user/projects/:projectId/analytics
 * Get analytics for specific project
 */
export const getProjectAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.params;

        const analytics = await dataCollectionService.getProjectAnalytics(userId, projectId);
        sendSuccess(res, analytics);
    } catch (error) {
        console.error('Get Project Analytics Error:', error);
        if (error.message.includes('not found')) {
            return sendError(res, 404, 'PROJECT_NOT_FOUND', 'Project not found');
        }
        sendServerError(res);
    }
};

/**
 * POST /api/v1/user/projects/:projectId/sync
 * Trigger secure data sync for project
 */
export const syncProject = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.params;

        await secureDataSyncService.triggerUserSync(userId, projectId);
        sendSuccess(res, { message: 'Sync completed successfully' });
    } catch (error) {
        console.error('Sync Project Error:', error);
        if (error.message.includes('Unauthorized')) {
            return sendUnauthorized(res, 'You do not own this project');
        }
        sendServerError(res);
    }
};

/**
 * GET /api/v1/user/dashboard
 * Get user dashboard summary
 */
export const getDashboard = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const [transactions, events, syncStatus] = await Promise.all([
            dataCollectionService.getUserTransactions(userId, undefined, 10, 0),
            dataCollectionService.getUserEvents(userId, undefined, undefined, 10, 0),
            secureDataSyncService.getUserSyncStatus(userId)
        ]);

        const dashboard = {
            recent_transactions: transactions,
            recent_events: events,
            sync_status: syncStatus[0] || null,
            summary: {
                total_transactions: transactions.length,
                total_events: events.length,
                last_sync: syncStatus[0]?.synced_at || null
            }
        };

        sendSuccess(res, dashboard);
    } catch (error) {
        console.error('Get Dashboard Error:', error);
        sendServerError(res);
    }
};

/**
 * GET /api/v1/user/sync-status
 * Get user's sync history
 */
export const getSyncStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { limit = '10' } = req.query;

        const syncHistory = await secureDataSyncService.getUserSyncStatus(userId);
        sendSuccess(res, syncHistory.slice(0, parseInt(limit as string)));
    } catch (error) {
        console.error('Get Sync Status Error:', error);
        sendServerError(res);
    }
};
