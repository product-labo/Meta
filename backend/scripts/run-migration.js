import 'dotenv/config';
import pool from './src/db/db.js';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('🔄 Running analytics migration...');
    
    // Read and execute the migration
    const migration = fs.readFileSync('./migrations/001_add_wallet_analytics.sql', 'utf8');
    await pool.query(migration);
    
    console.log('✅ Analytics migration completed successfully');
    console.log('\n📊 Analytics tables created:');
    console.log('   - wallet_activity_metrics');
    console.log('   - wallet_cohorts');
    console.log('   - wallet_cohort_assignments');
    console.log('   - wallet_adoption_stages');
    console.log('   - wallet_productivity_scores');
    console.log('   - wallet_behavior_flows');
    console.log('   - shielded_pool_metrics');
    console.log('   - competitive_benchmarks');
    console.log('   - ai_recommendations');
    console.log('   - wallet_privacy_settings');
    console.log('   - processed_transactions');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();