/**
 * MetaGauge Metrics Service
 * Main service to manage metrics pipeline and provide metrics data access
 * Requirements: 1.5, 3.2 - Real-time data synchronization, comprehensive business metrics
 */

import { MetricsDataPipeline } from './metrics-pipeline.js';
import { MetricsCalculator } from './metrics-calculator.js';
import { pool } from '../config/database.js';

class MetricsService {
    constructor() {
        this.pipeline = null;
        this.calculator = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the metrics service
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️  Metrics service already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing MetaGauge Metrics Service...');

            // Initialize database configuration
            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                user: process.env.DB_USER || 'david_user',
                password: process.env.DB_PASS || 'Davidsoyaya@1015',
                database: process.env.DB_NAME || 'david',
            };

            // Initialize metrics calculator
            this.calculator = new MetricsCalculator(dbConfig);

            // Initialize metrics pipeline
            this.pipeline = new MetricsDataPipeline(dbConfig);

            // Start the pipeline
            await this.pipeline.startPipeline();

            this.isInitialized = true;
            console.log('✅ MetaGauge Metrics Service initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Metrics Service:', error);
            throw error;
        }
    }

    /**
     * Get real-time metrics for a project
     * @param {string} contractAddress - Contract address
     * @param {bigint} chainId - Chain ID
     * @returns {Object} Project metrics
     */
    async getProjectMetrics(contractAddress, chainId) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            // First try to get from real-time metrics table
            const client = await pool.connect();
            
            try {
                const query = `
                    SELECT * FROM project_metrics_realtime 
                    WHERE contract_address = $1 AND chain_id = $2
                `;
                
                const result = await client.query(query, [contractAddress, chainId]);
                
                if (result.rows.length > 0) {
                    return result.rows[0];
                }

                // If not found, calculate fresh metrics
                console.log(`📊 Calculating fresh metrics for ${contractAddress}`);
                const metrics = await this.calculator.calculateProjectMetrics(contractAddress, chainId);
                
                // Store in real-time table for future use
                await this.pipeline.upsertProjectMetricsRealtime(metrics);
                
                return metrics;

            } finally {
                client.release();
            }

        } catch (error) {
            console.error(`❌ Error getting project metrics for ${contractAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get wallet metrics
     * @param {string} walletAddress - Wallet address
     * @param {bigint} chainId - Chain ID
     * @returns {Object} Wallet metrics
     */
    async getWalletMetrics(walletAddress, chainId) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            // First try to get from real-time metrics table
            const client = await pool.connect();
            
            try {
                const query = `
                    SELECT * FROM wallet_metrics_realtime 
                    WHERE wallet_address = $1 AND chain_id = $2
                `;
                
                const result = await client.query(query, [walletAddress, chainId]);
                
                if (result.rows.length > 0) {
                    return result.rows[0];
                }

                // If not found, calculate fresh metrics
                console.log(`📊 Calculating fresh wallet metrics for ${walletAddress}`);
                const metrics = await this.calculator.calculateWalletMetrics(walletAddress, chainId);
                
                return metrics;

            } finally {
                client.release();
            }

        } catch (error) {
            console.error(`❌ Error getting wallet metrics for ${walletAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get category metrics
     * @param {string} categoryName - Category name
     * @param {bigint} chainId - Chain ID
     * @returns {Object} Category metrics
     */
    async getCategoryMetrics(categoryName, chainId) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            const client = await pool.connect();
            
            try {
                const query = `
                    SELECT * FROM category_metrics_realtime 
                    WHERE category_name = $1 AND chain_id = $2
                `;
                
                const result = await client.query(query, [categoryName, chainId]);
                
                if (result.rows.length > 0) {
                    return result.rows[0];
                }

                // If not found, calculate fresh metrics
                console.log(`📊 Calculating fresh category metrics for ${categoryName}`);
                const metrics = await this.calculator.calculateCategoryMetrics(categoryName, chainId);
                
                return metrics;

            } finally {
                client.release();
            }

        } catch (error) {
            console.error(`❌ Error getting category metrics for ${categoryName}:`, error);
            throw error;
        }
    }

    /**
     * Get chain metrics
     * @param {bigint} chainId - Chain ID
     * @returns {Object} Chain metrics
     */
    async getChainMetrics(chainId) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            const client = await pool.connect();
            
            try {
                const query = `
                    SELECT * FROM chain_metrics_daily 
                    WHERE chain_id = $1 
                    ORDER BY date DESC 
                    LIMIT 1
                `;
                
                const result = await client.query(query, [chainId]);
                
                if (result.rows.length > 0) {
                    return result.rows[0];
                }

                // If not found, calculate fresh metrics
                console.log(`📊 Calculating fresh chain metrics for ${chainId}`);
                const metrics = await this.calculator.calculateChainMetrics(chainId);
                
                return metrics;

            } finally {
                client.release();
            }

        } catch (error) {
            console.error(`❌ Error getting chain metrics for ${chainId}:`, error);
            throw error;
        }
    }

    /**
     * Get historical metrics for a project
     * @param {string} contractAddress - Contract address
     * @param {bigint} chainId - Chain ID
     * @param {number} days - Number of days to retrieve
     * @returns {Array} Historical metrics
     */
    async getProjectHistoricalMetrics(contractAddress, chainId, days = 30) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            const client = await pool.connect();
            
            try {
                const query = `
                    SELECT * FROM project_metrics_daily 
                    WHERE contract_address = $1 AND chain_id = $2 
                    AND date >= CURRENT_DATE - INTERVAL '${days} days'
                    ORDER BY date DESC
                `;
                
                const result = await client.query(query, [contractAddress, chainId]);
                return result.rows;

            } finally {
                client.release();
            }

        } catch (error) {
            console.error(`❌ Error getting historical metrics for ${contractAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get top projects by metric
     * @param {string} metric - Metric to sort by (growth_score, health_score, total_customers, etc.)
     * @param {number} limit - Number of projects to return
     * @param {bigint} chainId - Optional chain filter
     * @returns {Array} Top projects
     */
    async getTopProjects(metric = 'growth_score', limit = 50, chainId = null) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            const client = await pool.connect();
            
            try {
                let query = `
                    SELECT pmr.*, bci.contract_name, bci.category
                    FROM project_metrics_realtime pmr
                    LEFT JOIN bi_contract_index bci ON pmr.contract_address = bci.contract_address
                `;
                
                const params = [];
                let paramIndex = 1;

                if (chainId) {
                    query += ` WHERE pmr.chain_id = $${paramIndex}`;
                    params.push(chainId);
                    paramIndex++;
                }

                query += ` ORDER BY pmr.${metric} DESC NULLS LAST LIMIT $${paramIndex}`;
                params.push(limit);

                const result = await client.query(query, params);
                return result.rows;

            } finally {
                client.release();
            }

        } catch (error) {
            console.error(`❌ Error getting top projects by ${metric}:`, error);
            throw error;
        }
    }

    /**
     * Get trending projects (based on growth metrics)
     * @param {number} limit - Number of projects to return
     * @param {bigint} chainId - Optional chain filter
     * @returns {Array} Trending projects
     */
    async getTrendingProjects(limit = 20, chainId = null) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            const client = await pool.connect();
            
            try {
                let query = `
                    SELECT pmr.*, bci.contract_name, bci.category,
                           (pmr.customer_growth_rate + pmr.transaction_growth_rate + pmr.volume_growth_rate) / 3 as combined_growth_rate
                    FROM project_metrics_realtime pmr
                    LEFT JOIN bi_contract_index bci ON pmr.contract_address = bci.contract_address
                `;
                
                const params = [];
                let paramIndex = 1;

                if (chainId) {
                    query += ` WHERE pmr.chain_id = $${paramIndex}`;
                    params.push(chainId);
                    paramIndex++;
                }

                query += ` ORDER BY combined_growth_rate DESC NULLS LAST LIMIT $${paramIndex}`;
                params.push(limit);

                const result = await client.query(query, params);
                return result.rows;

            } finally {
                client.release();
            }

        } catch (error) {
            console.error(`❌ Error getting trending projects:`, error);
            throw error;
        }
    }

    /**
     * Trigger manual metrics update for a project
     * @param {string} contractAddress - Contract address
     * @param {bigint} chainId - Chain ID
     * @returns {Object} Update result
     */
    async triggerManualUpdate(contractAddress, chainId) {
        if (!this.isInitialized) {
            throw new Error('Metrics service not initialized');
        }

        try {
            console.log(`🔄 Manual metrics update triggered for ${contractAddress}`);
            
            const metrics = await this.pipeline.updateProjectMetricsRealtime(contractAddress, chainId);
            
            console.log(`✅ Manual update completed for ${contractAddress}`);
            return { 
                success: true, 
                message: 'Metrics updated successfully',
                metrics: metrics
            };

        } catch (error) {
            console.error(`❌ Manual update failed for ${contractAddress}:`, error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    /**
     * Get pipeline status and statistics
     * @returns {Object} Pipeline status
     */
    async getPipelineStatus() {
        if (!this.isInitialized) {
            return { initialized: false };
        }

        try {
            const status = this.pipeline.getPipelineStatus();
            
            // Add statistics
            const client = await pool.connect();
            
            try {
                const statsQuery = `
                    SELECT 
                        COUNT(*) as total_projects,
                        COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '1 hour' THEN 1 END) as updated_last_hour,
                        COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '1 day' THEN 1 END) as updated_last_day,
                        AVG(growth_score) as avg_growth_score,
                        AVG(health_score) as avg_health_score
                    FROM project_metrics_realtime
                `;
                
                const statsResult = await client.query(statsQuery);
                status.statistics = statsResult.rows[0];

                return {
                    initialized: true,
                    ...status
                };

            } finally {
                client.release();
            }

        } catch (error) {
            console.error('❌ Error getting pipeline status:', error);
            return { 
                initialized: true, 
                error: error.message 
            };
        }
    }

    /**
     * Shutdown the metrics service
     */
    async shutdown() {
        if (!this.isInitialized) {
            return;
        }

        try {
            console.log('🛑 Shutting down MetaGauge Metrics Service...');

            if (this.pipeline) {
                await this.pipeline.stopPipeline();
            }

            if (this.calculator) {
                await this.calculator.close();
            }

            this.isInitialized = false;
            console.log('✅ MetaGauge Metrics Service shutdown completed');

        } catch (error) {
            console.error('❌ Error during metrics service shutdown:', error);
        }
    }
}

// Create singleton instance
const metricsService = new MetricsService();

export { metricsService, MetricsService };
export default metricsService;