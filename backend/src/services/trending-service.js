/**
 * Comprehensive Trending and Ranking Service
 * 
 * This service provides advanced trending analysis and multi-dimensional ranking
 * for projects across all supported blockchain networks.
 */

import { Pool } from 'pg';

class TrendingService {
    constructor(dbConfig) {
        this.pool = new Pool(dbConfig);
    }

    /**
     * Calculate comprehensive growth score for a project
     * Combines multiple metrics into a single growth indicator
     */
    calculateGrowthScore(metrics, historicalData = []) {
        const {
            total_customers = 0,
            total_transactions = 0,
            total_revenue_eth = 0,
            success_rate = 0,
            customer_retention_rate_percent = 0
        } = metrics;

        // Base score components (0-100 scale)
        const customerScore = Math.min(100, (total_customers / 100) * 100); // Scale: 100 customers = 100 points
        const transactionScore = Math.min(100, (total_transactions / 1000) * 100); // Scale: 1000 txs = 100 points
        const revenueScore = Math.min(100, (total_revenue_eth / 10) * 100); // Scale: 10 ETH = 100 points
        const qualityScore = (success_rate + customer_retention_rate_percent) / 2;

        // Historical growth calculation
        let growthMultiplier = 1.0;
        if (historicalData.length >= 2) {
            const recent = historicalData[historicalData.length - 1];
            const previous = historicalData[historicalData.length - 2];
            
            const customerGrowth = previous.total_customers > 0 ? 
                (recent.total_customers - previous.total_customers) / previous.total_customers : 0;
            const transactionGrowth = previous.total_transactions > 0 ? 
                (recent.total_transactions - previous.total_transactions) / previous.total_transactions : 0;
            const revenueGrowth = previous.total_revenue_eth > 0 ? 
                (recent.total_revenue_eth - previous.total_revenue_eth) / previous.total_revenue_eth : 0;

            const avgGrowth = (customerGrowth + transactionGrowth + revenueGrowth) / 3;
            growthMultiplier = Math.max(0.5, Math.min(2.0, 1 + avgGrowth)); // Cap between 0.5x and 2.0x
        }

        // Weighted combination
        const baseScore = (
            customerScore * 0.3 +
            transactionScore * 0.25 +
            revenueScore * 0.25 +
            qualityScore * 0.2
        );

        return Math.round(Math.min(100, baseScore * growthMultiplier));
    }

    /**
     * Analyze trends over configurable time periods
     */
    async analyzeTrends(contractAddress, timePeriod = '30d') {
        const timeConditions = {
            '7d': "created_at >= NOW() - INTERVAL '7 days'",
            '30d': "created_at >= NOW() - INTERVAL '30 days'",
            '90d': "created_at >= NOW() - INTERVAL '90 days'"
        };

        const timeCondition = timeConditions[timePeriod] || timeConditions['30d'];

        try {
            // Get historical metrics (simulated with current data for now)
            const query = `
                SELECT 
                    pmr.contract_address,
                    c.contract_name as business_name,
                    pmr.total_customers,
                    pmr.total_transactions,
                    pmr.total_volume_eth as total_revenue_eth,
                    pmr.success_rate_percent as success_rate,
                    pmr.customer_retention_rate as customer_retention_rate_percent,
                    pmr.risk_score,
                    pmr.last_updated as created_at
                FROM project_metrics_realtime pmr
                LEFT JOIN contracts c ON pmr.contract_address = c.contract_address
                WHERE pmr.contract_address = $1
                ORDER BY pmr.last_updated DESC
                LIMIT 10
            `;

            const result = await this.pool.query(query, [contractAddress]);
            
            if (result.rows.length === 0) {
                return {
                    contract_address: contractAddress,
                    trend_period: timePeriod,
                    trend_direction: 'unknown',
                    growth_score: 0,
                    trend_strength: 0,
                    metrics_change: {},
                    risk_level: 'unknown'
                };
            }

            const currentMetrics = result.rows[0];
            const historicalData = result.rows;

            // Calculate growth score
            const growthScore = this.calculateGrowthScore(currentMetrics, historicalData);

            // Determine trend direction and strength
            const trendAnalysis = this.calculateTrendDirection(historicalData);

            return {
                contract_address: contractAddress,
                business_name: currentMetrics.business_name,
                trend_period: timePeriod,
                trend_direction: trendAnalysis.direction,
                growth_score: growthScore,
                trend_strength: trendAnalysis.strength,
                metrics_change: trendAnalysis.changes,
                risk_level: this.categorizeRisk(currentMetrics.risk_score),
                current_metrics: {
                    total_customers: currentMetrics.total_customers,
                    total_transactions: currentMetrics.total_transactions,
                    total_revenue_eth: currentMetrics.total_revenue_eth,
                    success_rate: currentMetrics.success_rate
                }
            };

        } catch (error) {
            console.error('Error analyzing trends:', error);
            throw error;
        }
    }

