import { pool } from '../config/database.js';

interface UserInsightRequest {
    userId: string;
    projectId?: string;
    objective?: string;
    model?: string;
}

interface AIAnalysisResponse {
    id: string;
    summary: string;
    objective: string;
    model: string;
    created_at: string;
}

export class AIInsightsService {
    private aiServiceUrl: string;

    constructor() {
        this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3080';
    }

    /**
     * Get AI insights for user's indexed contract data
     */
    async getUserInsights(request: UserInsightRequest): Promise<AIAnalysisResponse> {
        try {
            // Verify user ownership
            await this.verifyUserAccess(request.userId, request.projectId);

            // Collect user-specific data
            const userData = await this.collectUserData(request.userId, request.projectId);

            // Send to AI agent for analysis
            const insights = await this.requestAIAnalysis(userData, request);

            // Save insights for user
            await this.saveUserInsights(request.userId, request.projectId, insights);

            return insights;
        } catch (error) {
            console.error('Failed to get user insights:', error);
            throw error;
        }
    }

    /**
     * Verify user has access to the data
     */
    private async verifyUserAccess(userId: string, projectId?: string): Promise<void> {
        if (projectId) {
            const result = await pool.query(
                'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Unauthorized: User does not own this project');
            }
        }

        // Verify user is verified
        const userResult = await pool.query(
            'SELECT is_verified FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_verified) {
            throw new Error('Unauthorized: User not verified');
        }
    }

    /**
     * Collect user-specific indexed data for AI analysis
     */
    private async collectUserData(userId: string, projectId?: string): Promise<any> {
        const data: any = {};

        // User transactions
        let txQuery = 'SELECT * FROM user_contract_transactions WHERE user_id = $1';
        let txParams = [userId];
        
        if (projectId) {
            txQuery += ' AND project_id = $2';
            txParams.push(projectId);
        }
        
        txQuery += ' ORDER BY block_number DESC LIMIT 1000';
        
        const transactions = await pool.query(txQuery, txParams);
        data.transactions = transactions.rows;

        // User events
        let eventQuery = 'SELECT * FROM user_contract_events WHERE user_id = $1';
        let eventParams = [userId];
        
        if (projectId) {
            eventQuery += ' AND project_id = $2';
            eventParams.push(projectId);
        }
        
        eventQuery += ' ORDER BY block_number DESC LIMIT 1000';
        
        const events = await pool.query(eventQuery, eventParams);
        data.events = events.rows;

        // User projects
        const projects = await pool.query(
            'SELECT name, category, chain, contract_address FROM projects WHERE user_id = $1',
            [userId]
        );
        data.projects = projects.rows;

        // User analytics
        if (projectId) {
            const analytics = await this.getProjectAnalytics(userId, projectId);
            data.analytics = analytics;
        } else {
            // Get analytics for all user projects
            const allAnalytics = await this.getAllUserAnalytics(userId);
            data.analytics = allAnalytics;
        }

        // Recent activity (last 7 days)
        const recentActivity = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as activity_count
            FROM user_contract_transactions 
            WHERE user_id = $1 
            AND created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [userId]);
        data.recent_activity = recentActivity.rows;

        return data;
    }

    /**
     * Get analytics for specific project
     */
    private async getProjectAnalytics(userId: string, projectId: string): Promise<any> {
        const [txStats, eventStats, functionStats] = await Promise.all([
            // Transaction statistics
            pool.query(`
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(DISTINCT from_address) as unique_senders,
                    COUNT(DISTINCT function_name) as unique_functions,
                    AVG(gas_used) as avg_gas_used
                FROM user_contract_transactions 
                WHERE user_id = $1 AND project_id = $2
            `, [userId, projectId]),

            // Event statistics
            pool.query(`
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(DISTINCT event_name) as unique_events
                FROM user_contract_events 
                WHERE user_id = $1 AND project_id = $2
            `, [userId, projectId]),

            // Function call frequency
            pool.query(`
                SELECT 
                    function_name,
                    COUNT(*) as call_count
                FROM user_contract_transactions 
                WHERE user_id = $1 AND project_id = $2 
                AND function_name IS NOT NULL
                GROUP BY function_name
                ORDER BY call_count DESC
                LIMIT 10
            `, [userId, projectId])
        ]);

        return {
            transaction_stats: txStats.rows[0],
            event_stats: eventStats.rows[0],
            top_functions: functionStats.rows
        };
    }

    /**
     * Get analytics for all user projects
     */
    private async getAllUserAnalytics(userId: string): Promise<any> {
        const [projectStats, chainStats, activityTrend] = await Promise.all([
            // Per-project statistics
            pool.query(`
                SELECT 
                    p.name as project_name,
                    p.chain,
                    COUNT(t.id) as transaction_count,
                    COUNT(e.id) as event_count
                FROM projects p
                LEFT JOIN user_contract_transactions t ON p.id = t.project_id
                LEFT JOIN user_contract_events e ON p.id = e.project_id
                WHERE p.user_id = $1
                GROUP BY p.id, p.name, p.chain
            `, [userId]),

            // Chain distribution
            pool.query(`
                SELECT 
                    chain,
                    COUNT(*) as transaction_count
                FROM user_contract_transactions 
                WHERE user_id = $1
                GROUP BY chain
                ORDER BY transaction_count DESC
            `, [userId]),

            // Activity trend (last 30 days)
            pool.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as daily_transactions
                FROM user_contract_transactions 
                WHERE user_id = $1 
                AND created_at > NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `, [userId])
        ]);

        return {
            project_stats: projectStats.rows,
            chain_distribution: chainStats.rows,
            activity_trend: activityTrend.rows
        };
    }

    /**
     * Send data to AI agent for analysis
     */
    private async requestAIAnalysis(userData: any, request: UserInsightRequest): Promise<AIAnalysisResponse> {
        const objective = request.objective || 
            'Analyze this user\'s blockchain activity and provide personalized insights on: ' +
            '1) Contract performance and optimization opportunities, ' +
            '2) User engagement patterns and growth strategies, ' +
            '3) Competitive positioning and market opportunities, ' +
            '4) Risk assessment and security recommendations, ' +
            '5) Revenue optimization and monetization strategies';

        const payload = {
            data: userData,
            objective: objective,
            model: request.model || 'open-mistral-7b',
            tags: ['user-insights', 'personalized'],
            meta: {
                user_id: request.userId,
                project_id: request.projectId,
                data_points: {
                    transactions: userData.transactions?.length || 0,
                    events: userData.events?.length || 0,
                    projects: userData.projects?.length || 0
                }
            },
            source: 'user_indexed_data'
        };

        const response = await fetch(`${this.aiServiceUrl}/ai/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`AI service error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Save insights for user access
     */
    private async saveUserInsights(userId: string, projectId: string | undefined, insights: AIAnalysisResponse): Promise<void> {
        await pool.query(`
            INSERT INTO user_ai_insights (
                user_id, project_id, ai_analysis_id, summary, objective, model, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            userId,
            projectId || null,
            insights.id,
            insights.summary,
            insights.objective,
            insights.model,
            insights.created_at
        ]);
    }

    /**
     * Get user's previous insights
     */
    async getUserInsightsHistory(userId: string, projectId?: string, limit: number = 10): Promise<any[]> {
        let query = `
            SELECT ai_analysis_id, summary, objective, model, created_at
            FROM user_ai_insights 
            WHERE user_id = $1
        `;
        const params = [userId];

        if (projectId) {
            query += ' AND project_id = $2';
            params.push(projectId);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit.toString());

        const result = await pool.query(query, params);
        return result.rows;
    }
}

export const aiInsightsService = new AIInsightsService();
