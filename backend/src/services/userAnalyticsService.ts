import { pool } from '../config/database.js';

export class UserAnalyticsService {

    /**
     * Classify user into cohorts based on behavior
     */
    async classifyUserCohort(userId: string): Promise<string> {
        try {
            // Get user transaction data
            const userStats = await pool.query(`
                SELECT 
                    COUNT(*) as tx_count,
                    SUM(CAST(value AS NUMERIC)) as total_value,
                    COUNT(DISTINCT from_address) as unique_wallets,
                    MAX(created_at) as last_activity
                FROM user_contract_transactions 
                WHERE user_id = $1
            `, [userId]);

            const stats = userStats.rows[0];
            const totalValue = parseFloat(stats.total_value || '0');
            const txCount = parseInt(stats.tx_count || '0');

            let cohortType = 'A';
            let cohortName = 'New User - No Interaction';

            // Check if wallet was used in app before
            const walletHistory = await pool.query(`
                SELECT COUNT(*) as existing_wallets
                FROM wallet_interaction_history wih
                JOIN user_contract_transactions uct ON wih.wallet_address = uct.from_address
                WHERE uct.user_id = $1 AND wih.is_new_to_app = false
            `, [userId]);

            const hasExistingWallets = parseInt(walletHistory.rows[0].existing_wallets) > 0;

            if (txCount === 0) {
                cohortType = 'A';
                cohortName = 'No Interaction';
            } else if (!hasExistingWallets && totalValue < 1000) {
                cohortType = 'B';
                cohortName = 'New Wallet - Small Spender';
            } else if (totalValue >= 10000) {
                cohortType = 'C';
                cohortName = 'Whale - High Value';
            } else {
                cohortType = 'D';
                cohortName = 'Small Spender';
            }

            // Save cohort classification
            await pool.query(`
                INSERT INTO user_cohorts (user_id, cohort_type, cohort_name, revenue_generated, transaction_count, last_activity_date)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) DO UPDATE SET
                    cohort_type = $2,
                    cohort_name = $3,
                    revenue_generated = $4,
                    transaction_count = $5,
                    last_activity_date = $6,
                    classification_date = CURRENT_DATE
            `, [userId, cohortType, cohortName, totalValue, txCount, stats.last_activity]);

            return cohortType;
        } catch (error) {
            console.error('Error classifying user cohort:', error);
            throw error;
        }
    }

