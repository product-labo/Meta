import { Request, Response } from 'express';
import { pool } from '../config/database.js';

// =============================================================================
// C3: ADVANCED INSIGHTS (6 endpoints)
// Advanced analytics and AI-powered insights
// =============================================================================

export const getRetentionPatterns = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { timeframe = '30d', cohort_type = 'weekly' } = req.query;

    try {
        // Get project details
        const projectResult = await pool.query(
            'SELECT contract_address FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Project not found' 
            });
        }

        const contractAddress = projectResult.rows[0].contract_address;

        // Advanced retention pattern analysis
        const retentionQuery = `
            WITH user_cohorts AS (
                SELECT 
                    from_address,
                    DATE_TRUNC('${cohort_type}', MIN(block_timestamp)) as cohort_period,
                    MIN(block_timestamp) as first_transaction,
                    COUNT(*) as total_transactions
                FROM mc_transaction_details 
                WHERE contract_address = $1 
                AND block_timestamp >= NOW() - INTERVAL '${timeframe}'
                GROUP BY from_address
            ),
            retention_analysis AS (
                SELECT 
                    uc.cohort_period,
                    COUNT(DISTINCT uc.from_address) as cohort_size,
                    COUNT(DISTINCT CASE 
                        WHEN t.block_timestamp >= uc.first_transaction + INTERVAL '1 week' 
                        AND t.block_timestamp < uc.first_transaction + INTERVAL '2 weeks'
                        THEN uc.from_address 
                    END) as week_1_retained,
                    COUNT(DISTINCT CASE 
                        WHEN t.block_timestamp >= uc.first_transaction + INTERVAL '2 weeks' 
                        AND t.block_timestamp < uc.first_transaction + INTERVAL '3 weeks'
                        THEN uc.from_address 
                    END) as week_2_retained,
                    COUNT(DISTINCT CASE 
                        WHEN t.block_timestamp >= uc.first_transaction + INTERVAL '4 weeks' 
                        THEN uc.from_address 
                    END) as week_4_retained,
                    AVG(uc.total_transactions) as avg_transactions_per_user
                FROM user_cohorts uc
                LEFT JOIN mc_transaction_details t ON uc.from_address = t.from_address 
                    AND t.contract_address = $1
                GROUP BY uc.cohort_period
                ORDER BY uc.cohort_period DESC
            ),
            pattern_insights AS (
                SELECT 
                    cohort_period,
                    cohort_size,
                    week_1_retained,
                    week_2_retained,
                    week_4_retained,
                    CASE WHEN cohort_size > 0 THEN ROUND((week_1_retained::DECIMAL / cohort_size * 100), 2) ELSE 0 END as week_1_retention_rate,
                    CASE WHEN cohort_size > 0 THEN ROUND((week_2_retained::DECIMAL / cohort_size * 100), 2) ELSE 0 END as week_2_retention_rate,
                    CASE WHEN cohort_size > 0 THEN ROUND((week_4_retained::DECIMAL / cohort_size * 100), 2) ELSE 0 END as week_4_retention_rate,
                    avg_transactions_per_user,
                    CASE 
                        WHEN week_1_retained::DECIMAL / NULLIF(cohort_size, 0) > 0.4 THEN 'high'
                        WHEN week_1_retained::DECIMAL / NULLIF(cohort_size, 0) > 0.2 THEN 'medium'
                        ELSE 'low'
                    END as retention_quality
                FROM retention_analysis
            )
            SELECT * FROM pattern_insights
        `;

        const result = await pool.query(retentionQuery, [contractAddress]);

        // Calculate retention trends and patterns
        const patterns = result.rows;
        const avgRetention = patterns.length > 0 
            ? patterns.reduce((sum, p) => sum + parseFloat(p.week_1_retention_rate), 0) / patterns.length 
            : 0;

        // Identify retention patterns
        const insights = [];
        
        if (avgRetention > 40) {
            insights.push({
                type: 'positive',
                title: 'Strong Retention Performance',
                description: `Your average week-1 retention rate of ${avgRetention.toFixed(1)}% is above industry average`,
                recommendation: 'Focus on converting retained users into power users'
            });
        } else if (avgRetention < 20) {
            insights.push({
                type: 'warning',
                title: 'Low Retention Detected',
                description: `Week-1 retention of ${avgRetention.toFixed(1)}% needs improvement`,
                recommendation: 'Analyze user onboarding flow and first-time user experience'
            });
        }

        // Detect retention trends
        if (patterns.length >= 3) {
            const recentTrend = patterns.slice(0, 3);
            const isImproving = recentTrend[0].week_1_retention_rate > recentTrend[2].week_1_retention_rate;
            
            insights.push({
                type: isImproving ? 'positive' : 'neutral',
                title: isImproving ? 'Improving Retention Trend' : 'Stable Retention Pattern',
                description: `Retention has been ${isImproving ? 'improving' : 'stable'} over recent cohorts`,
                recommendation: isImproving 
                    ? 'Continue current strategies and scale successful initiatives'
                    : 'Experiment with new retention strategies'
            });
        }

        res.json({
            status: 'success',
            data: {
                retention_patterns: patterns,
                summary: {
                    avg_retention_rate: Math.round(avgRetention * 100) / 100,
                    total_cohorts: patterns.length,
                    timeframe: timeframe,
                    cohort_type: cohort_type
                },
                insights: insights,
                recommendations: [
                    'Implement personalized onboarding based on user behavior',
                    'Create engagement campaigns for at-risk user segments',
                    'Analyze successful cohorts to identify retention drivers'
                ]
            }
        });

    } catch (error) {
        console.error('Get retention patterns error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to analyze retention patterns' 
        });
    }
};

