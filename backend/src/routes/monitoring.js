/**
 * Monitoring API Routes
 * 
 * Provides endpoints for accessing multichain system monitoring data
 */

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const pool = new Pool(dbConfig);

/**
 * GET /api/monitoring/health
 * Returns overall system health status
 */
router.get('/health', async (req, res) => {
  try {
    const healthData = await pool.query('SELECT * FROM sync_health_dashboard ORDER BY table_name');
    
    const summary = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tables: healthData.rows,
      alerts: []
    };
    
    // Check for issues
    healthData.rows.forEach(row => {
      if (row.minutes_since_last_sync > 5) {
        summary.status = 'warning';
        summary.alerts.push({
          type: 'sync_lag',
          table: row.table_name,
          minutes: Math.round(row.minutes_since_last_sync)
        });
      }
      
      if (row.records_last_hour === 0) {
        summary.status = 'warning';
        summary.alerts.push({
          type: 'no_activity',
          table: row.table_name
        });
      }
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/chains
 * Returns per-chain sync status
 */
router.get('/chains', async (req, res) => {
  try {
    const chainData = await pool.query('SELECT * FROM chain_sync_status ORDER BY chain_id');
    
    res.json({
      timestamp: new Date().toISOString(),
      chains: chainData.rows.map(row => ({
        chain_id: row.chain_id,
        total_transactions: parseInt(row.total_transactions),
        latest_block: parseInt(row.latest_block_number),
        latest_block_time: row.latest_block_time,
        minutes_behind: Math.round(row.minutes_behind),
        tx_last_hour: parseInt(row.tx_last_hour),
        avg_value_24h: parseFloat(row.avg_value_24h) || 0,
        status: row.minutes_behind > 10 ? 'lagging' : 'synced'
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/performance
 * Returns database performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const performanceData = await pool.query('SELECT * FROM performance_metrics ORDER BY tablename');
    
    res.json({
      timestamp: new Date().toISOString(),
      metrics: performanceData.rows.map(row => ({
        table: row.tablename,
        size: row.table_size,
        inserts: parseInt(row.inserts),
        updates: parseInt(row.updates),
        deletes: parseInt(row.deletes),
        sequential_scans: parseInt(row.sequential_scans),
        index_scans: parseInt(row.index_scans),
        scan_efficiency: row.index_scans / (row.sequential_scans + row.index_scans) * 100
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/quality
 * Returns data quality metrics
 */
router.get('/quality', async (req, res) => {
  try {
    const qualityData = await pool.query('SELECT * FROM data_quality_metrics ORDER BY table_name');
    
    res.json({
      timestamp: new Date().toISOString(),
      quality: qualityData.rows.map(row => ({
        table: row.table_name,
        total_records: parseInt(row.total_records),
        quality_score: parseFloat(row.quality_score),
        null_values: parseInt(row.null_hashes || row.null_addresses || 0),
        status: row.quality_score >= 95 ? 'excellent' : 
                row.quality_score >= 90 ? 'good' : 'needs_attention'
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Returns recent alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const severity = req.query.severity;
    
    let query = `
      SELECT * FROM monitoring_alerts 
      WHERE resolved_at IS NULL
    `;
    
    const params = [];
    
    if (severity) {
      query += ` AND severity = $${params.length + 1}`;
      params.push(severity);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const alertData = await pool.query(query, params);
    
    res.json({
      timestamp: new Date().toISOString(),
      alerts: alertData.rows,
      total: alertData.rows.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/alerts/:id/resolve
 * Mark an alert as resolved
 */
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    
    await pool.query(
      'UPDATE monitoring_alerts SET resolved_at = NOW() WHERE id = $1',
      [alertId]
    );
    
    res.json({
      success: true,
      message: 'Alert resolved',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/dashboard
 * Returns comprehensive dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [health, chains, performance, quality, alerts] = await Promise.all([
      pool.query('SELECT * FROM sync_health_dashboard ORDER BY table_name'),
      pool.query('SELECT * FROM chain_sync_status ORDER BY chain_id'),
      pool.query('SELECT * FROM performance_metrics ORDER BY tablename'),
      pool.query('SELECT * FROM data_quality_metrics ORDER BY table_name'),
      pool.query('SELECT * FROM monitoring_alerts WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 10')
    ]);
    
    res.json({
      timestamp: new Date().toISOString(),
      health: health.rows,
      chains: chains.rows,
      performance: performance.rows,
      quality: quality.rows,
      recent_alerts: alerts.rows,
      summary: {
        total_tables: health.rows.length,
        total_chains: chains.rows.length,
        active_alerts: alerts.rows.length,
        avg_quality_score: quality.rows.reduce((sum, row) => sum + parseFloat(row.quality_score), 0) / quality.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;