import 'dotenv/config';
import pool from './src/db/db.js';

async function createDashboardView() {
  try {
    console.log('Creating wallet health dashboard view...');
    
    await pool.query(`
      CREATE OR REPLACE VIEW wallet_health_dashboard AS
      SELECT 
        CASE 
          WHEN wps.total_score >= 80 THEN 'Healthy'
          WHEN wps.total_score >= 50 THEN 'At Risk'
          ELSE 'Churn'
        END as health_status,
        COUNT(*) as wallet_count,
        ROUND(AVG(wps.total_score), 2) as avg_score,
        ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM wallet_productivity_scores), 2) as percentage
      FROM wallet_productivity_scores wps
      GROUP BY health_status
      ORDER BY wallet_count DESC
    `);
    
    console.log('✅ Dashboard view created successfully');
    
    // Test the view
    const result = await pool.query('SELECT * FROM wallet_health_dashboard');
    console.log('📊 Current wallet health:');
    result.rows.forEach(row => {
      console.log(`   ${row.health_status}: ${row.wallet_count} wallets (${row.percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ Failed to create dashboard view:', error.message);
  } finally {
    await pool.end();
  }
}

createDashboardView();