export const getOnboardingAnalysis = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { days = 30 } = req.query;

    try {
        const projectResult = await pool.query(
            'SELECT contract_address FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Project not found' 
            });
        }

        const contractAddress = projectResult.rows[0].contract_address;

        // Onboarding funnel analysis
        const onboardingQuery = `
            WITH user_journey AS (
                SELECT 
                    from_address,
                    MIN(block_timestamp) as first_interaction,
                    COUNT(*) as total_transactions,
                    COUNT(DISTINCT DATE(block_timestamp)) as active_days,
                    AVG(CAST(gas_used AS NUMERIC)) as avg_gas_usage,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_transactions,
                    MAX(block_timestamp) as last_interaction
                FROM mc_transaction_details 
                WHERE contract_address = $1 
                AND block_timestamp >= NOW() - INTERVAL '${days} days'
                GROUP BY from_address
            ),
            onboarding_segments AS (
                SELECT 
                    from_address,
                    first_interaction,
                    total_transactions,
                    active_days,
                    successful_transactions,
                    CASE 
                        WHEN total_transactions = 1 THEN 'one_time_user'
                        WHEN total_transactions BETWEEN 2 AND 5 THEN 'exploring_user'
                        WHEN total_transactions BETWEEN 6 AND 20 THEN 'engaged_user'
                        ELSE 'power_user'
                    END as user_segment,
                    CASE 
                        WHEN active_days = 1 THEN 'single_day'
                        WHEN active_days BETWEEN 2 AND 7 THEN 'weekly_active'
                        WHEN active_days BETWEEN 8 AND 30 THEN 'monthly_active'
                        ELSE 'highly_active'
                    END as engagement_level,
                    EXTRACT(EPOCH FROM (last_interaction - first_interaction)) / 3600 as lifecycle_hours
                FROM user_journey
            ),
            funnel_analysis AS (
                SELECT 
                    user_segment,
                    engagement_level,
                    COUNT(*) as user_count,
                    AVG(total_transactions) as avg_transactions,
                    AVG(active_days) as avg_active_days,
                    AVG(lifecycle_hours) as avg_lifecycle_hours,
                    AVG(successful_transactions::DECIMAL / NULLIF(total_transactions, 0) * 100) as success_rate
                FROM onboarding_segments
                GROUP BY user_segment, engagement_level
            )
            SELECT * FROM funnel_analysis
            ORDER BY 
                CASE user_segment 
                    WHEN 'one_time_user' THEN 1
                    WHEN 'exploring_user' THEN 2
                    WHEN 'engaged_user' THEN 3
                    WHEN 'power_user' THEN 4
                END,
                CASE engagement_level
                    WHEN 'single_day' THEN 1
                    WHEN 'weekly_active' THEN 2
                    WHEN 'monthly_active' THEN 3
                    WHEN 'highly_active' THEN 4
                END
        `;

        const result = await pool.query(onboardingQuery, [contractAddress]);

        // Calculate conversion rates
        const segments = result.rows;
        const totalUsers = segments.reduce((sum, s) => sum + parseInt(s.user_count), 0);
        
        const conversionFunnel = [
            {
                stage: 'First Interaction',
                users: totalUsers,
                conversion_rate: 100
            },
            {
                stage: 'Exploring (2-5 transactions)',
                users: segments.filter(s => s.user_segment !== 'one_time_user')
                    .reduce((sum, s) => sum + parseInt(s.user_count), 0),
                conversion_rate: 0
            },
            {
                stage: 'Engaged (6-20 transactions)',
                users: segments.filter(s => ['engaged_user', 'power_user'].includes(s.user_segment))
                    .reduce((sum, s) => sum + parseInt(s.user_count), 0),
                conversion_rate: 0
            },
            {
                stage: 'Power User (20+ transactions)',
                users: segments.filter(s => s.user_segment === 'power_user')
                    .reduce((sum, s) => sum + parseInt(s.user_count), 0),
                conversion_rate: 0
            }
        ];

        // Calculate conversion rates
        conversionFunnel.forEach((stage, index) => {
            if (index > 0) {
                stage.conversion_rate = totalUsers > 0 
                    ? Math.round((stage.users / totalUsers) * 100 * 100) / 100 
                    : 0;
            }
        });

        // Generate insights
        const insights = [];
        const dropoffRate = conversionFunnel[0].users - conversionFunnel[1].users;
        const dropoffPercentage = totalUsers > 0 ? (dropoffRate / totalUsers) * 100 : 0;

        if (dropoffPercentage > 70) {
            insights.push({
                type: 'critical',
                title: 'High Initial Dropoff',
                description: `${dropoffPercentage.toFixed(1)}% of users don't return after first interaction`,
                recommendation: 'Improve first-time user experience and onboarding flow'
            });
        }

        const powerUserRate = conversionFunnel[3].conversion_rate;
        if (powerUserRate > 10) {
            insights.push({
                type: 'positive',
                title: 'Strong Power User Conversion',
                description: `${powerUserRate}% of users become power users`,
                recommendation: 'Analyze power user behavior to replicate success factors'
            });
        }

        res.json({
            status: 'success',
            data: {
                conversion_funnel: conversionFunnel,
                user_segments: segments,
                summary: {
                    total_users: totalUsers,
                    power_user_rate: powerUserRate,
                    avg_transactions_per_user: segments.length > 0 
                        ? segments.reduce((sum, s) => sum + parseFloat(s.avg_transactions) * parseInt(s.user_count), 0) / totalUsers
                        : 0
                },
                insights: insights,
                recommendations: [
                    'Implement progressive onboarding with clear milestones',
                    'Create targeted campaigns for each user segment',
                    'Optimize the first 3 interactions for maximum engagement'
                ]
            }
        });

    } catch (error) {
        console.error('Get onboarding analysis error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to analyze onboarding patterns' 
        });
    }
};