    /**
     * Calculate trend direction from historical data
     */
    calculateTrendDirection(historicalData) {
        if (historicalData.length < 2) {
            return {
                direction: 'stable',
                strength: 0,
                changes: {}
            };
        }

        const recent = historicalData[0];
        const older = historicalData[historicalData.length - 1];

        const changes = {
            customers: this.calculatePercentChange(older.total_customers, recent.total_customers),
            transactions: this.calculatePercentChange(older.total_transactions, recent.total_transactions),
            revenue: this.calculatePercentChange(older.total_revenue_eth, recent.total_revenue_eth),
            success_rate: this.calculatePercentChange(older.success_rate, recent.success_rate)
        };

        // Calculate overall trend
        const avgChange = (changes.customers + changes.transactions + changes.revenue) / 3;
        const strength = Math.abs(avgChange);

        let direction = 'stable';
        if (avgChange > 5) direction = 'rising';
        else if (avgChange < -5) direction = 'declining';

        return {
            direction,
            strength: Math.min(100, strength),
            changes
        };
    }

    /**
     * Calculate percentage change between two values
     */
    calculatePercentChange(oldValue, newValue) {
        if (oldValue === 0) return newValue > 0 ? 100 : 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }

    /**
     * Categorize risk level
     */
    categorizeRisk(riskScore) {
        if (riskScore <= 30) return 'low';
        if (riskScore <= 60) return 'medium';
        return 'high';
    }

