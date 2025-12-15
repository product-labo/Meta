import { 
  initializeWalletAdoption,
  updateWalletAdoptionStages,
  getProjectAdoptionFunnel,
  getWalletAdoptionStatus
} from './src/services/adoptionStageService.js';
import { saveProcessedTransaction } from './src/models/analytics.js';
import pool from './src/db/db.js';

async function testAdoptionIntegration() {
  console.log('🔗 Testing Adoption Stage Integration...\n');

  try {
    // Get a test wallet
    const walletResult = await pool.query(
      'SELECT id, address, project_id FROM wallets LIMIT 1'
    );

    if (walletResult.rows.length === 0) {
      console.log('❌ No wallets found in database.');
      return;
    }

    const wallet = walletResult.rows[0];
    console.log(`📊 Testing integration with wallet: ${wallet.address}\n`);

    // Test 1: Initialize adoption tracking
    console.log('🚀 Test 1: Initialize Adoption Tracking');
    const initResult = await initializeWalletAdoption(wallet.id);
    console.log(`  ✅ ${initResult.message}\n`);

    // Test 2: Add some transactions to trigger stage progression
    console.log('📈 Test 2: Add Transactions for Stage Progression');
    
    const baseTime = new Date();
    const transactions = [
      {
        wallet_id: wallet.id,
        txid: 'test_tx_001',
        block_height: 1000001,
        block_timestamp: new Date(baseTime.getTime() + 1000 * 60 * 60), // +1 hour
        tx_type: 'transfer',
        tx_subtype: 'outgoing',
        value_zatoshi: 5000000,
        fee_zatoshi: 10000,
        counterparty_address: 'test_counterparty_1',
        counterparty_type: 'wallet',
        feature_used: 'basic_transfer',
        sequence_position: 1,
        time_since_previous_tx_minutes: 0
      },
      {
        wallet_id: wallet.id,
        txid: 'test_tx_002',
        block_height: 1000002,
        block_timestamp: new Date(baseTime.getTime() + 1000 * 60 * 60 * 2), // +2 hours
        tx_type: 'swap',
        tx_subtype: 'outgoing',
        value_zatoshi: 3000000,
        fee_zatoshi: 15000,
        counterparty_address: 'test_dex_1',
        counterparty_type: 'defi',
        feature_used: 'token_swap',
        sequence_position: 2,
        time_since_previous_tx_minutes: 60
      },
      {
        wallet_id: wallet.id,
        txid: 'test_tx_003',
        block_height: 1000003,
        block_timestamp: new Date(baseTime.getTime() + 1000 * 60 * 60 * 24), // +1 day
        tx_type: 'bridge',
        tx_subtype: 'outgoing',
        value_zatoshi: 10000000,
        fee_zatoshi: 25000,
        counterparty_address: 'test_bridge_1',
        counterparty_type: 'bridge',
        feature_used: 'cross_chain_bridge',
        sequence_position: 3,
        time_since_previous_tx_minutes: 1380 // 23 hours
      }
    ];

    for (const tx of transactions) {
      try {
        await saveProcessedTransaction(tx);
        console.log(`  ✅ Added transaction: ${tx.txid} (${tx.tx_type})`);
      } catch (error) {
        console.log(`  ⚠️  Transaction ${tx.txid} may already exist: ${error.message}`);
      }
    }
    console.log();

    // Test 3: Update adoption stages based on new transactions
    console.log('🔄 Test 3: Update Adoption Stages');
    const updateResult = await updateWalletAdoptionStages(wallet.id);
    console.log(`  📊 Stage updates:`);
    if (updateResult.updates.length > 0) {
      updateResult.updates.forEach(update => {
        console.log(`    ✅ Achieved: ${update.stage} (${update.time_to_achieve_hours}h, ${Math.round(update.conversion_probability * 100)}% confidence)`);
      });
    } else {
      console.log(`    ℹ️  No new stages achieved`);
    }
    console.log();

    // Test 4: Check updated adoption status
    console.log('📋 Test 4: Updated Adoption Status');
    const status = await getWalletAdoptionStatus(wallet.id);
    console.log(`  Current Stage: ${status.current_stage}`);
    console.log(`  Next Stage: ${status.next_stage || 'Complete'}`);
    console.log(`  Progress: ${Math.round(status.progress_percentage)}%`);
    console.log(`  Detailed stages:`);
    status.stages.forEach(stage => {
      const achieved = stage.achieved_at ? '✅' : '⏳';
      const time = stage.time_to_achieve_hours ? ` (${stage.time_to_achieve_hours}h)` : '';
      const prob = stage.conversion_probability ? ` [${Math.round(stage.conversion_probability * 100)}%]` : '';
      console.log(`    ${achieved} ${stage.stage_name}${time}${prob}`);
    });
    console.log();

    // Test 5: Project-level funnel analysis
    console.log('📊 Test 5: Project Funnel Analysis');
    const funnelData = await getProjectAdoptionFunnel(wallet.project_id);
    console.log(`  Project funnel overview:`);
    funnelData.forEach(stage => {
      const avgTime = stage.avg_time_to_achieve_hours ? 
        ` (avg: ${Math.round(stage.avg_time_to_achieve_hours)}h)` : '';
      console.log(`    ${stage.stage_name}: ${stage.achieved_wallets}/${stage.total_wallets} (${stage.conversion_rate}%)${avgTime}`);
    });
    console.log();

    // Test 6: Verify data consistency
    console.log('🔍 Test 6: Data Consistency Check');
    const consistencyResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT was.wallet_id) as wallets_with_stages,
         COUNT(DISTINCT pt.wallet_id) as wallets_with_transactions,
         COUNT(DISTINCT wam.wallet_id) as wallets_with_activity
       FROM wallet_adoption_stages was
       FULL OUTER JOIN processed_transactions pt ON was.wallet_id = pt.wallet_id
       FULL OUTER JOIN wallet_activity_metrics wam ON was.wallet_id = wam.wallet_id
       WHERE was.wallet_id = $1 OR pt.wallet_id = $1 OR wam.wallet_id = $1`,
      [wallet.id]
    );

    const consistency = consistencyResult.rows[0];
    console.log(`  Data consistency:`);
    console.log(`    Wallets with adoption stages: ${consistency.wallets_with_stages}`);
    console.log(`    Wallets with transactions: ${consistency.wallets_with_transactions}`);
    console.log(`    Wallets with activity metrics: ${consistency.wallets_with_activity}`);
    
    const isConsistent = consistency.wallets_with_stages === consistency.wallets_with_transactions;
    console.log(`    Data consistency: ${isConsistent ? '✅ Consistent' : '⚠️  Inconsistent'}`);
    console.log();

    console.log('✅ Adoption stage integration tests completed successfully!');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run integration tests
testAdoptionIntegration();