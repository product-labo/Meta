import { Request, Response } from 'express';
import { aiInsightsService } from '../services/aiInsightsService.js';
import { sendSuccess, sendError, sendUnauthorized, sendServerError, sendValidationError } from '../utils/apiResponse.js';

/**
 * POST /api/v1/ai/analyze
 * Get AI insights for user's data
 */
export const analyzeUserData = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, objective, model } = req.body;

        // Validate objective if provided
        if (objective && typeof objective !== 'string') {
            return sendValidationError(res, 'Objective must be a string');
        }

        const insights = await aiInsightsService.getUserInsights({
            userId,
            projectId,
            objective,
            model
        });

        sendSuccess(res, insights);
    } catch (error) {
        console.error('Analyze User Data Error:', error);
        if (error.message.includes('Unauthorized')) {
            return sendUnauthorized(res, 'You do not own this project');
        }
        sendServerError(res);
    }
};

/**
 * POST /api/v1/ai/projects/:projectId/analyze
 * Get AI insights for specific project
 */
export const analyzeProject = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.params;
        const { objective, model } = req.body;

        const insights = await aiInsightsService.getUserInsights({
            userId,
            projectId,
            objective,
            model
        });

        sendSuccess(res, insights);
    } catch (error) {
        console.error('Analyze Project Error:', error);
        if (error.message.includes('Unauthorized')) {
            return sendUnauthorized(res, 'You do not own this project');
        }
        sendServerError(res);
    }
};

/**
 * GET /api/v1/ai/insights
 * Get user's AI insights history
 */
export const getInsights = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, limit } = req.query;

        const history = await aiInsightsService.getUserInsightsHistory(
            userId,
            projectId as string,
            parseInt(limit as string) || 10
        );

        sendSuccess(res, history);
    } catch (error) {
        console.error('Get Insights Error:', error);
        sendServerError(res);
    }
};

/**
 * GET /api/v1/ai/quick-insights
 * Get quick dashboard insights
 */
export const getQuickInsights = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const insights = await aiInsightsService.getUserInsights({
            userId,
            objective: 'Provide a concise dashboard summary with: 1) Key performance metrics, 2) Recent trends, 3) Top 3 actionable recommendations'
        });

        sendSuccess(res, insights);
    } catch (error) {
        console.error('Get Quick Insights Error:', error);
        sendServerError(res);
    }
};
