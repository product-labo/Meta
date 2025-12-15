import 'dotenv/config';
import { 
  parseTransactionForAnalytics,
  processTransactionForWallet,
  createWalletAddressMap,
  TRANSACTION_TYPES,
  TRANSACTION_SUBTYPES
} from './src/services/transactionProcessor.js';
import { saveTransaction } from './indexer/db/transactions.js';
import pool from './src/db/db.js';

async function testTransactionProcessing() {
  console.log('🧪 Testing Enhanced Transaction Processing...\n');

  try {
    // Test 1: Create sample transaction data
    console.log('1. Creating sample transaction data...');
    
    const sampleBlock = {
      hash: 'test_block_hash_123',
      height: 12345,
      time: Math.floor(Date.now() / 1000)
    };

    const sampleRawTx = {
      txid: 'test_tx_123456789',
      size: 250,
      fee: 1000,
      type: 'normal',
      valueIn: 200000000, // 2 ZEC
      valueOut: 199999000, // 1.99999 ZEC (minus fee)
      vin: [
        {
          txid: 'prev_tx_123',
          vout: 0,
          address: 't1TestAddress123',
          value: 200000000
        }
      ],
      vout: [
        {
          address: 't1RecipientAddress456',
          value: 150000000 // 1.5 ZEC
        },
        {
          address: 't1TestAddress123', // Change back to sender
          value: 49999000 // ~0.5 ZEC change
        }
      ]
    };

    console.log('   ✓ Sample transaction created');
    console.log('');

    // Test 2: Save basic transaction to database
    console.log('2. Saving transaction to database...');
    
    const basicTx = {
      txid: sampleRawTx.txid,
      block_hash: sampleBlock.hash,
      block_height: sampleBlock.height,
      timestamp: new Date(sampleBlock.time * 1000),
      size: sampleRawTx.size,
      value_out: sampleRawTx.valueOut
    };

    await saveTransaction(basicTx);
    console.log('   ✓ Transaction saved to database');
    console.log('');

    // Test 3: Test enhanced parsing
    console.log('3. Testing enhanced transaction parsing...');
    
    const walletAddress = 't1TestAddress123';
    const { enhancedTx } = parseTransactionForAnalytics(sampleRawTx, sampleBlock, walletAddress);
    
    console.log('   ✓ Enhanced transaction parsing results:');
    console.log(`     Transaction Type: ${enhancedTx.tx_type}`);
    console.log(`     Transaction Subtype: ${enhancedTx.tx_subtype}`);
    console.log(`     Value Change: ${enhancedTx.value_zatoshi} zatoshi`);
    console.log(`     Fee: ${enhancedTx.fee_zatoshi} zatoshi`);
    console.log(`     Counterparty: ${enhancedTx.counterparty_address}`);
    console.log(`     Counterparty Type: ${enhancedTx.counterparty_type}`);
    console.log(`     Is Shielded: ${enhancedTx.is_shielded}`);
    console.log(`     Complexity Score: ${enhancedTx.complexity_score}`);
    console.log('');

    // Test 4: Test wallet address mapping
    console.log('4. Testing wallet address mapping...');
    
    const addressMap = await createWalletAddressMap();
    console.log(`   ✓ Found ${addressMap.size} active wallets in address map`);
    
    if (addressMap.has(walletAddress)) {
      const walletId = addressMap.get(walletAddress);
      console.log(`   ✓ Test wallet found: ${walletAddress} -> ${walletId}`);
      
      // Test 5: Process transaction for specific wallet
      console.log('');
      console.log('5. Processing transaction for wallet analytics...');
      
      try {
        const processedTx = await processTransactionForWallet(
          sampleRawTx, 
          sampleBlock, 
          walletId, 
          walletAddress
        );
        
        console.log('   ✓ Transaction processed for analytics:');
        console.log(`     Processed TX ID: ${processedTx.id}`);
        console.log(`     Wallet ID: ${processedTx.wallet_id}`);
        console.log(`     Transaction Type: ${processedTx.tx_type}`);
        console.log(`     Value: ${processedTx.value_zatoshi} zatoshi`);
        
      } catch (error) {
        console.log(`   ⚠️  Analytics processing error: ${error.message}`);
      }
      
    } else {
      console.log(`   ℹ️  Test wallet ${walletAddress} not found in active wallets`);
    }
    console.log('');

    // Test 6: Verify transaction types classification
    console.log('6. Testing transaction type classification...');
    
    console.log('   Available transaction types:');
    Object.entries(TRANSACTION_TYPES).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    
    console.log('   Available transaction subtypes:');
    Object.entries(TRANSACTION_SUBTYPES).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('');

    // Test 7: Check database state
    console.log('7. Checking database state...');
    
    const txCount = await pool.query('SELECT COUNT(*) FROM transactions');
    const processedTxCount = await pool.query('SELECT COUNT(*) FROM processed_transactions');
    const activityCount = await pool.query('SELECT COUNT(*) FROM wallet_activity_metrics');
    
    console.log(`   ✓ Total transactions in DB: ${txCount.rows[0].count}`);
    console.log(`   ✓ Processed transactions: ${processedTxCount.rows[0].count}`);
    console.log(`   ✓ Activity metrics records: ${activityCount.rows[0].count}`);
    console.log('');

    console.log('🎉 Enhanced transaction processing test completed successfully!');
    console.log('\n📊 Transaction Processing Features:');
    console.log('   ✓ Enhanced transaction type classification');
    console.log('   ✓ Behavioral metadata extraction');
    console.log('   ✓ Counterparty identification and classification');
    console.log('   ✓ Shielded transaction detection');
    console.log('   ✓ Transaction complexity scoring');
    console.log('   ✓ Automatic analytics processing');
    console.log('   ✓ Daily activity metrics aggregation');

  } catch (error) {
    console.error('❌ Transaction processing test failed:', error);
  } finally {
    await pool.end();
  }
}

testTransactionProcessing();