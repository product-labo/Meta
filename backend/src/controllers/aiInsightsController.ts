import { Request, Response } from 'express';
import { aiInsightsService } from '../services/aiInsightsService.js';

/**
 * Get AI insights for user's contract data
 */
export const getUserAIInsights = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, objective, model } = req.body;

        const insights = await aiInsightsService.getUserInsights({
            userId,
            projectId,
            objective,
            model
        });

        res.json({
            status: 'success',
            data: insights
        });
    } catch (error) {
        console.error('Get User AI Insights Error:', error);
        
        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get AI insights for specific project
 */
export const getProjectAIInsights = async (req: Request, res: Response) => {
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

        res.json({
            status: 'success',
            data: insights
        });
    } catch (error) {
        console.error('Get Project AI Insights Error:', error);
        
        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get user's AI insights history
 */
export const getInsightsHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const { projectId, limit = 10 } = req.query;

        const history = await aiInsightsService.getUserInsightsHistory(
            userId,
            projectId as string,
            parseInt(limit as string)
        );

        res.json({
            status: 'success',
            data: history
        });
    } catch (error) {
        console.error('Get Insights History Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get quick insights for dashboard
 */
export const getQuickInsights = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        // Get insights with predefined objective for dashboard
        const insights = await aiInsightsService.getUserInsights({
            userId,
            objective: 'Provide a quick dashboard summary focusing on: 1) Key performance metrics, 2) Recent activity trends, 3) Top 3 actionable recommendations for growth'
        });

        res.json({
            status: 'success',
            data: insights
        });
    } catch (error) {
        console.error('Get Quick Insights Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
