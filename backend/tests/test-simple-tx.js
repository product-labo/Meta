import 'dotenv/config';
import { parseTransactionForAnalytics, TRANSACTION_TYPES } from './src/services/transactionProcessor.js';

async function testSimpleTransactionParsing() {
  console.log('🧪 Testing Simple Transaction Parsing...\n');

  try {
    // Create sample data
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
      valueIn: 200000000,
      valueOut: 199999000,
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
          value: 150000000
        },
        {
          address: 't1TestAddress123',
          value: 49999000
        }
      ]
    };

    console.log('1. Testing transaction parsing...');
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

    console.log('2. Testing transaction types...');
    console.log('   Available transaction types:');
    Object.entries(TRANSACTION_TYPES).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('');

    console.log('🎉 Simple transaction parsing test completed successfully!');

  } catch (error) {
    console.error('❌ Transaction parsing test failed:', error);
  }
}

testSimpleTransactionParsing();