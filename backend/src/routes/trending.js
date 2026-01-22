/**
 * Trending and Ranking API Routes
 * 
 * Provides endpoints for comprehensive trending analysis and multi-dimensional ranking
 */

import express from 'express';
import { TrendingService } from '../services/trending-service.js';

const router = express.Router();

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASSWORD || 'Davidsoyaya@1015',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'david'
};

/**
 * GET /api/trending/projects
 * Get trending projects with multi-dimensional ranking
 */
router.get('/projects', async (req, res) => {
    const trendingService = new TrendingService(dbConfig);
    
    try {
        const options = {
            limit: parseInt(req.query.limit) || 20,
            timePeriod: req.query.timePeriod || '30d',
            category: req.query.category || null,
            chainId: req.query.chainId || null,
            sortBy: req.query.sortBy || 'growth_score',
            direction: req.query.direction || 'DESC'
        };

        const result = await trendingService.getTrendingProjects(options);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting trending projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trending projects',
            message: error.message
        });
    } finally {
        await trendingService.close();
    }
});

/**
 * GET /api/trending/failing
 * Get failing/declining projects with risk indicators
 */
router.get('/failing', async (req, res) => {
    const trendingService = new TrendingService(dbConfig);
    
    try {
        const options = {
            limit: parseInt(req.query.limit) || 10,
            timePeriod: req.query.timePeriod || '30d',
            riskThreshold: parseInt(req.query.riskThreshold) || 70
        };

        const result = await trendingService.getFailingProjects(options);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting failing projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get failing projects',
            message: error.message
        });
    } finally {
        await trendingService.close();
    }
});

/**
 * GET /api/trending/analysis/:contractAddress
 * Get detailed trend analysis for a specific project
 */
router.get('/analysis/:contractAddress', async (req, res) => {
    const trendingService = new TrendingService(dbConfig);
    
    try {
        const { contractAddress } = req.params;
        const timePeriod = req.query.timePeriod || '30d';

        const result = await trendingService.analyzeTrends(contractAddress, timePeriod);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error analyzing trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze trends',
            message: error.message
        });
    } finally {
        await trendingService.close();
    }
});

/**
 * GET /api/trending/categories/:category
 * Get category-specific rankings
 */
router.get('/categories/:category', async (req, res) => {
    const trendingService = new TrendingService(dbConfig);
    
    try {
        const { category } = req.params;
        const options = {
            limit: parseInt(req.query.limit) || 10,
            timePeriod: req.query.timePeriod || '30d',
            sortBy: req.query.sortBy || 'growth_score',
            direction: req.query.direction || 'DESC'
        };

        const result = await trendingService.getCategoryRankings(category, options);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting category rankings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get category rankings',
            message: error.message
        });
    } finally {
        await trendingService.close();
    }
});

/**
 * GET /api/trending/chains/:chainId
 * Get chain-specific rankings
 */
router.get('/chains/:chainId', async (req, res) => {
    const trendingService = new TrendingService(dbConfig);
    
    try {
        const { chainId } = req.params;
        const options = {
            limit: parseInt(req.query.limit) || 10,
            timePeriod: req.query.timePeriod || '30d',
            sortBy: req.query.sortBy || 'growth_score',
            direction: req.query.direction || 'DESC'
        };

        const result = await trendingService.getChainRankings(chainId, options);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting chain rankings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chain rankings',
            message: error.message
        });
    } finally {
        await trendingService.close();
    }
});

/**
 * GET /api/trending/summary
 * Get trending summary with top performers and key metrics
 */
router.get('/summary', async (req, res) => {
    const trendingService = new TrendingService(dbConfig);
    
    try {
        const timePeriod = req.query.timePeriod || '30d';

        // Get top trending projects
        const trending = await trendingService.getTrendingProjects({ 
            limit: 5, 
            timePeriod 
        });

        // Get failing projects
        const failing = await trendingService.getFailingProjects({ 
            limit: 3, 
            timePeriod 
        });

        // Get category leaders (top project from each major category)
        const categories = ['DeFi', 'NFT', 'DAO', 'Gaming'];
        const categoryLeaders = await Promise.all(
            categories.map(async (category) => {
                const result = await trendingService.getCategoryRankings(category, { 
                    limit: 1, 
                    timePeriod 
                });
                return {
                    category,
                    leader: result.trending_projects[0] || null
                };
            })
        );

        const summary = {
            top_trending: trending.trending_projects,
            failing_projects: failing.failing_projects,
            category_leaders: categoryLeaders,
            time_period: timePeriod,
            total_projects_analyzed: trending.metadata.total_count + failing.metadata.total_count
        };
        
        res.json({
            success: true,
            data: summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting trending summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trending summary',
            message: error.message
        });
    } finally {
        await trendingService.close();
    }
});

export default router;