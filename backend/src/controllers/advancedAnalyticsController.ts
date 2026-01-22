import { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';

export class AdvancedAnalyticsController {
  constructor(private db: Pool) {}

  // GET /api/analytics/cross-project
  async getCrossProjectAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      const query = `
        SELECT 
          p.name as project_name,
          p.id as project_id,
          COUNT(DISTINCT t.id) as transaction_count,
          COUNT(DISTINCT w.id) as wallet_count,
          AVG(m.total_volume) as avg_volume,
          SUM(m.total_volume) as total_volume,
          MAX(t.timestamp) as last_activity
        FROM projects p
        LEFT JOIN transactions t ON p.id = t.project_id
        LEFT JOIN wallets w ON p.id = w.project_id
        LEFT JOIN metrics m ON p.id = m.project_id
        WHERE p.user_id = $1
        GROUP BY p.id, p.name
        ORDER BY total_volume DESC NULLS LAST
      `;
      
      const result = await this.db.query(query, [userId]);
      
      res.json({
        success: true,
        data: {
          projects: result.rows,
          summary: {
            total_projects: result.rows.length,
            total_volume: result.rows.reduce((sum, p) => sum + (parseFloat(p.total_volume) || 0), 0),
            total_transactions: result.rows.reduce((sum, p) => sum + parseInt(p.transaction_count), 0),
            total_wallets: result.rows.reduce((sum, p) => sum + parseInt(p.wallet_count), 0)
          }
        }
      });
    } catch (error) {
      console.error('Cross-project analytics error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch cross-project analytics' });
    }
  }

  // GET /api/analytics/market-analysis
  async getMarketAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { timeframe = '30d', chain } = req.query;
      
      const query = `
        SELECT 
          DATE_TRUNC('day', t.timestamp) as date,
          t.chain_id,
          COUNT(*) as transaction_count,
          AVG(CAST(t.value AS NUMERIC)) as avg_value,
          SUM(CAST(t.value AS NUMERIC)) as total_value,
          COUNT(DISTINCT t.from_address) as unique_senders,
          COUNT(DISTINCT t.to_address) as unique_receivers
        FROM transactions t
        JOIN projects p ON t.project_id = p.id
        WHERE p.user_id = $1
          AND t.timestamp >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days'}'
          ${chain ? 'AND t.chain_id = $2' : ''}
        GROUP BY DATE_TRUNC('day', t.timestamp), t.chain_id
        ORDER BY date DESC
      `;
      
      const params = chain ? [userId, chain] : [userId];
      const result = await this.db.query(query, params);
      
      // Calculate market trends
      const trends = this.calculateMarketTrends(result.rows);
      
      res.json({
        success: true,
        data: {
          daily_metrics: result.rows,
          trends,
          market_summary: {
            total_volume: result.rows.reduce((sum, row) => sum + parseFloat(row.total_value || '0'), 0),
            avg_daily_transactions: result.rows.reduce((sum, row) => sum + parseInt(row.transaction_count), 0) / result.rows.length,
            unique_participants: new Set([...result.rows.map(r => r.unique_senders), ...result.rows.map(r => r.unique_receivers)]).size
          }
        }
      });
    } catch (error) {
      console.error('Market analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch market analysis' });
    }
  }

  // GET /api/analytics/competitor-analysis
  async getCompetitorAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { category, timeframe = '30d' } = req.query;
      
      // Get user's project metrics
      const userMetricsQuery = `
        SELECT 
          AVG(m.total_volume) as avg_volume,
          AVG(m.transaction_count) as avg_transactions,
          AVG(m.unique_wallets) as avg_wallets,
          AVG(m.gas_used) as avg_gas
        FROM metrics m
        JOIN projects p ON m.project_id = p.id
        WHERE p.user_id = $1
          AND m.date >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : '30 days'}'
      `;
      
      const userMetrics = await this.db.query(userMetricsQuery, [userId]);
      
      // Get industry benchmarks (anonymized)
      const benchmarkQuery = `
        SELECT 
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY m.total_volume) as volume_25th,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.total_volume) as volume_median,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY m.total_volume) as volume_75th,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY m.transaction_count) as tx_25th,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.transaction_count) as tx_median,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY m.transaction_count) as tx_75th,
          AVG(m.total_volume) as industry_avg_volume,
          AVG(m.transaction_count) as industry_avg_transactions
        FROM metrics m
        JOIN projects p ON m.project_id = p.id
        WHERE m.date >= NOW() - INTERVAL '${timeframe === '7d' ? '7 days' : '30 days'}'
          AND p.user_id != $1
      `;
      
      const benchmarks = await this.db.query(benchmarkQuery, [userId]);
      
      const userStats = userMetrics.rows[0];
      const industryStats = benchmarks.rows[0];
      
      res.json({
        success: true,
        data: {
          user_performance: userStats,
          industry_benchmarks: industryStats,
          percentile_ranking: {
            volume: this.calculatePercentile(userStats.avg_volume, industryStats),
            transactions: this.calculatePercentile(userStats.avg_transactions, industryStats)
          },
          recommendations: this.generateCompetitorRecommendations(userStats, industryStats)
        }
      });
    } catch (error) {
      console.error('Competitor analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch competitor analysis' });
    }
  }

  // GET /api/analytics/trend-prediction
  async getTrendPrediction(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { metric = 'volume', days = 30 } = req.query;
      
      const query = `
        SELECT 
          DATE_TRUNC('day', m.date) as date,
          SUM(m.total_volume) as volume,
          SUM(m.transaction_count) as transactions,
          SUM(m.unique_wallets) as wallets
        FROM metrics m
        JOIN projects p ON m.project_id = p.id
        WHERE p.user_id = $1
          AND m.date >= NOW() - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('day', m.date)
        ORDER BY date ASC
      `;
      
      const result = await this.db.query(query, [userId]);
      const predictions = this.calculateTrendPredictions(result.rows, metric as string, parseInt(days as string));
      
      res.json({
        success: true,
        data: {
          historical_data: result.rows,
          predictions,
          confidence_interval: predictions.confidence,
          trend_analysis: {
            direction: predictions.trend_direction,
            strength: predictions.trend_strength,
            seasonality: predictions.seasonality_detected
          }
        }
      });
    } catch (error) {
      console.error('Trend prediction error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate trend predictions' });
    }
  }

  // GET /api/analytics/anomaly-detection
  async getAnomalyDetection(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { sensitivity = 'medium' } = req.query;
      
      const query = `
        SELECT 
          t.id,
          t.hash,
          t.timestamp,
          t.value,
          t.gas_used,
          t.from_address,
          t.to_address,
          t.chain_id,
          p.name as project_name
        FROM transactions t
        JOIN projects p ON t.project_id = p.id
        WHERE p.user_id = $1
          AND t.timestamp >= NOW() - INTERVAL '7 days'
        ORDER BY t.timestamp DESC
      `;
      
      const result = await this.db.query(query, [userId]);
      const anomalies = this.detectAnomalies(result.rows, sensitivity as string);
      
      res.json({
        success: true,
        data: {
          anomalies,
          summary: {
            total_anomalies: anomalies.length,
            high_risk: anomalies.filter(a => a.risk_level === 'high').length,
            medium_risk: anomalies.filter(a => a.risk_level === 'medium').length,
            low_risk: anomalies.filter(a => a.risk_level === 'low').length
          },
          detection_settings: {
            sensitivity,
            lookback_period: '7 days',
            algorithms_used: ['statistical_outlier', 'pattern_deviation', 'volume_spike']
          }
        }
      });
    } catch (error) {
      console.error('Anomaly detection error:', error);
      res.status(500).json({ success: false, error: 'Failed to detect anomalies' });
    }
  }

  // GET /api/analytics/correlation-analysis
  async getCorrelationAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { metrics = 'volume,transactions,gas' } = req.query;
      
      const query = `
        SELECT 
          DATE_TRUNC('day', m.date) as date,
          SUM(m.total_volume) as volume,
          SUM(m.transaction_count) as transactions,
          SUM(m.gas_used) as gas,
          SUM(m.unique_wallets) as wallets,
          AVG(m.avg_transaction_value) as avg_tx_value
        FROM metrics m
        JOIN projects p ON m.project_id = p.id
        WHERE p.user_id = $1
          AND m.date >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', m.date)
        ORDER BY date ASC
      `;
      
      const result = await this.db.query(query, [userId]);
      const correlations = this.calculateCorrelations(result.rows, (metrics as string).split(','));
      
      res.json({
        success: true,
        data: {
          correlation_matrix: correlations.matrix,
          significant_correlations: correlations.significant,
          insights: correlations.insights,
          data_points: result.rows.length
        }
      });
    } catch (error) {
      console.error('Correlation analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to perform correlation analysis' });
    }
  }

  // GET /api/analytics/segment-analysis
  async getSegmentAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { segment_by = 'wallet_value' } = req.query;
      
      let query = '';
      if (segment_by === 'wallet_value') {
        query = `
          SELECT 
            CASE 
              WHEN total_value < 100 THEN 'low_value'
              WHEN total_value < 1000 THEN 'medium_value'
              ELSE 'high_value'
            END as segment,
            COUNT(*) as wallet_count,
            AVG(total_value) as avg_value,
            SUM(total_value) as total_value,
            AVG(transaction_count) as avg_transactions
          FROM (
            SELECT 
              w.address,
              SUM(CAST(t.value AS NUMERIC)) as total_value,
              COUNT(t.id) as transaction_count
            FROM wallets w
            LEFT JOIN transactions t ON w.address = t.from_address OR w.address = t.to_address
            JOIN projects p ON w.project_id = p.id
            WHERE p.user_id = $1
            GROUP BY w.address
          ) wallet_stats
          GROUP BY segment
          ORDER BY avg_value DESC
        `;
      }
      
      const result = await this.db.query(query, [userId]);
      
      res.json({
        success: true,
        data: {
          segments: result.rows,
          segment_type: segment_by,
          total_wallets: result.rows.reduce((sum, s) => sum + parseInt(s.wallet_count), 0),
          insights: this.generateSegmentInsights(result.rows)
        }
      });
    } catch (error) {
      console.error('Segment analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to perform segment analysis' });
    }
  }

  // GET /api/analytics/attribution-analysis
  async getAttributionAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      const query = `
        SELECT 
          t.from_address,
          t.to_address,
          COUNT(*) as interaction_count,
          SUM(CAST(t.value AS NUMERIC)) as total_value,
          MIN(t.timestamp) as first_interaction,
          MAX(t.timestamp) as last_interaction,
          COUNT(DISTINCT DATE_TRUNC('day', t.timestamp)) as active_days
        FROM transactions t
        JOIN projects p ON t.project_id = p.id
        WHERE p.user_id = $1
          AND t.timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY t.from_address, t.to_address
        HAVING COUNT(*) > 1
        ORDER BY total_value DESC
        LIMIT 100
      `;
      
      const result = await this.db.query(query, [userId]);
      const attribution = this.calculateAttribution(result.rows);
      
      res.json({
        success: true,
        data: {
          top_contributors: result.rows.slice(0, 20),
          attribution_model: attribution,
          conversion_funnel: attribution.funnel,
          channel_performance: attribution.channels
        }
      });
    } catch (error) {
      console.error('Attribution analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to perform attribution analysis' });
    }
  }

  // GET /api/analytics/lifetime-cohorts
  async getLifetimeCohorts(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      const query = `
        SELECT 
          DATE_TRUNC('month', first_tx.first_transaction) as cohort_month,
          DATE_TRUNC('month', t.timestamp) as transaction_month,
          COUNT(DISTINCT t.from_address) as active_wallets,
          SUM(CAST(t.value AS NUMERIC)) as cohort_value
        FROM transactions t
        JOIN (
          SELECT 
            from_address,
            MIN(timestamp) as first_transaction
          FROM transactions t2
          JOIN projects p2 ON t2.project_id = p2.id
          WHERE p2.user_id = $1
          GROUP BY from_address
        ) first_tx ON t.from_address = first_tx.from_address
        JOIN projects p ON t.project_id = p.id
        WHERE p.user_id = $1
        GROUP BY cohort_month, transaction_month
        ORDER BY cohort_month, transaction_month
      `;
      
      const result = await this.db.query(query, [userId]);
      const cohorts = this.buildCohortTable(result.rows);
      
      res.json({
        success: true,
        data: {
          cohort_table: cohorts.table,
          retention_rates: cohorts.retention,
          ltv_analysis: cohorts.ltv,
          insights: cohorts.insights
        }
      });
    } catch (error) {
      console.error('Lifetime cohorts error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate lifetime cohorts' });
    }
  }

  // GET /api/analytics/revenue-forecasting
  async getRevenueForecasting(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { model = 'linear', periods = 12 } = req.query;
      
      const query = `
        SELECT 
          DATE_TRUNC('month', m.date) as month,
          SUM(m.total_volume) as revenue,
          SUM(m.transaction_count) as transactions,
          AVG(m.avg_transaction_value) as avg_tx_value
        FROM metrics m
        JOIN projects p ON m.project_id = p.id
        WHERE p.user_id = $1
          AND m.date >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', m.date)
        ORDER BY month ASC
      `;
      
      const result = await this.db.query(query, [userId]);
      const forecast = this.generateRevenueForecast(result.rows, model as string, parseInt(periods as string));
      
      res.json({
        success: true,
        data: {
          historical_revenue: result.rows,
          forecast: forecast.predictions,
          model_accuracy: forecast.accuracy,
          confidence_intervals: forecast.confidence,
          assumptions: forecast.assumptions,
          scenarios: {
            optimistic: forecast.optimistic,
            realistic: forecast.realistic,
            pessimistic: forecast.pessimistic
          }
        }
      });
    } catch (error) {
      console.error('Revenue forecasting error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate revenue forecast' });
    }
  }

  // Helper methods
  private calculateMarketTrends(data: any[]) {
    // Simple trend calculation
    if (data.length < 2) return { trend: 'insufficient_data' };
    
    const recent = data.slice(0, 7);
    const previous = data.slice(7, 14);
    
    const recentAvg = recent.reduce((sum, d) => sum + parseFloat(d.total_value || '0'), 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + parseFloat(d.total_value || '0'), 0) / previous.length;
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    return {
      trend: change > 5 ? 'bullish' : change < -5 ? 'bearish' : 'neutral',
      change_percent: change,
      volume_trend: recentAvg > previousAvg ? 'increasing' : 'decreasing'
    };
  }

  private calculatePercentile(userValue: number, industryStats: any) {
    const value = parseFloat(userValue?.toString() || '0');
    const median = parseFloat(industryStats.volume_median || '0');
    const q75 = parseFloat(industryStats.volume_75th || '0');
    
    if (value >= q75) return 'top_25';
    if (value >= median) return 'top_50';
    return 'bottom_50';
  }

  private generateCompetitorRecommendations(userStats: any, industryStats: any) {
    const recommendations = [];
    
    if (parseFloat(userStats.avg_volume) < parseFloat(industryStats.industry_avg_volume)) {
      recommendations.push({
        type: 'volume_improvement',
        message: 'Your volume is below industry average. Consider marketing campaigns.',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  private calculateTrendPredictions(data: any[], metric: string, days: number) {
    // Simple linear regression for trend prediction
    const values = data.map(d => parseFloat(d[metric] || '0'));
    const n = values.length;
    
    if (n < 3) {
      return {
        predictions: [],
        confidence: 'low',
        trend_direction: 'unknown',
        trend_strength: 0,
        seasonality_detected: false
      };
    }
    
    // Calculate trend
    const xSum = n * (n + 1) / 2;
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
    const x2Sum = n * (n + 1) * (2 * n + 1) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;
    
    const predictions = [];
    for (let i = 1; i <= days; i++) {
      predictions.push({
        day: i,
        predicted_value: intercept + slope * (n + i),
        confidence: Math.max(0.3, 1 - (i / days) * 0.7) // Decreasing confidence
      });
    }
    
    return {
      predictions,
      confidence: 'medium',
      trend_direction: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat',
      trend_strength: Math.abs(slope),
      seasonality_detected: false
    };
  }

  private detectAnomalies(transactions: any[], sensitivity: string) {
    const values = transactions.map(t => parseFloat(t.value || '0'));
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    const threshold = sensitivity === 'high' ? 2 : sensitivity === 'medium' ? 2.5 : 3;
    
    return transactions.filter(t => {
      const value = parseFloat(t.value || '0');
      const zScore = Math.abs((value - mean) / stdDev);
      return zScore > threshold;
    }).map(t => ({
      ...t,
      anomaly_type: 'statistical_outlier',
      risk_level: parseFloat(t.value) > mean + 3 * stdDev ? 'high' : 'medium',
      z_score: Math.abs((parseFloat(t.value) - mean) / stdDev)
    }));
  }

  private calculateCorrelations(data: any[], metrics: string[]) {
    const matrix: any = {};
    const significant = [];
    
    // Simple correlation calculation
    for (let i = 0; i < metrics.length; i++) {
      matrix[metrics[i]] = {};
      for (let j = 0; j < metrics.length; j++) {
        if (i === j) {
          matrix[metrics[i]][metrics[j]] = 1.0;
        } else {
          const correlation = this.pearsonCorrelation(
            data.map(d => parseFloat(d[metrics[i]] || '0')),
            data.map(d => parseFloat(d[metrics[j]] || '0'))
          );
          matrix[metrics[i]][metrics[j]] = correlation;
          
          if (Math.abs(correlation) > 0.7) {
            significant.push({
              metric1: metrics[i],
              metric2: metrics[j],
              correlation,
              strength: Math.abs(correlation) > 0.9 ? 'very_strong' : 'strong'
            });
          }
        }
      }
    }
    
    return {
      matrix,
      significant,
      insights: significant.map(s => `Strong ${s.correlation > 0 ? 'positive' : 'negative'} correlation between ${s.metric1} and ${s.metric2}`)
    };
  }

  private pearsonCorrelation(x: number[], y: number[]) {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private generateSegmentInsights(segments: any[]) {
    const insights = [];
    const totalWallets = segments.reduce((sum, s) => sum + parseInt(s.wallet_count), 0);
    
    segments.forEach(segment => {
      const percentage = (parseInt(segment.wallet_count) / totalWallets) * 100;
      insights.push(`${segment.segment} segment represents ${percentage.toFixed(1)}% of wallets`);
    });
    
    return insights;
  }

  private calculateAttribution(interactions: any[]) {
    return {
      funnel: {
        awareness: interactions.length,
        consideration: interactions.filter(i => parseInt(i.interaction_count) > 1).length,
        conversion: interactions.filter(i => parseFloat(i.total_value) > 100).length
      },
      channels: {
        direct: interactions.filter(i => i.from_address === i.to_address).length,
        referral: interactions.filter(i => i.from_address !== i.to_address).length
      }
    };
  }

  private buildCohortTable(data: any[]) {
    const cohorts = new Map();
    
    data.forEach(row => {
      const cohortKey = row.cohort_month;
      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, new Map());
      }
      cohorts.get(cohortKey).set(row.transaction_month, {
        active_wallets: parseInt(row.active_wallets),
        cohort_value: parseFloat(row.cohort_value || '0')
      });
    });
    
    return {
      table: Array.from(cohorts.entries()).map(([cohort, months]) => ({
        cohort,
        months: Array.from(months.entries())
      })),
      retention: [], // Simplified
      ltv: [], // Simplified
      insights: ['Cohort analysis shows user retention patterns']
    };
  }

  private generateRevenueForecast(data: any[], model: string, periods: number) {
    const revenues = data.map(d => parseFloat(d.revenue || '0'));
    const n = revenues.length;
    
    if (n < 3) {
      return {
        predictions: [],
        accuracy: 'low',
        confidence: [],
        assumptions: ['Insufficient historical data'],
        optimistic: [],
        realistic: [],
        pessimistic: []
      };
    }
    
    // Simple linear trend
    const avgGrowth = revenues.length > 1 ? 
      (revenues[revenues.length - 1] - revenues[0]) / (revenues.length - 1) : 0;
    
    const predictions = [];
    const lastRevenue = revenues[revenues.length - 1];
    
    for (let i = 1; i <= periods; i++) {
      const predicted = lastRevenue + (avgGrowth * i);
      predictions.push({
        period: i,
        predicted_revenue: Math.max(0, predicted),
        confidence: Math.max(0.3, 1 - (i / periods) * 0.5)
      });
    }
    
    return {
      predictions,
      accuracy: 'medium',
      confidence: predictions.map(p => p.confidence),
      assumptions: ['Linear growth trend', 'No major market disruptions'],
      optimistic: predictions.map(p => ({ ...p, predicted_revenue: p.predicted_revenue * 1.2 })),
      realistic: predictions,
      pessimistic: predictions.map(p => ({ ...p, predicted_revenue: p.predicted_revenue * 0.8 }))
    };
  }
}