    /**
     * Get trending projects with multi-dimensional ranking
     */
    async getTrendingProjects(options = {}) {
        const {
            limit = 20,
            timePeriod = '30d',
            category = null,
            chainId = null,
            sortBy = 'growth_score',
            direction = 'DESC'
        } = options;

        try {
            let query = `
                SELECT 
                    pmr.contract_address,
                    c.contract_name as business_name,
                    'Unknown' as category,
                    CASE 
                        WHEN pmr.chain_id = '1' THEN 'Ethereum'
                        WHEN pmr.chain_id = '1135' THEN 'Lisk'
                        WHEN pmr.chain_id = '137' THEN 'Polygon'
                        ELSE 'Unknown'
                    END as chain,
                    pmr.total_customers,
                    pmr.total_transactions,
                    pmr.total_volume_eth as total_revenue_eth,
                    pmr.success_rate_percent as success_rate,
                    pmr.customer_retention_rate as customer_retention_rate_percent,
                    pmr.risk_score,
                    c.is_verified
                FROM project_metrics_realtime pmr
                LEFT JOIN contracts c ON pmr.contract_address = c.contract_address
                WHERE 1=1
            `;

            const params = [];
            let paramCount = 0;

            if (category) {
                paramCount++;
                query += ` AND category = $${paramCount}`;
                params.push(category);
            }

            if (chainId) {
                paramCount++;
                query += ` AND chain = $${paramCount}`;
                params.push(chainId);
            }

            // Add ordering
            const validSortFields = ['total_customers', 'total_transactions', 'total_revenue_eth', 'success_rate'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'total_customers';
            
            query += ` ORDER BY ${sortField} ${direction} LIMIT $${paramCount + 1}`;
            params.push(limit);

            const result = await this.pool.query(query, params);

            // Calculate growth scores and trend analysis for each project
            const trendingProjects = await Promise.all(
                result.rows.map(async (project) => {
                    const growthScore = this.calculateGrowthScore(project);
                    const trendAnalysis = await this.analyzeTrends(project.contract_address, timePeriod);

                    return {
                        ...project,
                        growth_score: growthScore,
                        trend_direction: trendAnalysis.trend_direction,
                        trend_strength: trendAnalysis.trend_strength,
                        risk_level: this.categorizeRisk(project.risk_score),
                        ranking_score: this.calculateRankingScore(project, growthScore)
                    };
                })
            );

            // Sort by ranking score
            trendingProjects.sort((a, b) => b.ranking_score - a.ranking_score);

            return {
                trending_projects: trendingProjects,
                metadata: {
                    total_count: trendingProjects.length,
                    time_period: timePeriod,
                    category: category || 'all',
                    chain: chainId || 'all',
                    sort_by: sortBy,
                    direction: direction
                }
            };

        } catch (error) {
            console.error('Error getting trending projects:', error);
            throw error;
        }
    }

    /**
     * Calculate multi-dimensional ranking score
     */
    calculateRankingScore(project, growthScore) {
        const weights = {
            growth: 0.3,
            volume: 0.25,
            customers: 0.2,
            quality: 0.15,
            risk: 0.1
        };

        const volumeScore = Math.min(100, (project.total_transactions / 1000) * 100);
        const customerScore = Math.min(100, (project.total_customers / 100) * 100);
        const qualityScore = (project.success_rate + project.customer_retention_rate_percent) / 2;
        const riskScore = 100 - project.risk_score; // Invert risk (lower risk = higher score)

        return (
            growthScore * weights.growth +
            volumeScore * weights.volume +
            customerScore * weights.customers +
            qualityScore * weights.quality +
            riskScore * weights.risk
        );
    }

    /**
     * Get failing/declining projects
     */
    async getFailingProjects(options = {}) {
        const {
            limit = 10,
            timePeriod = '30d',
            riskThreshold = 70
        } = options;

        try {
            const query = `
                SELECT 
                    pmr.contract_address,
                    c.contract_name as business_name,
                    'Unknown' as category,
                    CASE 
                        WHEN pmr.chain_id = '1' THEN 'Ethereum'
                        WHEN pmr.chain_id = '1135' THEN 'Lisk'
                        WHEN pmr.chain_id = '137' THEN 'Polygon'
                        ELSE 'Unknown'
                    END as chain,
                    pmr.total_customers,
                    pmr.total_transactions,
                    pmr.total_volume_eth as total_revenue_eth,
                    pmr.success_rate_percent as success_rate,
                    pmr.customer_retention_rate as customer_retention_rate_percent,
                    pmr.risk_score,
                    c.is_verified
                FROM project_metrics_realtime pmr
                LEFT JOIN contracts c ON pmr.contract_address = c.contract_address
                WHERE pmr.risk_score >= $1 OR pmr.success_rate_percent < 50
                ORDER BY pmr.risk_score DESC, pmr.success_rate_percent ASC
                LIMIT $2
            `;

            const result = await this.pool.query(query, [riskThreshold, limit]);

            const failingProjects = await Promise.all(
                result.rows.map(async (project) => {
                    const trendAnalysis = await this.analyzeTrends(project.contract_address, timePeriod);
                    
                    return {
                        ...project,
                        trend_direction: trendAnalysis.trend_direction,
                        trend_strength: trendAnalysis.trend_strength,
                        risk_level: this.categorizeRisk(project.risk_score),
                        decline_indicators: this.identifyDeclineIndicators(project)
                    };
                })
            );

            return {
                failing_projects: failingProjects,
                metadata: {
                    total_count: failingProjects.length,
                    time_period: timePeriod,
                    risk_threshold: riskThreshold
                }
            };

        } catch (error) {
            console.error('Error getting failing projects:', error);
            throw error;
        }
    }

    /**
     * Identify decline indicators for a project
     */
    identifyDeclineIndicators(project) {
        const indicators = [];

        if (project.success_rate < 50) {
            indicators.push('Low success rate');
        }
        if (project.customer_retention_rate_percent < 30) {
            indicators.push('Poor customer retention');
        }
        if (project.risk_score > 80) {
            indicators.push('High risk score');
        }
        if (project.total_customers < 10) {
            indicators.push('Low customer base');
        }
        if (project.total_transactions < 100) {
            indicators.push('Low transaction volume');
        }

        return indicators;
    }

    /**
     * Get category-specific rankings
     */
    async getCategoryRankings(category, options = {}) {
        const { limit = 10, timePeriod = '30d' } = options;

        const trendingOptions = {
            ...options,
            category,
            limit,
            timePeriod
        };

        return await this.getTrendingProjects(trendingOptions);
    }

    /**
     * Get chain-specific rankings
     */
    async getChainRankings(chainId, options = {}) {
        const { limit = 10, timePeriod = '30d' } = options;

        const trendingOptions = {
            ...options,
            chainId,
            limit,
            timePeriod
        };

        return await this.getTrendingProjects(trendingOptions);
    }

    /**
     * Close database connection
     */
    async close() {
        await this.pool.end();
    }
}

export { TrendingService };