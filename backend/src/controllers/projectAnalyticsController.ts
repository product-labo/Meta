import { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';

export class ProjectAnalyticsController {
  constructor(private db: Pool) {}

  // GET /api/projects/:id/analytics/overview
  async getAnalyticsOverview(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Get overview metrics
      const overviewQuery = `
        SELECT 
          COUNT(DISTINCT t.from_address) as active_wallets,
          COUNT(t.id) as total_transactions,
          SUM(CAST(t.value AS NUMERIC)) as total_volume,
          AVG(CAST(t.value AS NUMERIC)) as avg_transaction_value,
          SUM(CAST(t.gas_used AS NUMERIC)) as total_gas_used,
          COUNT(CASE WHEN t.status = 'success' THEN 1 END) as successful_transactions,
          COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_transactions,
          MAX(t.timestamp) as last_activity
        FROM mc_transaction_details t
        WHERE t.project_id = $1
          AND t.timestamp >= NOW() - INTERVAL '30 days'
      `;

      const overviewResult = await this.db.query(overviewQuery, [projectId]);
      const overview = overviewResult.rows[0];

      // Get daily activity for the last 30 days
      const dailyActivityQuery = `
        SELECT 
          DATE_TRUNC('day', t.timestamp) as date,
          COUNT(t.id) as transactions,
          COUNT(DISTINCT t.from_address) as active_wallets,
          SUM(CAST(t.value AS NUMERIC)) as volume
        FROM mc_transaction_details t
        WHERE t.project_id = $1
          AND t.timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', t.timestamp)
        ORDER BY date DESC
      `;

      const dailyActivity = await this.db.query(dailyActivityQuery, [projectId]);

      // Calculate success rate
      const totalTx = parseInt(overview.total_transactions || '0');
      const successfulTx = parseInt(overview.successful_transactions || '0');
      const successRate = totalTx > 0 ? (successfulTx / totalTx) * 100 : 0;

      res.json({
        success: true,
        data: {
          overview: {
            active_wallets: parseInt(overview.active_wallets || '0'),
            total_transactions: totalTx,
            total_volume: parseFloat(overview.total_volume || '0'),
            avg_transaction_value: parseFloat(overview.avg_transaction_value || '0'),
            total_gas_used: parseFloat(overview.total_gas_used || '0'),
            success_rate: successRate,
            last_activity: overview.last_activity
          },
          daily_activity: dailyActivity.rows,
          period: '30 days'
        }
      });
    } catch (error) {
      console.error('Analytics overview error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' });
    }
  }

  // GET /api/projects/:id/analytics/retention-chart
  async getRetentionChart(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Calculate weekly retention
      const retentionQuery = `
        WITH user_first_week AS (
          SELECT 
            from_address,
            DATE_TRUNC('week', MIN(timestamp)) as first_week
          FROM mc_transaction_details
          WHERE project_id = $1
          GROUP BY from_address
        ),
        weekly_activity AS (
          SELECT 
            t.from_address,
            DATE_TRUNC('week', t.timestamp) as week,
            uf.first_week,
            EXTRACT(WEEK FROM t.timestamp) - EXTRACT(WEEK FROM uf.first_week) as weeks_since_first
          FROM mc_transaction_details t
          JOIN user_first_week uf ON t.from_address = uf.from_address
          WHERE t.project_id = $1
        )
        SELECT 
          weeks_since_first,
          COUNT(DISTINCT from_address) as retained_users,
          (SELECT COUNT(DISTINCT from_address) FROM user_first_week) as total_cohort_size
        FROM weekly_activity
        WHERE weeks_since_first >= 0 AND weeks_since_first <= 12
        GROUP BY weeks_since_first
        ORDER BY weeks_since_first
      `;

      const retentionResult = await this.db.query(retentionQuery, [projectId]);

      // Calculate retention percentages
      const retentionData = retentionResult.rows.map(row => ({
        week: parseInt(row.weeks_since_first),
        retained_users: parseInt(row.retained_users),
        total_cohort_size: parseInt(row.total_cohort_size),
        retention_rate: row.total_cohort_size > 0 ? 
          (parseInt(row.retained_users) / parseInt(row.total_cohort_size)) * 100 : 0
      }));

      res.json({
        success: true,
        data: {
          retention_chart: retentionData,
          summary: {
            week_1_retention: retentionData.find(d => d.week === 1)?.retention_rate || 0,
            week_4_retention: retentionData.find(d => d.week === 4)?.retention_rate || 0,
            week_12_retention: retentionData.find(d => d.week === 12)?.retention_rate || 0
          }
        }
      });
    } catch (error) {
      console.error('Retention chart error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch retention chart' });
    }
  }

  // GET /api/projects/:id/analytics/transaction-success-rate
  async getTransactionSuccessRate(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;
      const { timeframe = '30d' } = req.query;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;

      // Get success rate over time
      const successRateQuery = `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          ROUND(
            (COUNT(CASE WHEN status = 'success' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
          ) as success_rate
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY date DESC
      `;

      const successRateResult = await this.db.query(successRateQuery, [projectId]);

      // Get failure reasons
      const failureReasonsQuery = `
        SELECT 
          COALESCE(error_message, 'Unknown') as failure_reason,
          COUNT(*) as count,
          ROUND((COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM mc_transaction_details WHERE project_id = $1 AND status = 'failed' AND timestamp >= NOW() - INTERVAL '${days} days')) * 100, 2) as percentage
        FROM mc_transaction_details
        WHERE project_id = $1 
          AND status = 'failed'
          AND timestamp >= NOW() - INTERVAL '${days} days'
        GROUP BY error_message
        ORDER BY count DESC
        LIMIT 10
      `;

      const failureReasonsResult = await this.db.query(failureReasonsQuery, [projectId]);

      // Calculate overall metrics
      const totalTransactions = successRateResult.rows.reduce((sum, row) => sum + parseInt(row.total_transactions), 0);
      const totalSuccessful = successRateResult.rows.reduce((sum, row) => sum + parseInt(row.successful_transactions), 0);
      const overallSuccessRate = totalTransactions > 0 ? (totalSuccessful / totalTransactions) * 100 : 0;

      res.json({
        success: true,
        data: {
          daily_success_rates: successRateResult.rows,
          failure_reasons: failureReasonsResult.rows,
          summary: {
            overall_success_rate: overallSuccessRate,
            total_transactions: totalTransactions,
            successful_transactions: totalSuccessful,
            failed_transactions: totalTransactions - totalSuccessful
          },
          timeframe: `${days} days`
        }
      });
    } catch (error) {
      console.error('Transaction success rate error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transaction success rate' });
    }
  }

  // GET /api/projects/:id/analytics/fee-analysis
  async getFeeAnalysis(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Get fee analysis
      const feeAnalysisQuery = `
        SELECT 
          AVG(CAST(gas_used AS NUMERIC)) as avg_gas_used,
          MIN(CAST(gas_used AS NUMERIC)) as min_gas_used,
          MAX(CAST(gas_used AS NUMERIC)) as max_gas_used,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CAST(gas_used AS NUMERIC)) as median_gas_used,
          SUM(CAST(gas_used AS NUMERIC)) as total_gas_used,
          AVG(CAST(gas_price AS NUMERIC)) as avg_gas_price,
          SUM(CAST(gas_used AS NUMERIC) * CAST(gas_price AS NUMERIC)) as total_fees_paid
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
          AND gas_used IS NOT NULL
          AND gas_price IS NOT NULL
      `;

      const feeAnalysisResult = await this.db.query(feeAnalysisQuery, [projectId]);

      // Get daily fee trends
      const dailyFeeTrendsQuery = `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          AVG(CAST(gas_used AS NUMERIC)) as avg_gas_used,
          AVG(CAST(gas_price AS NUMERIC)) as avg_gas_price,
          SUM(CAST(gas_used AS NUMERIC) * CAST(gas_price AS NUMERIC)) as total_fees
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
          AND gas_used IS NOT NULL
          AND gas_price IS NOT NULL
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY date DESC
      `;

      const dailyFeeTrendsResult = await this.db.query(dailyFeeTrendsQuery, [projectId]);

      // Get fee distribution by transaction type
      const feeDistributionQuery = `
        SELECT 
          CASE 
            WHEN CAST(gas_used AS NUMERIC) < 21000 THEN 'Simple Transfer'
            WHEN CAST(gas_used AS NUMERIC) < 100000 THEN 'Contract Interaction'
            WHEN CAST(gas_used AS NUMERIC) < 500000 THEN 'Complex Contract'
            ELSE 'Heavy Computation'
          END as transaction_type,
          COUNT(*) as count,
          AVG(CAST(gas_used AS NUMERIC)) as avg_gas_used,
          AVG(CAST(gas_used AS NUMERIC) * CAST(gas_price AS NUMERIC)) as avg_fee
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
          AND gas_used IS NOT NULL
          AND gas_price IS NOT NULL
        GROUP BY 
          CASE 
            WHEN CAST(gas_used AS NUMERIC) < 21000 THEN 'Simple Transfer'
            WHEN CAST(gas_used AS NUMERIC) < 100000 THEN 'Contract Interaction'
            WHEN CAST(gas_used AS NUMERIC) < 500000 THEN 'Complex Contract'
            ELSE 'Heavy Computation'
          END
        ORDER BY count DESC
      `;

      const feeDistributionResult = await this.db.query(feeDistributionQuery, [projectId]);

      const feeAnalysis = feeAnalysisResult.rows[0];

      res.json({
        success: true,
        data: {
          fee_summary: {
            avg_gas_used: parseFloat(feeAnalysis.avg_gas_used || '0'),
            min_gas_used: parseFloat(feeAnalysis.min_gas_used || '0'),
            max_gas_used: parseFloat(feeAnalysis.max_gas_used || '0'),
            median_gas_used: parseFloat(feeAnalysis.median_gas_used || '0'),
            total_gas_used: parseFloat(feeAnalysis.total_gas_used || '0'),
            avg_gas_price: parseFloat(feeAnalysis.avg_gas_price || '0'),
            total_fees_paid: parseFloat(feeAnalysis.total_fees_paid || '0')
          },
          daily_trends: dailyFeeTrendsResult.rows,
          fee_distribution: feeDistributionResult.rows
        }
      });
    } catch (error) {
      console.error('Fee analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch fee analysis' });
    }
  }

  // GET /api/projects/:id/analytics/tam-sam-som
  async getTamSamSom(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Get project metrics for TAM/SAM/SOM calculation
      const projectMetricsQuery = `
        SELECT 
          COUNT(DISTINCT from_address) as unique_users,
          SUM(CAST(value AS NUMERIC)) as total_volume,
          COUNT(*) as total_transactions,
          AVG(CAST(value AS NUMERIC)) as avg_transaction_value
        FROM mc_transaction_details
        WHERE project_id = $1
      `;

      const projectMetrics = await this.db.query(projectMetricsQuery, [projectId]);

      // Get industry benchmarks (all projects)
      const industryMetricsQuery = `
        SELECT 
          COUNT(DISTINCT from_address) as total_industry_users,
          SUM(CAST(value AS NUMERIC)) as total_industry_volume,
          COUNT(*) as total_industry_transactions,
          COUNT(DISTINCT project_id) as total_projects
        FROM mc_transaction_details
      `;

      const industryMetrics = await this.db.query(industryMetricsQuery);

      // Get similar projects (same category if available)
      const similarProjectsQuery = `
        SELECT 
          COUNT(DISTINCT t.from_address) as similar_users,
          SUM(CAST(t.value AS NUMERIC)) as similar_volume,
          COUNT(t.*) as similar_transactions
        FROM mc_transaction_details t
        JOIN projects p ON t.project_id = p.id
        WHERE p.category = (SELECT category FROM projects WHERE id = $1)
          AND t.project_id != $1
      `;

      const similarProjects = await this.db.query(similarProjectsQuery, [projectId]);

      const project = projectMetrics.rows[0];
      const industry = industryMetrics.rows[0];
      const similar = similarProjects.rows[0];

      // Calculate TAM, SAM, SOM
      const totalAddressableMarket = parseFloat(industry.total_industry_volume || '0');
      const serviceableAddressableMarket = parseFloat(similar.similar_volume || '0') || totalAddressableMarket * 0.1;
      const serviceableObtainableMarket = parseFloat(project.total_volume || '0');

      // Calculate market share and potential
      const currentMarketShare = totalAddressableMarket > 0 ? 
        (serviceableObtainableMarket / totalAddressableMarket) * 100 : 0;
      
      const potentialMarketShare = serviceableAddressableMarket > 0 ? 
        (serviceableObtainableMarket / serviceableAddressableMarket) * 100 : 0;

      res.json({
        success: true,
        data: {
          tam_sam_som: {
            total_addressable_market: totalAddressableMarket,
            serviceable_addressable_market: serviceableAddressableMarket,
            serviceable_obtainable_market: serviceableObtainableMarket,
            current_market_share: currentMarketShare,
            potential_market_share: potentialMarketShare
          },
          project_metrics: {
            unique_users: parseInt(project.unique_users || '0'),
            total_volume: parseFloat(project.total_volume || '0'),
            total_transactions: parseInt(project.total_transactions || '0'),
            avg_transaction_value: parseFloat(project.avg_transaction_value || '0')
          },
          industry_benchmarks: {
            total_users: parseInt(industry.total_industry_users || '0'),
            total_volume: parseFloat(industry.total_industry_volume || '0'),
            total_transactions: parseInt(industry.total_industry_transactions || '0'),
            total_projects: parseInt(industry.total_projects || '0')
          },
          growth_potential: {
            user_growth_potential: Math.max(0, parseInt(similar.similar_users || '0') - parseInt(project.unique_users || '0')),
            volume_growth_potential: Math.max(0, parseFloat(similar.similar_volume || '0') - parseFloat(project.total_volume || '0')),
            market_penetration: currentMarketShare
          }
        }
      });
    } catch (error) {
      console.error('TAM/SAM/SOM error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch TAM/SAM/SOM analysis' });
    }
  }

  // GET /api/projects/:id/analytics/feature-usage
  async getFeatureUsage(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Analyze feature usage based on transaction patterns
      const featureUsageQuery = `
        SELECT 
          CASE 
            WHEN to_address = from_address THEN 'Self Transfer'
            WHEN CAST(value AS NUMERIC) = 0 THEN 'Contract Interaction'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) = 21000 THEN 'Simple Transfer'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) > 21000 THEN 'Token Transfer'
            ELSE 'Other'
          END as feature_type,
          COUNT(*) as usage_count,
          COUNT(DISTINCT from_address) as unique_users,
          AVG(CAST(value AS NUMERIC)) as avg_value,
          SUM(CAST(value AS NUMERIC)) as total_value
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY 
          CASE 
            WHEN to_address = from_address THEN 'Self Transfer'
            WHEN CAST(value AS NUMERIC) = 0 THEN 'Contract Interaction'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) = 21000 THEN 'Simple Transfer'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) > 21000 THEN 'Token Transfer'
            ELSE 'Other'
          END
        ORDER BY usage_count DESC
      `;

      const featureUsageResult = await this.db.query(featureUsageQuery, [projectId]);

      // Get daily feature usage trends
      const dailyFeatureUsageQuery = `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          CASE 
            WHEN to_address = from_address THEN 'Self Transfer'
            WHEN CAST(value AS NUMERIC) = 0 THEN 'Contract Interaction'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) = 21000 THEN 'Simple Transfer'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) > 21000 THEN 'Token Transfer'
            ELSE 'Other'
          END as feature_type,
          COUNT(*) as daily_usage
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', timestamp), 
          CASE 
            WHEN to_address = from_address THEN 'Self Transfer'
            WHEN CAST(value AS NUMERIC) = 0 THEN 'Contract Interaction'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) = 21000 THEN 'Simple Transfer'
            WHEN CAST(value AS NUMERIC) > 0 AND CAST(gas_used AS NUMERIC) > 21000 THEN 'Token Transfer'
            ELSE 'Other'
          END
        ORDER BY date DESC, daily_usage DESC
      `;

      const dailyFeatureUsageResult = await this.db.query(dailyFeatureUsageQuery, [projectId]);

      // Calculate total usage for percentages
      const totalUsage = featureUsageResult.rows.reduce((sum, row) => sum + parseInt(row.usage_count), 0);

      const featureUsageWithPercentages = featureUsageResult.rows.map(row => ({
        ...row,
        usage_count: parseInt(row.usage_count),
        unique_users: parseInt(row.unique_users),
        avg_value: parseFloat(row.avg_value || '0'),
        total_value: parseFloat(row.total_value || '0'),
        usage_percentage: totalUsage > 0 ? (parseInt(row.usage_count) / totalUsage) * 100 : 0
      }));

      res.json({
        success: true,
        data: {
          feature_usage: featureUsageWithPercentages,
          daily_trends: dailyFeatureUsageResult.rows,
          summary: {
            total_feature_usage: totalUsage,
            most_popular_feature: featureUsageWithPercentages[0]?.feature_type || 'None',
            feature_diversity: featureUsageWithPercentages.length
          }
        }
      });
    } catch (error) {
      console.error('Feature usage error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch feature usage' });
    }
  }

  // GET /api/projects/:id/analytics/country-stats
  async getCountryStats(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Note: This is a simplified version. In a real implementation, you would:
      // 1. Use IP geolocation services to map addresses to countries
      // 2. Store country data in a separate table
      // 3. Use external APIs for real-time geolocation

      // For now, we'll simulate country distribution based on address patterns
      const countryStatsQuery = `
        SELECT 
          CASE 
            WHEN from_address LIKE '0x1%' OR from_address LIKE '0x2%' THEN 'United States'
            WHEN from_address LIKE '0x3%' OR from_address LIKE '0x4%' THEN 'United Kingdom'
            WHEN from_address LIKE '0x5%' OR from_address LIKE '0x6%' THEN 'Germany'
            WHEN from_address LIKE '0x7%' OR from_address LIKE '0x8%' THEN 'Japan'
            WHEN from_address LIKE '0x9%' OR from_address LIKE '0xa%' THEN 'South Korea'
            WHEN from_address LIKE '0xb%' OR from_address LIKE '0xc%' THEN 'Singapore'
            WHEN from_address LIKE '0xd%' OR from_address LIKE '0xe%' THEN 'Canada'
            ELSE 'Other'
          END as country,
          COUNT(DISTINCT from_address) as unique_users,
          COUNT(*) as total_transactions,
          SUM(CAST(value AS NUMERIC)) as total_volume,
          AVG(CAST(value AS NUMERIC)) as avg_transaction_value
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY 
          CASE 
            WHEN from_address LIKE '0x1%' OR from_address LIKE '0x2%' THEN 'United States'
            WHEN from_address LIKE '0x3%' OR from_address LIKE '0x4%' THEN 'United Kingdom'
            WHEN from_address LIKE '0x5%' OR from_address LIKE '0x6%' THEN 'Germany'
            WHEN from_address LIKE '0x7%' OR from_address LIKE '0x8%' THEN 'Japan'
            WHEN from_address LIKE '0x9%' OR from_address LIKE '0xa%' THEN 'South Korea'
            WHEN from_address LIKE '0xb%' OR from_address LIKE '0xc%' THEN 'Singapore'
            WHEN from_address LIKE '0xd%' OR from_address LIKE '0xe%' THEN 'Canada'
            ELSE 'Other'
          END
        ORDER BY unique_users DESC
      `;

      const countryStatsResult = await this.db.query(countryStatsQuery, [projectId]);

      // Calculate totals for percentages
      const totalUsers = countryStatsResult.rows.reduce((sum, row) => sum + parseInt(row.unique_users), 0);
      const totalVolume = countryStatsResult.rows.reduce((sum, row) => sum + parseFloat(row.total_volume || '0'), 0);

      const countryStatsWithPercentages = countryStatsResult.rows.map(row => ({
        country: row.country,
        unique_users: parseInt(row.unique_users),
        total_transactions: parseInt(row.total_transactions),
        total_volume: parseFloat(row.total_volume || '0'),
        avg_transaction_value: parseFloat(row.avg_transaction_value || '0'),
        user_percentage: totalUsers > 0 ? (parseInt(row.unique_users) / totalUsers) * 100 : 0,
        volume_percentage: totalVolume > 0 ? (parseFloat(row.total_volume || '0') / totalVolume) * 100 : 0
      }));

      // Get top countries by different metrics
      const topCountriesByUsers = [...countryStatsWithPercentages].sort((a, b) => b.unique_users - a.unique_users).slice(0, 5);
      const topCountriesByVolume = [...countryStatsWithPercentages].sort((a, b) => b.total_volume - a.total_volume).slice(0, 5);

      res.json({
        success: true,
        data: {
          country_stats: countryStatsWithPercentages,
          top_countries_by_users: topCountriesByUsers,
          top_countries_by_volume: topCountriesByVolume,
          summary: {
            total_countries: countryStatsWithPercentages.length,
            total_users: totalUsers,
            total_volume: totalVolume,
            geographic_diversity: countryStatsWithPercentages.length > 5 ? 'High' : countryStatsWithPercentages.length > 2 ? 'Medium' : 'Low'
          },
          note: 'Country data is simulated based on address patterns. Implement IP geolocation for accurate data.'
        }
      });
    } catch (error) {
      console.error('Country stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch country statistics' });
    }
  }

  // GET /api/projects/:id/analytics/flow-analysis
  async getFlowAnalysis(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      // Analyze money flow (inbound vs outbound)
      const flowAnalysisQuery = `
        WITH project_addresses AS (
          SELECT DISTINCT from_address as address FROM mc_transaction_details WHERE project_id = $1
          UNION
          SELECT DISTINCT to_address as address FROM mc_transaction_details WHERE project_id = $1
        ),
        inbound_flow AS (
          SELECT 
            SUM(CAST(value AS NUMERIC)) as total_inbound,
            COUNT(*) as inbound_transactions,
            COUNT(DISTINCT from_address) as inbound_sources
          FROM mc_transaction_details t
          WHERE t.project_id = $1
            AND t.to_address IN (SELECT address FROM project_addresses)
            AND t.from_address NOT IN (SELECT address FROM project_addresses)
            AND timestamp >= NOW() - INTERVAL '30 days'
        ),
        outbound_flow AS (
          SELECT 
            SUM(CAST(value AS NUMERIC)) as total_outbound,
            COUNT(*) as outbound_transactions,
            COUNT(DISTINCT to_address) as outbound_destinations
          FROM mc_transaction_details t
          WHERE t.project_id = $1
            AND t.from_address IN (SELECT address FROM project_addresses)
            AND t.to_address NOT IN (SELECT address FROM project_addresses)
            AND timestamp >= NOW() - INTERVAL '30 days'
        ),
        internal_flow AS (
          SELECT 
            SUM(CAST(value AS NUMERIC)) as total_internal,
            COUNT(*) as internal_transactions
          FROM mc_transaction_details t
          WHERE t.project_id = $1
            AND t.from_address IN (SELECT address FROM project_addresses)
            AND t.to_address IN (SELECT address FROM project_addresses)
            AND timestamp >= NOW() - INTERVAL '30 days'
        )
        SELECT 
          COALESCE(i.total_inbound, 0) as total_inbound,
          COALESCE(i.inbound_transactions, 0) as inbound_transactions,
          COALESCE(i.inbound_sources, 0) as inbound_sources,
          COALESCE(o.total_outbound, 0) as total_outbound,
          COALESCE(o.outbound_transactions, 0) as outbound_transactions,
          COALESCE(o.outbound_destinations, 0) as outbound_destinations,
          COALESCE(int.total_internal, 0) as total_internal,
          COALESCE(int.internal_transactions, 0) as internal_transactions
        FROM inbound_flow i
        CROSS JOIN outbound_flow o
        CROSS JOIN internal_flow int
      `;

      const flowAnalysisResult = await this.db.query(flowAnalysisQuery, [projectId]);

      // Get daily flow trends
      const dailyFlowQuery = `
        WITH project_addresses AS (
          SELECT DISTINCT from_address as address FROM mc_transaction_details WHERE project_id = $1
          UNION
          SELECT DISTINCT to_address as address FROM mc_transaction_details WHERE project_id = $1
        )
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          SUM(CASE 
            WHEN to_address IN (SELECT address FROM project_addresses) 
            AND from_address NOT IN (SELECT address FROM project_addresses) 
            THEN CAST(value AS NUMERIC) ELSE 0 END) as daily_inbound,
          SUM(CASE 
            WHEN from_address IN (SELECT address FROM project_addresses) 
            AND to_address NOT IN (SELECT address FROM project_addresses) 
            THEN CAST(value AS NUMERIC) ELSE 0 END) as daily_outbound,
          SUM(CASE 
            WHEN from_address IN (SELECT address FROM project_addresses) 
            AND to_address IN (SELECT address FROM project_addresses) 
            THEN CAST(value AS NUMERIC) ELSE 0 END) as daily_internal
        FROM mc_transaction_details
        WHERE project_id = $1
          AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY date DESC
      `;

      const dailyFlowResult = await this.db.query(dailyFlowQuery, [projectId]);

      const flowData = flowAnalysisResult.rows[0];
      
      // Calculate net flow and ratios
      const totalInbound = parseFloat(flowData.total_inbound || '0');
      const totalOutbound = parseFloat(flowData.total_outbound || '0');
      const totalInternal = parseFloat(flowData.total_internal || '0');
      const netFlow = totalInbound - totalOutbound;
      const flowRatio = totalOutbound > 0 ? totalInbound / totalOutbound : totalInbound > 0 ? Infinity : 0;

      res.json({
        success: true,
        data: {
          flow_summary: {
            total_inbound: totalInbound,
            total_outbound: totalOutbound,
            total_internal: totalInternal,
            net_flow: netFlow,
            flow_ratio: flowRatio,
            inbound_transactions: parseInt(flowData.inbound_transactions || '0'),
            outbound_transactions: parseInt(flowData.outbound_transactions || '0'),
            internal_transactions: parseInt(flowData.internal_transactions || '0'),
            inbound_sources: parseInt(flowData.inbound_sources || '0'),
            outbound_destinations: parseInt(flowData.outbound_destinations || '0')
          },
          daily_flows: dailyFlowResult.rows,
          flow_health: {
            status: netFlow > 0 ? 'Positive' : netFlow < 0 ? 'Negative' : 'Neutral',
            sustainability: flowRatio > 1.2 ? 'Healthy' : flowRatio > 0.8 ? 'Stable' : 'At Risk',
            diversification: parseInt(flowData.inbound_sources || '0') > 10 ? 'High' : 'Low'
          }
        }
      });
    } catch (error) {
      console.error('Flow analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch flow analysis' });
    }
  }
}