    /**
     * Update daily engagement metrics
     */
    async updateDailyEngagement(date: string = new Date().toISOString().split('T')[0]): Promise<void> {
        try {
            // Calculate DAU (users active in last 24 hours)
            const dauResult = await pool.query(`
                SELECT COUNT(DISTINCT user_id) as dau
                FROM user_contract_transactions 
                WHERE DATE(created_at) = $1
            `, [date]);

            // Calculate WAU (users active in last 7 days)
            const wauResult = await pool.query(`
                SELECT COUNT(DISTINCT user_id) as wau
                FROM user_contract_transactions 
                WHERE created_at >= $1::date - INTERVAL '7 days'
                AND created_at < $1::date + INTERVAL '1 day'
            `, [date]);

            // Calculate MAU (users active in last 30 days)
            const mauResult = await pool.query(`
                SELECT COUNT(DISTINCT user_id) as mau
                FROM user_contract_transactions 
                WHERE created_at >= $1::date - INTERVAL '30 days'
                AND created_at < $1::date + INTERVAL '1 day'
            `, [date]);

            // New users (signed up today)
            const newUsersResult = await pool.query(`
                SELECT COUNT(*) as new_users
                FROM users 
                WHERE DATE(created_at) = $1
            `, [date]);

            // Activated users (made first transaction today)
            const activatedResult = await pool.query(`
                SELECT COUNT(DISTINCT user_id) as activated
                FROM user_contract_transactions 
                WHERE DATE(created_at) = $1
                AND user_id NOT IN (
                    SELECT DISTINCT user_id 
                    FROM user_contract_transactions 
                    WHERE DATE(created_at) < $1
                )
            `, [date]);

            // Total revenue for the day
            const revenueResult = await pool.query(`
                SELECT COALESCE(SUM(CAST(value AS NUMERIC)), 0) as total_revenue
                FROM user_contract_transactions 
                WHERE DATE(created_at) = $1
            `, [date]);

            // Insert or update daily metrics
            await pool.query(`
                INSERT INTO user_engagement_summary 
                (date, dau, wau, mau, new_users, activated_users, total_revenue)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (date) DO UPDATE SET
                    dau = $2, wau = $3, mau = $4, 
                    new_users = $5, activated_users = $6, total_revenue = $7
            `, [
                date,
                dauResult.rows[0].dau,
                wauResult.rows[0].wau,
                mauResult.rows[0].mau,
                newUsersResult.rows[0].new_users,
                activatedResult.rows[0].activated,
                revenueResult.rows[0].total_revenue
            ]);

        } catch (error) {
            console.error('Error updating daily engagement:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive user insights
     */
    async getUserInsights(): Promise<any> {
        try {
            const [cohortStats, engagementStats, functionStats, retentionStats] = await Promise.all([
                // Cohort breakdown
                pool.query(`
                    SELECT 
                        cohort_type,
                        cohort_name,
                        COUNT(*) as user_count,
                        AVG(revenue_generated) as avg_revenue,
                        AVG(retention_score) as avg_retention,
                        SUM(revenue_generated) as total_revenue
                    FROM user_cohorts 
                    GROUP BY cohort_type, cohort_name
                    ORDER BY cohort_type
                `),

                // Latest engagement metrics
                pool.query(`
                    SELECT * FROM user_engagement_summary 
                    ORDER BY date DESC LIMIT 30
                `),

                // Top function usage
                pool.query(`
                    SELECT 
                        function_name,
                        SUM(usage_count) as total_usage,
                        COUNT(DISTINCT user_id) as unique_users,
                        AVG(revenue_impact) as avg_revenue_impact
                    FROM function_usage_analytics 
                    GROUP BY function_name
                    ORDER BY total_usage DESC
                    LIMIT 20
                `),

                // Retention analysis
                pool.query(`
                    SELECT 
                        cohort_type,
                        period_number,
                        AVG(retention_rate) as avg_retention_rate,
                        SUM(users_retained) as total_retained,
                        SUM(revenue_retained) as total_revenue_retained
                    FROM retention_analysis 
                    WHERE cohort_month >= CURRENT_DATE - INTERVAL '12 months'
                    GROUP BY cohort_type, period_number
                    ORDER BY cohort_type, period_number
                `)
            ]);

            return {
                cohort_analysis: cohortStats.rows,
                engagement_trends: engagementStats.rows,
                function_usage: functionStats.rows,
                retention_analysis: retentionStats.rows,
                summary: {
                    total_users: cohortStats.rows.reduce((sum, row) => sum + parseInt(row.user_count), 0),
                    total_revenue: cohortStats.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0),
                    latest_dau: engagementStats.rows[0]?.dau || 0,
                    latest_mau: engagementStats.rows[0]?.mau || 0
                }
            };
        } catch (error) {
            console.error('Error getting user insights:', error);
            throw error;
        }
    }

    /**
     * Track wallet interactions
     */
    async trackWalletInteraction(userId: string, walletAddress: string, revenue: number = 0): Promise<void> {
        try {
            // Check if wallet was used in app before by other users
            const existingWallet = await pool.query(`
                SELECT COUNT(*) as count 
                FROM wallet_interaction_history 
                WHERE wallet_address = $1 AND user_id != $2
            `, [walletAddress, userId]);

            const isNewToApp = parseInt(existingWallet.rows[0].count) === 0;

            await pool.query(`
                INSERT INTO wallet_interaction_history 
                (user_id, wallet_address, first_interaction_date, last_interaction_date, 
                 interaction_count, revenue_generated, is_new_to_app)
                VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE, 1, $3, $4)
                ON CONFLICT (user_id, wallet_address) DO UPDATE SET
                    last_interaction_date = CURRENT_DATE,
                    interaction_count = wallet_interaction_history.interaction_count + 1,
                    revenue_generated = wallet_interaction_history.revenue_generated + $3
            `, [userId, walletAddress, revenue, isNewToApp]);

        } catch (error) {
            console.error('Error tracking wallet interaction:', error);
            throw error;
        }
    }

    /**
     * Generate market insights
     */
    async generateMarketInsights(): Promise<void> {
        try {
            // Feature gaps - functions with low usage but high revenue impact
            const featureGaps = await pool.query(`
                SELECT 
                    function_name,
                    COUNT(DISTINCT user_id) as user_count,
                    AVG(revenue_impact) as avg_revenue
                FROM function_usage_analytics 
                GROUP BY function_name
                HAVING COUNT(DISTINCT user_id) < 10 AND AVG(revenue_impact) > 100
            `);

            // Retention gaps - cohorts with declining retention
            const retentionGaps = await pool.query(`
                SELECT cohort_type, AVG(retention_rate) as avg_retention
                FROM retention_analysis 
                WHERE period_number <= 4
                GROUP BY cohort_type
                HAVING AVG(retention_rate) < 50
            `);

            // Save insights
            for (const gap of featureGaps.rows) {
                await pool.query(`
                    INSERT INTO market_insights 
                    (insight_type, category, description, opportunity_score, affected_users, potential_revenue)
                    VALUES ('feature_gap', 'underutilized_function', $1, $2, $3, $4)
                `, [
                    `Function "${gap.function_name}" has high revenue potential but low adoption`,
                    Math.min(gap.avg_revenue / 10, 10),
                    gap.user_count,
                    gap.avg_revenue * 100
                ]);
            }

            for (const gap of retentionGaps.rows) {
                await pool.query(`
                    INSERT INTO market_insights 
                    (insight_type, category, description, opportunity_score, priority)
                    VALUES ('retention_gap', 'cohort_retention', $1, $2, 'high')
                `, [
                    `Cohort ${gap.cohort_type} has low retention rate of ${gap.avg_retention}%`,
                    10 - (gap.avg_retention / 10)
                ]);
            }

        } catch (error) {
            console.error('Error generating market insights:', error);
            throw error;
        }
    }
}

export const userAnalyticsService = new UserAnalyticsService();
