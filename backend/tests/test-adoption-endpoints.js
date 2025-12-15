import pool from './src/db/db.js';

async function testAdoptionEndpoints() {
  console.log('🧪 Testing Adoption Stage Endpoints...\n');

  try {
    // Get a test wallet
    const walletResult = await pool.query(
      'SELECT id, address, project_id FROM wallets LIMIT 1'
    );

    if (walletResult.rows.length === 0) {
      console.log('❌ No wallets found in database. Please add some wallets first.');
      return;
    }

    const wallet = walletResult.rows[0];
    console.log(`📊 Testing with wallet: ${wallet.address} (ID: ${wallet.id})`);
    console.log(`   Project ID: ${wallet.project_id}\n`);

    // Test 1: Check current adoption status
    console.log('📋 Test 1: Current Adoption Status');
    const statusResult = await pool.query(
      `SELECT 
         stage_name,
         achieved_at,
         time_to_achieve_hours,
         conversion_probability
       FROM wallet_adoption_stages 
       WHERE wallet_id = $1
       ORDER BY 
         CASE stage_name
           WHEN 'created' THEN 1
           WHEN 'first_tx' THEN 2
           WHEN 'feature_usage' THEN 3
           WHEN 'recurring' THEN 4
           WHEN 'high_value' THEN 5
           ELSE 6
         END`,
      [wallet.id]
    );

    if (statusResult.rows.length > 0) {
      console.log('  Current stages:');
      statusResult.rows.forEach(stage => {
        const achieved = stage.achieved_at ? '✅' : '⏳';
        const time = stage.time_to_achieve_hours ? ` (${stage.time_to_achieve_hours}h)` : '';
        const prob = stage.conversion_probability ? ` [${Math.round(stage.conversion_probability * 100)}%]` : '';
        console.log(`    ${achieved} ${stage.stage_name}${time}${prob}`);
      });
    } else {
      console.log('  ℹ️  No adoption stages found - need to initialize');
    }
    console.log();

    // Test 2: Project funnel overview
    console.log('📊 Test 2: Project Adoption Funnel');
    const funnelResult = await pool.query(
      `SELECT 
         was.stage_name,
         COUNT(*) as total_wallets,
         COUNT(CASE WHEN was.achieved_at IS NOT NULL THEN 1 END) as achieved_wallets,
         ROUND(100.0 * COUNT(CASE WHEN was.achieved_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as conversion_rate,
         AVG(CASE WHEN was.achieved_at IS NOT NULL THEN was.time_to_achieve_hours END) as avg_time_to_achieve_hours
       FROM wallets w
       JOIN wallet_adoption_stages was ON w.id = was.wallet_id
       WHERE w.project_id = $1
       GROUP BY was.stage_name
       ORDER BY 
         CASE was.stage_name
           WHEN 'created' THEN 1
           WHEN 'first_tx' THEN 2
           WHEN 'feature_usage' THEN 3
           WHEN 'recurring' THEN 4
           WHEN 'high_value' THEN 5
           ELSE 6
         END`,
      [wallet.project_id]
    );

    if (funnelResult.rows.length > 0) {
      console.log('  Project funnel overview:');
      funnelResult.rows.forEach(stage => {
        const avgTime = stage.avg_time_to_achieve_hours ? 
          ` (avg: ${Math.round(stage.avg_time_to_achieve_hours)}h)` : '';
        console.log(`    ${stage.stage_name}: ${stage.achieved_wallets}/${stage.total_wallets} (${stage.conversion_rate}%)${avgTime}`);
      });
    } else {
      console.log('  ℹ️  No funnel data available');
    }
    console.log();

    // Test 3: Conversion rates between stages
    console.log('🔄 Test 3: Stage Conversion Analysis');
    if (funnelResult.rows.length > 1) {
      for (let i = 0; i < funnelResult.rows.length - 1; i++) {
        const currentStage = funnelResult.rows[i];
        const nextStage = funnelResult.rows[i + 1];
        
        const conversionRate = currentStage.achieved_wallets > 0 ? 
          (nextStage.achieved_wallets / currentStage.achieved_wallets) * 100 : 0;
        
        const dropOffRate = 100 - conversionRate;
        const walletsDropped = currentStage.achieved_wallets - nextStage.achieved_wallets;
        
        console.log(`    ${currentStage.stage_name} → ${nextStage.stage_name}: ${Math.round(conversionRate * 100) / 100}% (${walletsDropped} dropped)`);
      }
    } else {
      console.log('  ℹ️  Insufficient data for conversion analysis');
    }
    console.log();

    // Test 4: Activity data that drives stage progression
    console.log('📈 Test 4: Activity Data Analysis');
    const activityResult = await pool.query(
      `SELECT 
         COUNT(*) as total_transactions,
         COUNT(DISTINCT tx_type) as unique_tx_types,
         COUNT(DISTINCT feature_used) as unique_features,
         COUNT(DISTINCT DATE(block_timestamp)) as active_days,
         SUM(value_zatoshi) as total_volume,
         MIN(block_timestamp) as first_tx_date,
         MAX(block_timestamp) as last_tx_date
       FROM processed_transactions 
       WHERE wallet_id = $1`,
      [wallet.id]
    );

    if (activityResult.rows[0] && activityResult.rows[0].total_transactions > 0) {
      const activity = activityResult.rows[0];
      const timeSpanDays = activity.first_tx_date && activity.last_tx_date ? 
        Math.ceil((new Date(activity.last_tx_date) - new Date(activity.first_tx_date)) / (1000 * 60 * 60 * 24)) : 0;
      
      console.log('  Transaction activity:');
      console.log(`    Total transactions: ${activity.total_transactions}`);
      console.log(`    Unique transaction types: ${activity.unique_tx_types}`);
      console.log(`    Unique features used: ${activity.unique_features}`);
      console.log(`    Active days: ${activity.active_days}`);
      console.log(`    Total volume: ${activity.total_volume} zatoshi`);
      console.log(`    Activity span: ${timeSpanDays} days`);
      console.log(`    First transaction: ${activity.first_tx_date}`);
      console.log(`    Last transaction: ${activity.last_tx_date}`);
    } else {
      console.log('  ℹ️  No transaction activity found');
    }
    console.log();

    // Test 5: Stage criteria evaluation
    console.log('🎯 Test 5: Stage Criteria Evaluation');
    const activity = activityResult.rows[0];
    if (activity && activity.total_transactions > 0) {
      const timeSpanDays = activity.first_tx_date && activity.last_tx_date ? 
        Math.ceil((new Date(activity.last_tx_date) - new Date(activity.first_tx_date)) / (1000 * 60 * 60 * 24)) : 0;

      console.log('  Stage criteria check:');
      console.log(`    first_tx: ${activity.total_transactions >= 1 ? '✅' : '❌'} (need 1, have ${activity.total_transactions})`);
      console.log(`    feature_usage: ${activity.total_transactions >= 3 && activity.unique_tx_types >= 2 ? '✅' : '❌'} (need 3 tx + 2 types, have ${activity.total_transactions} tx + ${activity.unique_tx_types} types)`);
      console.log(`    recurring: ${activity.total_transactions >= 5 && activity.active_days >= 3 && timeSpanDays >= 7 ? '✅' : '❌'} (need 5 tx + 3 days + 7 day span, have ${activity.total_transactions} tx + ${activity.active_days} days + ${timeSpanDays} day span)`);
      console.log(`    high_value: ${activity.total_transactions >= 10 && activity.active_days >= 7 && timeSpanDays >= 30 && activity.total_volume >= 1000000 ? '✅' : '❌'} (need 10 tx + 7 days + 30 day span + 1M zatoshi, have ${activity.total_transactions} tx + ${activity.active_days} days + ${timeSpanDays} day span + ${activity.total_volume} zatoshi)`);
    } else {
      console.log('  ℹ️  No activity data to evaluate');
    }
    console.log();

    console.log('✅ Adoption stage endpoint tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run tests
testAdoptionEndpoints();