export const getFeatureSynergy = async (req: Request, res: Response) => {
    const { projectId } = req.params;

    try {
        const projectResult = await pool.query(
            'SELECT contract_address FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Project not found' 
            });
        }

        const contractAddress = projectResult.rows[0].contract_address;

        // Feature synergy analysis based on transaction patterns
        const synergyQuery = `
            WITH feature_usage AS (
                SELECT 
                    from_address,
                    CASE 
                        WHEN function_name LIKE '%swap%' OR function_name LIKE '%exchange%' THEN 'swap'
                        WHEN function_name LIKE '%transfer%' OR function_name LIKE '%send%' THEN 'transfer'
                        WHEN function_name LIKE '%stake%' OR function_name LIKE '%deposit%' THEN 'staking'
                        WHEN function_name LIKE '%bridge%' OR function_name LIKE '%cross%' THEN 'bridge'
                        WHEN function_name LIKE '%mint%' OR function_name LIKE '%create%' THEN 'mint'
                        ELSE 'other'
                    END as feature_type,
                    COUNT(*) as usage_count,
                    AVG(CAST(gas_used AS NUMERIC)) as avg_gas,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_uses
                FROM mc_transaction_details 
                WHERE contract_address = $1 
                AND block_timestamp >= NOW() - INTERVAL '30 days'
                AND function_name IS NOT NULL
                GROUP BY from_address, feature_type
            ),
            user_feature_combinations AS (
                SELECT 
                    from_address,
                    array_agg(DISTINCT feature_type ORDER BY feature_type) as feature_combo,
                    COUNT(DISTINCT feature_type) as feature_diversity,
                    SUM(usage_count) as total_usage,
                    AVG(successful_uses::DECIMAL / NULLIF(usage_count, 0) * 100) as avg_success_rate
                FROM feature_usage
                GROUP BY from_address
            ),
            synergy_analysis AS (
                SELECT 
                    feature_combo,
                    feature_diversity,
                    COUNT(*) as user_count,
                    AVG(total_usage) as avg_total_usage,
                    AVG(avg_success_rate) as avg_success_rate,
                    CASE 
                        WHEN feature_diversity = 1 THEN 'single_feature'
                        WHEN feature_diversity = 2 THEN 'dual_feature'
                        WHEN feature_diversity >= 3 THEN 'multi_feature'
                    END as usage_pattern
                FROM user_feature_combinations
                GROUP BY feature_combo, feature_diversity
                ORDER BY user_count DESC
            )
            SELECT * FROM synergy_analysis
        `;

        const result = await pool.query(synergyQuery, [contractAddress]);

        // Analyze feature combinations
        const combinations = result.rows;
        const totalUsers = combinations.reduce((sum, c) => sum + parseInt(c.user_count), 0);

        // Find most successful combinations
        const topCombinations = combinations
            .filter(c => parseInt(c.user_count) >= 5) // Minimum user threshold
            .sort((a, b) => parseFloat(b.avg_total_usage) - parseFloat(a.avg_total_usage))
            .slice(0, 10);

        // Calculate synergy scores
        const synergyScores = topCombinations.map(combo => {
            const diversityBonus = parseInt(combo.feature_diversity) * 10;
            const usageScore = parseFloat(combo.avg_total_usage) * 2;
            const successScore = parseFloat(combo.avg_success_rate) || 0;
            const popularityScore = (parseInt(combo.user_count) / totalUsers) * 100;
            
            return {
                ...combo,
                synergy_score: Math.round((diversityBonus + usageScore + successScore + popularityScore) / 4),
                features: combo.feature_combo,
                user_percentage: Math.round((parseInt(combo.user_count) / totalUsers) * 100 * 100) / 100
            };
        });

        // Generate insights
        const insights = [];
        const multiFeatureUsers = combinations
            .filter(c => c.usage_pattern === 'multi_feature')
            .reduce((sum, c) => sum + parseInt(c.user_count), 0);

        const multiFeaturePercentage = totalUsers > 0 ? (multiFeatureUsers / totalUsers) * 100 : 0;

        if (multiFeaturePercentage > 30) {
            insights.push({
                type: 'positive',
                title: 'Strong Feature Synergy',
                description: `${multiFeaturePercentage.toFixed(1)}% of users utilize multiple features`,
                recommendation: 'Create feature bundles and cross-feature promotions'
            });
        }

        const topCombo = synergyScores[0];
        if (topCombo) {
            insights.push({
                type: 'insight',
                title: 'Most Successful Feature Combination',
                description: `Users combining ${topCombo.features.join(' + ')} show highest engagement`,
                recommendation: 'Promote this feature combination in onboarding'
            });
        }

        res.json({
            status: 'success',
            data: {
                feature_combinations: synergyScores,
                usage_patterns: {
                    single_feature_users: combinations.filter(c => c.usage_pattern === 'single_feature')
                        .reduce((sum, c) => sum + parseInt(c.user_count), 0),
                    dual_feature_users: combinations.filter(c => c.usage_pattern === 'dual_feature')
                        .reduce((sum, c) => sum + parseInt(c.user_count), 0),
                    multi_feature_users: multiFeatureUsers
                },
                insights: insights,
                recommendations: [
                    'Design feature discovery flows to increase diversity',
                    'Create incentives for users to try complementary features',
                    'Analyze successful combinations for product development'
                ]
            }
        });

    } catch (error) {
        console.error('Get feature synergy error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to analyze feature synergy' 
        });
    }
};

