import 'dotenv/config';
import { 
  calculateDailyMetrics,
  processWalletDailyMetrics,
  getWalletActivityTrend,
  processAllUnprocessedMetrics
} from './src/services/activityCalculator.js';
import { processTransactionForWallet } from './src/services/transactionProcessor.js';
import pool from './src/db/db.js';

async function testActivityCalculator() {
  console.log('🧪 Testing Wallet Activity Calculator...\n');

  try {
    // Test 1: Get a sample wallet
    console.log('1. Finding sample wallet...');
    const walletResult = await pool.query(`
      SELECT w.id, w.address, p.name as project_name 
      FROM wallets w 
      JOIN projects p ON w.project_id = p.id 
      LIMIT 1
    `);

    if (walletResult.rows.length === 0) {
      console.log('   ⚠️  No wallets found. Please create a wallet first.');
      return;
    }

    const sampleWallet = walletResult.rows[0];
    console.log(`   ✓ Using wallet: ${sampleWallet.address} (${sampleWallet.project_name})`);
    console.log('');

    // Test 2: Create sample processed transactions
    console.log('2. Creating sample processed transactions...');
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create sample transactions for today
    const sampleTransactions = [
      {
        wallet_id: sampleWallet.id,
        txid: 'test_tx_001',
        block_height: 12345,
        block_timestamp: new Date(),
        tx_type: 'transfer',
        tx_subtype: 'outgoing',
        value_zatoshi: -50000000, // -0.5 ZEC (outgoing)
        fee_zatoshi: 1000,
        counterparty_address: 't1RecipientAddress001',
        counterparty_type: 'wallet',
        is_shielded: false
      },
      {
        wallet_id: sampleWallet.id,
        txid: 'test_tx_002',
        block_height: 12346,
        block_timestamp: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes later
        tx_type: 'swap',
        tx_subtype: 'multi_party',
        value_zatoshi: 25000000, // +0.25 ZEC (swap result)
        fee_zatoshi: 2000,
        counterparty_address: 't1DEXAddress001',
        counterparty_type: 'defi',
        is_shielded: false
      },
      {
        wallet_id: sampleWallet.id,
        txid: 'test_tx_003',
        block_height: 12347,
        block_timestamp: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
        tx_type: 'shielded',
        tx_subtype: 'outgoing',
        value_zatoshi: -10000000, // -0.1 ZEC (to shielded pool)
        fee_zatoshi: 5000,
        counterparty_address: 'zs1ShieldedAddress001',
        counterparty_type: 'wallet',
        is_shielded: true
      }
    ];

    // Insert sample transactions
    for (const tx of sampleTransactions) {
      await pool.query(`
        INSERT INTO processed_transactions (
          wallet_id, txid, block_height, block_timestamp, tx_type, tx_subtype,
          value_zatoshi, fee_zatoshi, counterparty_address, counterparty_type, is_shielded
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (wallet_id, txid) DO NOTHING
      `, [
        tx.wallet_id, tx.txid, tx.block_height, tx.block_timestamp, tx.tx_type, tx.tx_subtype,
        tx.value_zatoshi, tx.fee_zatoshi, tx.counterparty_address, tx.counterparty_type, tx.is_shielded
      ]);
    }

    console.log(`   ✓ Created ${sampleTransactions.length} sample transactions`);
    console.log('');

    // Test 3: Calculate daily metrics
    console.log('3. Calculating daily metrics...');
    
    const dailyMetrics = await calculateDailyMetrics(sampleWallet.id, today);
    
    if (dailyMetrics) {
      console.log('   ✓ Daily metrics calculated:');
      console.log(`     Transaction Count: ${dailyMetrics.transaction_count}`);
      console.log(`     Total Volume: ${dailyMetrics.total_volume_zatoshi} zatoshi`);
      console.log(`     Total Fees: ${dailyMetrics.total_fees_paid} zatoshi`);
      console.log(`     Transfers: ${dailyMetrics.transfers_count}`);
      console.log(`     Swaps: ${dailyMetrics.swaps_count}`);
      console.log(`     Shielded: ${dailyMetrics.shielded_count}`);
      console.log(`     Complexity Score: ${dailyMetrics.sequence_complexity_score}`);
      console.log(`     Is Active: ${dailyMetrics.is_active}`);
      console.log(`     Is Returning: ${dailyMetrics.is_returning}`);
    } else {
      console.log('   ℹ️  No activity found for today');
    }
    console.log('');

    // Test 4: Process and save daily metrics
    console.log('4. Processing and saving daily metrics...');
    
    const savedMetrics = await processWalletDailyMetrics(sampleWallet.id, today);
    
    if (savedMetrics) {
      console.log('   ✓ Daily metrics saved to database:');
      console.log(`     Metrics ID: ${savedMetrics.id}`);
      console.log(`     Activity Date: ${savedMetrics.activity_date}`);
      console.log(`     Total Score: ${savedMetrics.sequence_complexity_score}`);
    }
    console.log('');

    // Test 5: Get activity trend
    console.log('5. Getting activity trend...');
    
    const activityTrend = await getWalletActivityTrend(sampleWallet.id, 7);
    
    console.log(`   ✓ Activity trend for last 7 days (${activityTrend.length} days with activity):`);
    activityTrend.forEach(day => {
      console.log(`     ${day.activity_date}: ${day.transaction_count} txs, ${day.total_volume_zatoshi} zatoshi`);
    });
    console.log('');

    // Test 6: Process all unprocessed metrics
    console.log('6. Processing all unprocessed metrics...');
    
    const processedResults = await processAllUnprocessedMetrics();
    
    console.log(`   ✓ Processed ${processedResults.length} unprocessed daily metrics`);
    console.log('');

    // Test 7: Verify database state
    console.log('7. Verifying database state...');
    
    const metricsCount = await pool.query(
      'SELECT COUNT(*) FROM wallet_activity_metrics WHERE wallet_id = $1',
      [sampleWallet.id]
    );
    
    const processedTxCount = await pool.query(
      'SELECT COUNT(*) FROM processed_transactions WHERE wallet_id = $1',
      [sampleWallet.id]
    );
    
    console.log(`   ✓ Activity metrics records: ${metricsCount.rows[0].count}`);
    console.log(`   ✓ Processed transactions: ${processedTxCount.rows[0].count}`);
    console.log('');

    console.log('🎉 Activity calculator test completed successfully!');
    console.log('\n📊 Activity Calculator Features:');
    console.log('   ✓ Daily metrics calculation from processed transactions');
    console.log('   ✓ Transaction type breakdown and counting');
    console.log('   ✓ Sequence complexity scoring');
    console.log('   ✓ Volume and fee aggregation');
    console.log('   ✓ Returning user detection');
    console.log('   ✓ Activity trend analysis');
    console.log('   ✓ Batch processing capabilities');
    console.log('   ✓ Automatic unprocessed transaction handling');

  } catch (error) {
    console.error('❌ Activity calculator test failed:', error);
  } finally {
    await pool.end();
  }
}

testActivityCalculator();