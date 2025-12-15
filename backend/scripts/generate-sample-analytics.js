#!/usr/bin/env node

/**
 * Generate Sample Analytics Data
 * 
 * Creates sample analytics data for testing the dashboard
 */

import { pool } from '../src/config/appConfig.js';

async function generateSampleData() {
  const client = await pool.connect();
  
  try {
    console.log('='.repeat(60));
    console.log('Generating Sample Analytics Data');
    console.log('='.repeat(60));
    console.log('');

    // Get first project
    const projectResult = await client.query(
      'SELECT * FROM projects ORDER BY created_at ASC LIMIT 1'
    );

    if (projectResult.rows.length === 0) {
      console.log('✗ No projects found. Please create a project first.');
      return;
    }

    const project = projectResult.rows[0];
    console.log(`Using project: ${project.name} (${project.id})`);
    console.log('');

    // Get or create wallet
    let walletResult = await client.query(
      'SELECT * FROM wallets WHERE project_id = $1 LIMIT 1',
      [project.id]
    );

    let wallet;
    if (walletResult.rows.length === 0) {
      console.log('Creating sample wallet...');
      const walletInsert = await client.query(
        `INSERT INTO wallets (project_id, address, type, privacy_mode, network, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [project.id, 'zs1sample123456789abcdefghijklmnopqrstuvwxyz', 'sapling', 'private', 'mainnet']
      );
      wallet = walletInsert.rows[0];
      console.log(`✓ Created wallet: ${wallet.address}`);
    } else {
      wallet = walletResult.rows[0];
      console.log(`✓ Using existing wallet: ${wallet.address}`);
    }
    console.log('');

    // Generate sample transactions
    console.log('Generating sample transactions...');
    const txCount = 50;
    const now = new Date();
    
    for (let i = 0; i < txCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      
      const types = ['transfer', 'swap', 'bridge', 'shielded'];
      const type = types[Math.floor(Math.random() * types.length)];
      const amount = Math.floor(Math.random() * 1000000000); // Random amount in zatoshi
      const fee = Math.floor(Math.random() * 10000);
      
      await client.query(
        `INSERT INTO processed_transactions 
         (wallet_id, txid, block_height, block_timestamp, tx_type, value_zatoshi, fee_zatoshi, is_shielded)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (txid) DO NOTHING`,
        [
          wallet.id,
          `tx${i}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          800000 + i,
          timestamp,
          type,
          amount,
          fee,
          type === 'shielded'
        ]
      );
    }
    console.log(`✓ Generated ${txCount} sample transactions`);
    console.log('');

    // Generate activity metrics
    console.log('Generating activity metrics...');
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const txCount = Math.floor(Math.random() * 10) + 1;
      const volume = Math.floor(Math.random() * 5000000000);
      const fees = Math.floor(Math.random() * 50000);
      
      await client.query(
        `INSERT INTO activity_metrics 
         (wallet_id, activity_date, transaction_count, total_volume_zatoshi, total_fees_paid, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (wallet_id, activity_date) DO UPDATE
         SET transaction_count = $3, total_volume_zatoshi = $4, total_fees_paid = $5`,
        [wallet.id, dateStr, txCount, volume, fees]
      );
    }
    console.log('✓ Generated 30 days of activity metrics');
    console.log('');

    // Generate productivity scores
    console.log('Generating productivity scores...');
    await client.query(
      `INSERT INTO productivity_scores 
       (wallet_id, total_score, retention_score, adoption_score, activity_score, diversity_score, status, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (wallet_id) DO UPDATE
       SET total_score = $2, retention_score = $3, adoption_score = $4, 
           activity_score = $5, diversity_score = $6, status = $7, risk_level = $8`,
      [wallet.id, 75, 80, 70, 75, 72, 'healthy', 'low']
    );
    console.log('✓ Generated productivity score');
    console.log('');

    // Generate cohort data
    console.log('Generating cohort data...');
    for (let i = 0; i < 4; i++) {
      const cohortDate = new Date(now);
      cohortDate.setDate(cohortDate.getDate() - (i * 7));
      const cohortPeriod = cohortDate.toISOString().split('T')[0];
      
      await client.query(
        `INSERT INTO cohort_retention 
         (project_id, cohort_period, wallet_count, retention_week_1, retention_week_2, retention_week_3, retention_week_4)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (project_id, cohort_period) DO UPDATE
         SET wallet_count = $3, retention_week_1 = $4, retention_week_2 = $5, 
             retention_week_3 = $6, retention_week_4 = $7`,
        [project.id, cohortPeriod, 100 - (i * 10), 90 - (i * 5), 80 - (i * 5), 70 - (i * 5), 60 - (i * 5)]
      );
    }
    console.log('✓ Generated cohort retention data');
    console.log('');

    // Generate adoption funnel data
    console.log('Generating adoption funnel data...');
    const stages = [
      { stage: 'created', count: 1000 },
      { stage: 'first_tx', count: 800 },
      { stage: 'feature_usage', count: 600 },
      { stage: 'recurring', count: 400 },
      { stage: 'high_value', count: 200 }
    ];
    
    for (const stageData of stages) {
      await client.query(
        `INSERT INTO adoption_funnel 
         (project_id, stage, wallet_count, conversion_rate)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (project_id, stage) DO UPDATE
         SET wallet_count = $3, conversion_rate = $4`,
        [project.id, stageData.stage, stageData.count, (stageData.count / 1000) * 100]
      );
    }
    console.log('✓ Generated adoption funnel data');
    console.log('');

    console.log('='.repeat(60));
    console.log('Sample Data Generation Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('You can now view analytics for project:', project.name);
    console.log('Project ID:', project.id);
    console.log('');
    console.log('Next steps:');
    console.log('1. Open the application');
    console.log('2. Navigate to Dashboard');
    console.log('3. Select the project from the sidebar');
    console.log('4. View analytics data');

  } catch (error) {
    console.error('✗ Error generating sample data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

generateSampleData()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