export const getRecommendations = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { project_id, category } = req.query;

    if (!userId) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        // Get user's projects and their performance
        let projectsQuery = `
            SELECT 
                p.id,
                p.name,
                p.contract_address,
                p.category,
                pm.total_users,
                pm.retention_rate,
                pm.adoption_rate,
                pm.churn_rate,
                COUNT(t.hash) as transaction_count
            FROM projects p
            LEFT JOIN project_metrics_realtime pm ON p.id = pm.project_id
            LEFT JOIN mc_transaction_details t ON p.contract_address = t.contract_address
            WHERE p.user_id = $1
        `;

        const params = [userId];
        let paramCount = 2;

        if (project_id) {
            projectsQuery += ` AND p.id = ${paramCount}`;
            params.push(project_id);
            paramCount++;
        }

        if (category) {
            projectsQuery += ` AND p.category = ${paramCount}`;
            params.push(category);
            paramCount++;
        }

        projectsQuery += ` GROUP BY p.id, p.name, p.contract_address, p.category, pm.total_users, pm.retention_rate, pm.adoption_rate, pm.churn_rate`;

        const projectsResult = await pool.query(projectsQuery, params);
        const projects = projectsResult.rows;

        // Generate AI-powered recommendations
        const recommendations = [];

        for (const project of projects) {
            const projectRecommendations = [];

            // Retention recommendations
            if (project.retention_rate < 0.3) {
                projectRecommendations.push({
                    type: 'retention',
                    priority: 'high',
                    title: 'Improve User Retention',
                    description: `${project.name} has a retention rate of ${(project.retention_rate * 100).toFixed(1)}%`,
                    actions: [
                        'Implement user onboarding improvements',
                        'Create engagement campaigns for inactive users',
                        'Analyze successful user journeys'
                    ],
                    expected_impact: 'Could increase retention by 15-25%',
                    effort_level: 'medium'
                });
            }

            // Growth recommendations
            if (project.total_users < 1000) {
                projectRecommendations.push({
                    type: 'growth',
                    priority: 'medium',
                    title: 'Scale User Acquisition',
                    description: `${project.name} has ${project.total_users} users with growth potential`,
                    actions: [
                        'Launch referral program',
                        'Optimize marketing channels',
                        'Create viral features'
                    ],
                    expected_impact: 'Could double user base in 3 months',
                    effort_level: 'high'
                });
            }

            // Churn recommendations
            if (project.churn_rate > 0.4) {
                projectRecommendations.push({
                    type: 'churn_reduction',
                    priority: 'high',
                    title: 'Reduce User Churn',
                    description: `High churn rate of ${(project.churn_rate * 100).toFixed(1)}% detected`,
                    actions: [
                        'Implement exit surveys',
                        'Create win-back campaigns',
                        'Improve core product experience'
                    ],
                    expected_impact: 'Could reduce churn by 20-30%',
                    effort_level: 'medium'
                });
            }

            // Transaction volume recommendations
            if (project.transaction_count < 100) {
                projectRecommendations.push({
                    type: 'engagement',
                    priority: 'medium',
                    title: 'Increase Transaction Volume',
                    description: `Low transaction activity detected (${project.transaction_count} transactions)`,
                    actions: [
                        'Gamify user interactions',
                        'Create transaction incentives',
                        'Simplify user flows'
                    ],
                    expected_impact: 'Could increase activity by 50%',
                    effort_level: 'low'
                });
            }

            recommendations.push({
                project_id: project.id,
                project_name: project.name,
                recommendations: projectRecommendations
            });
        }

        // Global recommendations based on portfolio
        const globalRecommendations = [];

        if (projects.length === 1) {
            globalRecommendations.push({
                type: 'portfolio',
                priority: 'low',
                title: 'Diversify Your Portfolio',
                description: 'Consider launching projects in different categories',
                actions: [
                    'Research market opportunities',
                    'Validate new product ideas',
                    'Leverage existing user base'
                ],
                expected_impact: 'Reduced risk and increased opportunities',
                effort_level: 'high'
            });
        }

        const avgRetention = projects.reduce((sum, p) => sum + (p.retention_rate || 0), 0) / projects.length;
        if (avgRetention > 0.6) {
            globalRecommendations.push({
                type: 'optimization',
                priority: 'medium',
                title: 'Monetization Optimization',
                description: 'Strong retention indicates monetization potential',
                actions: [
                    'Implement premium features',
                    'Create subscription tiers',
                    'Optimize pricing strategy'
                ],
                expected_impact: 'Could increase revenue by 40-60%',
                effort_level: 'medium'
            });
        }

        res.json({
            status: 'success',
            data: {
                project_recommendations: recommendations,
                global_recommendations: globalRecommendations,
                summary: {
                    total_projects: projects.length,
                    avg_retention_rate: Math.round(avgRetention * 100) / 100,
                    total_recommendations: recommendations.reduce((sum, p) => sum + p.recommendations.length, 0) + globalRecommendations.length
                }
            }
        });

    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to generate recommendations' 
        });
    }
};

