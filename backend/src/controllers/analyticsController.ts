import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export const getStartupOverview = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        // Mock data aggregation for now, replacing with real DB queries where possible
        // Fetch project metrics
        const metricsRes = await pool.query(
            'SELECT * FROM project_metrics WHERE project_id = $1',
            [projectId]
        );
        const metrics = metricsRes.rows[0] || {};

        // Fetch wallet count (real)
        const walletsRes = await pool.query(
            'SELECT COUNT(*) as count FROM wallets WHERE project_id = $1 AND is_active = true',
            [projectId]
        );
        const activeWallets = parseInt(walletsRes.rows[0].count);

        res.json({
            status: 'success',
            data: {
                total_active_wallets: activeWallets,
                total_volume: metrics.volume || 0,
                total_revenue: metrics.cash_in || 0,
                retention_rate: metrics.retention_rate || 0,
                // Mock charts for UI as strict SQL aggregation is complex without transaction data
                retention_chart: metrics.retention_data || [],
                adoption_chart: [10, 15, 20, 25, 30] // Placeholder
            }
        });
    } catch (error) {
        console.error('Get Overview Error:', error);
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};

export const getTransactionalInsights = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        // Placeholder for transaction-heavy queries
        res.json({
            status: 'success',
            data: {
                total_transaction_volume: 1234567,
                average_gas_fee: 0.0012,
                total_revenue: 98734,
                success_rate: 99.7,
                volume_chart: [100, 150, 120, 200, 180],
                top_revenue_wallets: [
                    { address: '0xA...123', revenue: 5000 },
                    { address: '0xB...456', revenue: 3000 }
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};

export const getProductivityScore = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        const metricsRes = await pool.query(
            'SELECT productivity_score, productivity_breakdown FROM project_metrics WHERE project_id = $1',
            [projectId]
        );
        const data = metricsRes.rows[0] || {};

        res.json({
            status: 'success',
            data: {
                score: data.productivity_score || 0,
                breakdown: data.productivity_breakdown || {
                    feature_stability: 72,
                    response_to_alert: 49,
                    resolution_efficiency: 61,
                    task_completion: 54
                },
                health_status: 'Moderate'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};

export const getInsightCentre = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        const metricsRes = await pool.query(
            'SELECT retention_data, funnel_data FROM project_metrics WHERE project_id = $1',
            [projectId]
        );
        const data = metricsRes.rows[0] || {};

        res.json({
            status: 'success',
            data: {
                overall_retention: '42.8%',
                churn_rate: '5.2%',
                onboarding_dropoff: 'Drop-off at Step 3',
                funnel: data.funnel_data || {
                    account_created: 100,
                    profile_created: 91,
                    first_api_call: 64
                }
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};

export const getWalletIntelligence = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        const walletsRes = await pool.query(
            'SELECT COUNT(*) as count FROM wallets WHERE project_id = $1 AND is_active = true',
            [projectId]
        );
        const activeWallets = parseInt(walletsRes.rows[0].count);

        res.json({
            status: 'success',
            data: {
                active_wallets: activeWallets,
                active_wallets_change: 12.5,
                total_volume: 2400000,
                total_volume_change: 15.5,
                avg_gas_fee: 12.40,
                avg_gas_fee_change: -12.5,
                failed_tx_rate: 8.5,
                failed_tx_status: 'Needs Improvement'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};

export const getCompetitorBenchmarks = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        const metricsRes = await pool.query(
            'SELECT competitor_data FROM project_metrics WHERE project_id = $1',
            [projectId]
        );
        const data = metricsRes.rows[0]?.competitor_data || {};

        res.json({
            status: 'success',
            data: {
                my_app: data.my_app || { feature_used: 12, avg_time: '45m', failed_tx: '8.5%', success_rate: '91.5%' },
                competitor_a: data.competitor_a || { feature_used: 18, avg_time: '32m', failed_tx: '4.2%', success_rate: '95.8%' },
                competitor_b: data.competitor_b || { feature_used: 15, avg_time: '38m', failed_tx: '5.8%', success_rate: '94.2%' }
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};

export const getBridgeAnalytics = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        const metricsRes = await pool.query(
            'SELECT bridge_metrics FROM project_metrics WHERE project_id = $1',
            [projectId]
        );
        const data = metricsRes.rows[0]?.bridge_metrics || {};

        res.json({
            status: 'success',
            data: {
                funds_in: data.funds_in || { volume: '1.2M', volume_pct: 15.5, failed_tx: 18, avg_gas: 8.40 },
                funds_out: data.funds_out || { volume: '890k', volume_pct: 15.5, failed_tx: 12, avg_gas: 7.20 }
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};

export const getActivityAnalytics = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        const metricsRes = await pool.query(
            'SELECT activity_metrics FROM project_metrics WHERE project_id = $1',
            [projectId]
        );
        const data = metricsRes.rows[0]?.activity_metrics || {};

        res.json({
            status: 'success',
            data: {
                inside_app: data.inside_app || { transactions: 2456, features_used: 12, session_time: '45m', success_rate: 91.5 },
                outside_app: data.outside_app || { transactions: 8234, apps_used: 4.2, session_val: '234K', success_rate: 95.8 }
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', data: { error: 'Server error' } });
    }
};
