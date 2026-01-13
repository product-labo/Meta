/**
 * Comprehensive Trending and Ranking Service (Fixed for actual DB schema)
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

        // Weighted combination
        const baseScore = (
            customerScore * 0.3 +
            transactionScore * 0.25 +
            revenueScore * 0.25 +
            qualityScore * 0.2
        );

        return Math.round(Math.min(100, baseScore));
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
        const qualityScore = project.success_rate || 0;
        const riskScore = 100 - (project.risk_score || 50); // Invert risk (lower risk = higher score)

        return (
            growthScore * weights.growth +
            volumeScore * weights.volume +
            customerScore * weights.customers +
            qualityScore * weights.quality +
            riskScore * weights.risk
        );
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
            const timeConditions = {
                '7d': "AND td.block_timestamp >= NOW() - INTERVAL '7 days'",
                '30d': "AND td.block_timestamp >= NOW() - INTERVAL '30 days'",
                '90d': "AND td.block_timestamp >= NOW() - INTERVAL '90 days'"
            };

            let query = `
                SELECT 
                    bci.contract_address,
                    bci.contract_name as business_name,
                    bci.category,
                    bci.chain_id::text as chain,
                    bci.is_verified,
                    
                    -- Calculate metrics from transaction data
                    COUNT(DISTINCT td.from_address) as total_customers,
                    COUNT(*) as total_transactions,
                    COALESCE(AVG(td.transaction_value), 0) as total_revenue_eth,
                    (COUNT(CASE WHEN td.status = 'success' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate,
                    
                    -- Calculate retention rate (simplified)
                    CASE 
                        WHEN COUNT(DISTINCT td.from_address) > 0 THEN
                            (COUNT(DISTINCT CASE WHEN td.block_timestamp >= NOW() - INTERVAL '7 days' THEN td.from_address END) * 100.0 / 
                             NULLIF(COUNT(DISTINCT td.from_address), 0))
                        ELSE 0
                    END as customer_retention_rate_percent,
                    
                    -- Calculate risk score
                    CASE 
                        WHEN bci.is_verified = true AND COUNT(*) >= 100 THEN 20
                        WHEN bci.is_verified = true THEN 35
                        ELSE 65
                    END as risk_score
                    
                FROM bi_contract_index bci
                LEFT JOIN mc_transaction_details td ON bci.contract_address = td.contract_address 
                    AND bci.chain_id::text = td.chain_id::text
                WHERE 1=1
            `;

            const params = [];
            let paramCount = 0;

            // Add time period filter
            if (timePeriod) {
                query += ` ${timeConditions[timePeriod] || timeConditions['30d']}`;
            }

            if (category) {
                paramCount++;
                query += ` AND bci.category = $${paramCount}`;
                params.push(category);
            }

            if (chainId) {
                paramCount++;
                query += ` AND bci.chain_id::text = $${paramCount}`;
                params.push(chainId);
            }

            // Group by required fields
            query += ` 
                GROUP BY bci.contract_address, bci.contract_name, bci.category, 
                         bci.chain_id, bci.is_verified
                HAVING COUNT(*) > 0
            `;

            // Add ordering
            const validSortFields = ['total_customers', 'total_transactions', 'total_revenue_eth', 'success_rate'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'total_customers';
            
            query += ` ORDER BY ${sortField} ${direction} LIMIT $${paramCount + 1}`;
            params.push(limit);

            const result = await this.pool.query(query, params);

            // Calculate growth scores and trend analysis for each project
            const trendingProjects = result.rows.map((project) => {
                const growthScore = this.calculateGrowthScore(project);
                const rankingScore = this.calculateRankingScore(project, growthScore);

                return {
                    ...project,
                    growth_score: growthScore,
                    trend_direction: project.success_rate > 80 ? 'rising' : project.success_rate < 50 ? 'declining' : 'stable',
                    trend_strength: Math.min(100, project.total_customers + project.success_rate),
                    risk_level: this.categorizeRisk(project.risk_score),
                    ranking_score: rankingScore
                };
            });

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
     * Get failing/declining projects
     */
    async getFailingProjects(options = {}) {
        const {
            limit = 10,
            timePeriod = '30d',
            riskThreshold = 70
        } = options;

        try {
            const timeConditions = {
                '7d': "AND td.block_timestamp >= NOW() - INTERVAL '7 days'",
                '30d': "AND td.block_timestamp >= NOW() - INTERVAL '30 days'",
                '90d': "AND td.block_timestamp >= NOW() - INTERVAL '90 days'"
            };

            const query = `
                SELECT 
                    bci.contract_address,
                    bci.contract_name as business_name,
                    bci.category,
                    bci.chain_id::text as chain,
                    bci.is_verified,
                    
                    COUNT(DISTINCT td.from_address) as total_customers,
                    COUNT(*) as total_transactions,
                    COALESCE(AVG(td.transaction_value), 0) as total_revenue_eth,
                    (COUNT(CASE WHEN td.status = 'success' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate,
                    
                    CASE 
                        WHEN COUNT(DISTINCT td.from_address) > 0 THEN
                            (COUNT(DISTINCT CASE WHEN td.block_timestamp >= NOW() - INTERVAL '7 days' THEN td.from_address END) * 100.0 / 
                             NULLIF(COUNT(DISTINCT td.from_address), 0))
                        ELSE 0
                    END as customer_retention_rate_percent,
                    
                    CASE 
                        WHEN bci.is_verified = true AND COUNT(*) >= 100 THEN 20
                        WHEN bci.is_verified = true THEN 35
                        ELSE 65
                    END as risk_score
                    
                FROM bi_contract_index bci
                LEFT JOIN mc_transaction_details td ON bci.contract_address = td.contract_address 
                    AND bci.chain_id::text = td.chain_id::text
                    ${timeConditions[timePeriod] || timeConditions['30d']}
                GROUP BY bci.contract_address, bci.contract_name, bci.category, 
                         bci.chain_id, bci.is_verified
                HAVING (COUNT(CASE WHEN td.status = 'success' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) < 50
                    OR COUNT(DISTINCT td.from_address) < 10
                ORDER BY risk_score DESC, success_rate ASC
                LIMIT $1
            `;

            const result = await this.pool.query(query, [limit]);

            const failingProjects = result.rows.map((project) => {
                return {
                    ...project,
                    trend_direction: 'declining',
                    trend_strength: Math.max(0, 100 - project.success_rate),
                    risk_level: this.categorizeRisk(project.risk_score),
                    decline_indicators: this.identifyDeclineIndicators(project)
                };
            });

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
     * Analyze trends for a specific project
     */
    async analyzeTrends(contractAddress, timePeriod = '30d') {
        try {
            const trending = await this.getTrendingProjects({
                limit: 1,
                timePeriod
            });

            const project = trending.trending_projects.find(p => p.contract_address === contractAddress);
            
            if (!project) {
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

            return {
                contract_address: contractAddress,
                business_name: project.business_name,
                trend_period: timePeriod,
                trend_direction: project.trend_direction,
                growth_score: project.growth_score,
                trend_strength: project.trend_strength,
                metrics_change: {},
                risk_level: project.risk_level,
                current_metrics: {
                    total_customers: project.total_customers,
                    total_transactions: project.total_transactions,
                    total_revenue_eth: project.total_revenue_eth,
                    success_rate: project.success_rate
                }
            };

        } catch (error) {
            console.error('Error analyzing trends:', error);
            throw error;
        }
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