export const getBenchmarks = async (req: Request, res: Response) => {
    const { category, metric = 'retention_rate' } = req.query;

    try {
        // Industry benchmarks analysis
        const benchmarkQuery = `
            WITH project_metrics AS (
                SELECT 
                    p.category,
                    pm.retention_rate,
                    pm.adoption_rate,
                    pm.churn_rate,
                    pm.total_users,
                    COUNT(t.hash) as transaction_count
                FROM projects p
                LEFT JOIN project_metrics_realtime pm ON p.id = pm.project_id
                LEFT JOIN mc_transaction_details t ON p.contract_address = t.contract_address
                WHERE p.status = 'active'
                AND pm.retention_rate IS NOT NULL
                GROUP BY p.id, p.category, pm.retention_rate, pm.adoption_rate, pm.churn_rate, pm.total_users
            ),
            category_benchmarks AS (
                SELECT 
                    category,
                    COUNT(*) as project_count,
                    AVG(retention_rate) as avg_retention_rate,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY retention_rate) as median_retention_rate,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY retention_rate) as p75_retention_rate,
                    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY retention_rate) as p90_retention_rate,
                    AVG(adoption_rate) as avg_adoption_rate,
                    AVG(churn_rate) as avg_churn_rate,
                    AVG(total_users) as avg_total_users,
                    AVG(transaction_count) as avg_transaction_count
                FROM project_metrics
                GROUP BY category
            )
            SELECT * FROM category_benchmarks
            ORDER BY project_count DESC
        `;

        const result = await pool.query(benchmarkQuery);
        const benchmarks = result.rows;

        // Filter by category if specified
        const filteredBenchmarks = category 
            ? benchmarks.filter(b => b.category === category)
            : benchmarks;

        // Calculate industry-wide benchmarks
        const industryBenchmarks = {
            retention_rate: {
                average: benchmarks.reduce((sum, b) => sum + parseFloat(b.avg_retention_rate || 0), 0) / benchmarks.length,
                median: benchmarks.reduce((sum, b) => sum + parseFloat(b.median_retention_rate || 0), 0) / benchmarks.length,
                top_quartile: benchmarks.reduce((sum, b) => sum + parseFloat(b.p75_retention_rate || 0), 0) / benchmarks.length,
                top_decile: benchmarks.reduce((sum, b) => sum + parseFloat(b.p90_retention_rate || 0), 0) / benchmarks.length
            },
            adoption_rate: {
                average: benchmarks.reduce((sum, b) => sum + parseFloat(b.avg_adoption_rate || 0), 0) / benchmarks.length
            },
            churn_rate: {
                average: benchmarks.reduce((sum, b) => sum + parseFloat(b.avg_churn_rate || 0), 0) / benchmarks.length
            },
            user_base: {
                average: benchmarks.reduce((sum, b) => sum + parseFloat(b.avg_total_users || 0), 0) / benchmarks.length
            }
        };

        // Performance tiers
        const performanceTiers = {
            retention_rate: {
                excellent: industryBenchmarks.retention_rate.top_decile,
                good: industryBenchmarks.retention_rate.top_quartile,
                average: industryBenchmarks.retention_rate.median,
                poor: industryBenchmarks.retention_rate.average * 0.7
            },
            churn_rate: {
                excellent: industryBenchmarks.churn_rate.average * 0.5,
                good: industryBenchmarks.churn_rate.average * 0.7,
                average: industryBenchmarks.churn_rate.average,
                poor: industryBenchmarks.churn_rate.average * 1.5
            }
        };

        res.json({
            status: 'success',
            data: {
                category_benchmarks: filteredBenchmarks,
                industry_benchmarks: industryBenchmarks,
                performance_tiers: performanceTiers,
                insights: [
                    {
                        title: 'Industry Standards',
                        description: `Average retention rate across all categories is ${(industryBenchmarks.retention_rate.average * 100).toFixed(1)}%`
                    },
                    {
                        title: 'Top Performers',
                        description: `Top 10% of projects achieve ${(industryBenchmarks.retention_rate.top_decile * 100).toFixed(1)}% retention rate`
                    },
                    {
                        title: 'Category Leaders',
                        description: `${benchmarks[0]?.category || 'DeFi'} category shows strongest performance metrics`
                    }
                ]
            }
        });

    } catch (error) {
        console.error('Get benchmarks error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to retrieve benchmarks' 
        });
    }
};

