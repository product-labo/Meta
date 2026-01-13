/**
 * MetaGauge Metrics Integration
 * Integrates the metrics pipeline with the main application
 * Requirements: 1.5, 3.2 - Real-time data synchronization, comprehensive business metrics
 */

import metricsService from './metrics-service.js';

/**
 * Initialize metrics service on application startup
 */
export async function initializeMetrics() {
    try {
        console.log('🚀 Initializing MetaGauge Metrics System...');
        
        // Initialize the metrics service
        await metricsService.initialize();
        
        console.log('✅ MetaGauge Metrics System initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize MetaGauge Metrics System:', error);
        
        // Don't crash the application if metrics fail to initialize
        console.warn('⚠️  Application will continue without metrics pipeline');
        return false;
    }
}

/**
 * Graceful shutdown of metrics service
 */
export async function shutdownMetrics() {
    try {
        console.log('🛑 Shutting down MetaGauge Metrics System...');
        
        await metricsService.shutdown();
        
        console.log('✅ MetaGauge Metrics System shutdown completed');
        
    } catch (error) {
        console.error('❌ Error during metrics system shutdown:', error);
    }
}

/**
 * Health check for metrics system
 */
export async function checkMetricsHealth() {
    try {
        const status = await metricsService.getPipelineStatus();
        
        return {
            healthy: status.initialized && status.realTimeJob === 'running',
            status: status,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get metrics for API endpoints
 */
export async function getMetricsForAPI(type, params) {
    try {
        switch (type) {
            case 'project':
                return await metricsService.getProjectMetrics(params.contractAddress, params.chainId);
                
            case 'wallet':
                return await metricsService.getWalletMetrics(params.walletAddress, params.chainId);
                
            case 'category':
                return await metricsService.getCategoryMetrics(params.categoryName, params.chainId);
                
            case 'chain':
                return await metricsService.getChainMetrics(params.chainId);
                
            case 'top-projects':
                return await metricsService.getTopProjects(
                    params.metric || 'growth_score',
                    params.limit || 50,
                    params.chainId || null
                );
                
            case 'trending':
                return await metricsService.getTrendingProjects(
                    params.limit || 20,
                    params.chainId || null
                );
                
            case 'historical':
                return await metricsService.getProjectHistoricalMetrics(
                    params.contractAddress,
                    params.chainId,
                    params.days || 30
                );
                
            default:
                throw new Error(`Unknown metrics type: ${type}`);
        }
        
    } catch (error) {
        console.error(`❌ Error getting ${type} metrics:`, error);
        throw error;
    }
}

/**
 * Trigger manual metrics update
 */
export async function triggerMetricsUpdate(contractAddress, chainId) {
    try {
        return await metricsService.triggerManualUpdate(contractAddress, chainId);
        
    } catch (error) {
        console.error(`❌ Error triggering metrics update for ${contractAddress}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Middleware to add metrics data to API responses
 */
export function metricsMiddleware(req, res, next) {
    // Add metrics helper functions to request object
    req.metrics = {
        getProject: async (contractAddress, chainId) => {
            return await getMetricsForAPI('project', { contractAddress, chainId });
        },
        
        getWallet: async (walletAddress, chainId) => {
            return await getMetricsForAPI('wallet', { walletAddress, chainId });
        },
        
        getTopProjects: async (metric, limit, chainId) => {
            return await getMetricsForAPI('top-projects', { metric, limit, chainId });
        },
        
        getTrending: async (limit, chainId) => {
            return await getMetricsForAPI('trending', { limit, chainId });
        },
        
        triggerUpdate: async (contractAddress, chainId) => {
            return await triggerMetricsUpdate(contractAddress, chainId);
        }
    };
    
    next();
}

/**
 * Express route handlers for metrics endpoints
 */
export const metricsRoutes = {
    
    // GET /api/metrics/project/:address
    getProjectMetrics: async (req, res) => {
        try {
            const { address } = req.params;
            const { chainId } = req.query;
            
            if (!address) {
                return res.status(400).json({
                    success: false,
                    error: 'Contract address is required'
                });
            }
            
            const metrics = await getMetricsForAPI('project', {
                contractAddress: address,
                chainId: chainId ? parseInt(chainId) : 1
            });
            
            res.json({
                success: true,
                data: metrics
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },
    
    // GET /api/metrics/wallet/:address
    getWalletMetrics: async (req, res) => {
        try {
            const { address } = req.params;
            const { chainId } = req.query;
            
            if (!address) {
                return res.status(400).json({
                    success: false,
                    error: 'Wallet address is required'
                });
            }
            
            const metrics = await getMetricsForAPI('wallet', {
                walletAddress: address,
                chainId: chainId ? parseInt(chainId) : 1
            });
            
            res.json({
                success: true,
                data: metrics
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },
    
    // GET /api/metrics/top-projects
    getTopProjects: async (req, res) => {
        try {
            const { metric = 'growth_score', limit = 50, chainId } = req.query;
            
            const projects = await getMetricsForAPI('top-projects', {
                metric,
                limit: parseInt(limit),
                chainId: chainId ? parseInt(chainId) : null
            });
            
            res.json({
                success: true,
                data: projects
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },
    
    // GET /api/metrics/trending
    getTrendingProjects: async (req, res) => {
        try {
            const { limit = 20, chainId } = req.query;
            
            const projects = await getMetricsForAPI('trending', {
                limit: parseInt(limit),
                chainId: chainId ? parseInt(chainId) : null
            });
            
            res.json({
                success: true,
                data: projects
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },
    
    // GET /api/metrics/historical/:address
    getHistoricalMetrics: async (req, res) => {
        try {
            const { address } = req.params;
            const { chainId, days = 30 } = req.query;
            
            if (!address) {
                return res.status(400).json({
                    success: false,
                    error: 'Contract address is required'
                });
            }
            
            const metrics = await getMetricsForAPI('historical', {
                contractAddress: address,
                chainId: chainId ? parseInt(chainId) : 1,
                days: parseInt(days)
            });
            
            res.json({
                success: true,
                data: metrics
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },
    
    // POST /api/metrics/update/:address
    triggerUpdate: async (req, res) => {
        try {
            const { address } = req.params;
            const { chainId } = req.body;
            
            if (!address) {
                return res.status(400).json({
                    success: false,
                    error: 'Contract address is required'
                });
            }
            
            const result = await triggerMetricsUpdate(
                address,
                chainId || 1
            );
            
            res.json(result);
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },
    
    // GET /api/metrics/status
    getStatus: async (req, res) => {
        try {
            const health = await checkMetricsHealth();
            
            res.json({
                success: true,
                data: health
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

export default {
    initializeMetrics,
    shutdownMetrics,
    checkMetricsHealth,
    getMetricsForAPI,
    triggerMetricsUpdate,
    metricsMiddleware,
    metricsRoutes
};