export const getPredictions = async (req: Request, res: Response) => {
    const { project_id, timeframe = '30d' } = req.query;

    try {
        // Get project data for predictions
        const projectQuery = `
            SELECT 
                p.id,
                p.name,
                p.contract_address,
                pm.retention_rate,
                pm.total_users,
                pm.churn_rate,
                COUNT(t.hash) as recent_transactions
            FROM projects p
            LEFT JOIN project_metrics_realtime pm ON p.id = pm.project_id
            LEFT JOIN mc_transaction_details t ON p.contract_address = t.contract_address 
                AND t.block_timestamp >= NOW() - INTERVAL '7 days'
            WHERE p.id = $1
            GROUP BY p.id, p.name, p.contract_address, pm.retention_rate, pm.total_users, pm.churn_rate
        `;

        const projectResult = await pool.query(projectQuery, [project_id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Project not found' 
            });
        }

        const project = projectResult.rows[0];

        // Historical trend analysis for predictions
        const trendQuery = `
            WITH daily_metrics AS (
                SELECT 
                    DATE(block_timestamp) as date,
                    COUNT(DISTINCT from_address) as daily_active_users,
                    COUNT(*) as daily_transactions,
                    AVG(CAST(gas_used AS NUMERIC)) as avg_gas_used
                FROM mc_transaction_details 
                WHERE contract_address = $1 
                AND block_timestamp >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(block_timestamp)
                ORDER BY date
            )
            SELECT 
                date,
                daily_active_users,
                daily_transactions,
                avg_gas_used,
                LAG(daily_active_users, 1) OVER (ORDER BY date) as prev_day_users,
                LAG(daily_transactions, 1) OVER (ORDER BY date) as prev_day_transactions
            FROM daily_metrics
        `;

        const trendResult = await pool.query(trendQuery, [project.contract_address]);
        const trends = trendResult.rows;

        // Simple prediction algorithms
        const predictions = {};

        // User growth prediction
        const recentUserGrowth = trends.slice(-7); // Last 7 days
        const avgDailyUsers = recentUserGrowth.reduce((sum, day) => sum + parseInt(day.daily_active_users), 0) / recentUserGrowth.length;
        const growthRate = recentUserGrowth.length > 1 
            ? (recentUserGrowth[recentUserGrowth.length - 1].daily_active_users - recentUserGrowth[0].daily_active_users) / recentUserGrowth[0].daily_active_users
            : 0;

        predictions.user_growth = {
            current_daily_average: Math.round(avgDailyUsers),
            predicted_30d_growth: Math.round(growthRate * 30 * 100), // Percentage
            predicted_user_count: Math.round(project.total_users * (1 + growthRate * 4)), // 4 weeks projection
            confidence: growthRate !== 0 ? 'medium' : 'low'
        };

        // Transaction volume prediction
        const avgDailyTransactions = trends.reduce((sum, day) => sum + parseInt(day.daily_transactions), 0) / trends.length;
        const transactionTrend = trends.slice(-7).reduce((sum, day) => sum + parseInt(day.daily_transactions), 0) / 7;
        
        predictions.transaction_volume = {
            current_daily_average: Math.round(avgDailyTransactions),
            predicted_weekly_volume: Math.round(transactionTrend * 7),
            trend_direction: transactionTrend > avgDailyTransactions ? 'increasing' : 'decreasing',
            confidence: 'medium'
        };

        // Retention prediction based on current metrics
        const currentRetention = project.retention_rate || 0;
        const retentionTrend = currentRetention > 0.5 ? 'stable' : currentRetention > 0.3 ? 'declining' : 'critical';
        
        predictions.retention = {
            current_rate: Math.round(currentRetention * 100),
            predicted_30d_rate: Math.round(Math.max(0, currentRetention + (growthRate * 0.1)) * 100),
            trend: retentionTrend,
            risk_level: currentRetention < 0.2 ? 'high' : currentRetention < 0.4 ? 'medium' : 'low'
        };

        // Churn prediction
        const currentChurn = project.churn_rate || 0;
        predictions.churn = {
            current_rate: Math.round(currentChurn * 100),
            predicted_30d_rate: Math.round(Math.min(1, currentChurn + (growthRate < 0 ? 0.05 : -0.02)) * 100),
            risk_factors: [
                currentChurn > 0.4 ? 'High current churn rate' : null,
                growthRate < -0.1 ? 'Declining user growth' : null,
                project.recent_transactions < 50 ? 'Low recent activity' : null
            ].filter(Boolean)
        };

        // Market opportunity prediction
        predictions.market_opportunity = {
            growth_potential: growthRate > 0.1 ? 'high' : growthRate > 0 ? 'medium' : 'low',
            recommended_actions: [
                growthRate < 0 ? 'Focus on retention improvements' : 'Scale marketing efforts',
                currentChurn > 0.3 ? 'Implement churn reduction strategies' : 'Optimize for growth',
                project.recent_transactions < 100 ? 'Increase user engagement' : 'Maintain current momentum'
            ],
            timeline: timeframe
        };

        res.json({
            status: 'success',
            data: {
                project: {
                    id: project.id,
                    name: project.name
                },
                predictions: predictions,
                model_info: {
                    algorithm: 'trend_analysis',
                    data_points: trends.length,
                    prediction_timeframe: timeframe,
                    last_updated: new Date().toISOString()
                },
                disclaimers: [
                    'Predictions are based on historical trends and may not account for external factors',
                    'Results should be used as guidance alongside other business intelligence',
                    'Model accuracy improves with more historical data'
                ]
            }
        });

    } catch (error) {
        console.error('Get predictions error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to generate predictions' 
        });
    }
};