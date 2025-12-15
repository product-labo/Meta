import { 
  getTrackedWallets,
  getAddressTransactions,
  processWalletTransactions,
  syncAllWallets,
  getWalletSyncStatus
} from '../src/services/walletTrackingService.js';
import pool from '../src/db/db.js';
import { createWallet } from '../src/models/wallet.js';
import { createProject } from '../src/models/project.js';

/**
 * Test suite for blockchain indexer integration
 */

async function testGetTrackedWallets() {
  console.log('\n=== Test: Get Tracked Wallets ===');
  try {
    const wallets = await getTrackedWallets();
    console.log(`✓ Found ${wallets.length} tracked wallets`);
    
    if (wallets.length > 0) {
      console.log('Sample wallet:', {
        id: wallets[0].id,
        address: wallets[0].address,
        type: wallets[0].type
      });
    }
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testGetAddressTransactions() {
  console.log('\n=== Test: Get Address Transactions ===');
  try {
    // Use a known Zcash testnet address for testing
    const testAddress = 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN';
    
    const transactions = await getAddressTransactions(testAddress, 0);
    console.log(`✓ Found ${transactions.length} transactions for address ${testAddress}`);
    
    if (transactions.length > 0) {
      console.log('Sample transaction:', {
        txid: transactions[0].txid,
        block_height: transactions[0].block_height,
        tx_type: transactions[0].tx_type,
        is_shielded: transactions[0].is_shielded
      });
    }
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testProcessWalletTransactions() {
  console.log('\n=== Test: Process Wallet Transactions ===');
  try {
    // Get first tracked wallet
    const wallets = await getTrackedWallets();
    
    if (wallets.length === 0) {
      console.log('⚠ No tracked wallets found. Creating test wallet...');
      
      // Create a test project and wallet
      const testUser = await pool.query(
        `SELECT id FROM users LIMIT 1`
      );
      
      if (testUser.rows.length === 0) {
        console.log('⚠ No users found. Skipping test.');
        return true;
      }
      
      const project = await createProject({
        user_id: testUser.rows[0].id,
        name: 'Test Project for Indexer',
        description: 'Testing blockchain indexer integration',
        category: 'defi',
        status: 'active'
      });
      
      const wallet = await createWallet({
        project_id: project.id,
        address: 't1UnEx5GLUk7Dn1kVCzE5ZCPEYMCCAtqPEN',
        type: 't',
        privacy_mode: 'private',
        network: 'mainnet',
        is_active: true
      });
      
      console.log(`✓ Created test wallet: ${wallet.id}`);
      
      const result = await processWalletTransactions(wallet);
      console.log('✓ Processed transactions:', result);
    } else {
      const wallet = wallets[0];
      console.log(`Processing wallet: ${wallet.id} (${wallet.address})`);
      
      const result = await processWalletTransactions(wallet);
      console.log('✓ Processed transactions:', result);
    }
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testGetWalletSyncStatus() {
  console.log('\n=== Test: Get Wallet Sync Status ===');
  try {
    const wallets = await getTrackedWallets();
    
    if (wallets.length === 0) {
      console.log('⚠ No tracked wallets found. Skipping test.');
      return true;
    }
    
    const wallet = wallets[0];
    const status = await getWalletSyncStatus(wallet.id);
    
    console.log('✓ Wallet sync status:', {
      wallet_id: status.id,
      address: status.address,
      total_transactions: status.total_transactions,
      last_synced_block: status.last_synced_block,
      active_days: status.active_days
    });
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testSyncAllWallets() {
  console.log('\n=== Test: Sync All Wallets ===');
  try {
    console.log('Starting full wallet sync...');
    
    const result = await syncAllWallets();
    
    console.log('✓ Sync completed:', {
      wallets_synced: result.wallets_synced,
      total_transactions: result.total_transactions
    });
    
    if (result.results.length > 0) {
      console.log('Sample result:', result.results[0]);
    }
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testWalletActivityMetrics() {
  console.log('\n=== Test: Wallet Activity Metrics ===');
  try {
    const wallets = await getTrackedWallets();
    
    if (wallets.length === 0) {
      console.log('⚠ No tracked wallets found. Skipping test.');
      return true;
    }
    
    const wallet = wallets[0];
    
    // Check if activity metrics were created
    const metricsResult = await pool.query(
      `SELECT 
        activity_date,
        transaction_count,
        total_volume_zatoshi,
        is_active,
        shielded_count
       FROM wallet_activity_metrics
       WHERE wallet_id = $1
       ORDER BY activity_date DESC
       LIMIT 5`,
      [wallet.id]
    );
    
    console.log(`✓ Found ${metricsResult.rows.length} activity metric records`);
    
    if (metricsResult.rows.length > 0) {
      console.log('Recent metrics:', metricsResult.rows);
    }
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testProcessedTransactions() {
  console.log('\n=== Test: Processed Transactions ===');
  try {
    const wallets = await getTrackedWallets();
    
    if (wallets.length === 0) {
      console.log('⚠ No tracked wallets found. Skipping test.');
      return true;
    }
    
    const wallet = wallets[0];
    
    // Check processed transactions
    const txResult = await pool.query(
      `SELECT 
        txid,
        block_height,
        tx_type,
        tx_subtype,
        value_zatoshi,
        is_shielded
       FROM processed_transactions
       WHERE wallet_id = $1
       ORDER BY block_height DESC
       LIMIT 5`,
      [wallet.id]
    );
    
    console.log(`✓ Found ${txResult.rows.length} processed transactions`);
    
    if (txResult.rows.length > 0) {
      console.log('Recent transactions:', txResult.rows);
    }
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testEventHandling() {
  console.log('\n=== Test: Event Handling ===');
  try {
    const { handleNewBlock, handleNewTransaction } = await import('../src/services/walletTrackingService.js');
    
    // Test handleNewBlock
    console.log('Testing handleNewBlock...');
    const blockResult = await handleNewBlock(1000000, {
      height: 1000000,
      hash: 'test-hash',
      transactionCount: 5
    });
    
    console.log('✓ handleNewBlock executed:', {
      success: blockResult.success,
      wallets_synced: blockResult.wallets_synced
    });
    
    // Test handleNewTransaction
    console.log('Testing handleNewTransaction...');
    const txResult = await handleNewTransaction({
      txid: 'test-txid-123',
      addresses: []
    });
    
    console.log('✓ handleNewTransaction executed:', {
      success: txResult.success,
      affected_wallets: txResult.affected_wallets
    });
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function testIndexerEventEmitter() {
  console.log('\n=== Test: Indexer Event Emitter ===');
  try {
    const { EventEmitter } = await import('events');
    const { startIndexerEventListener, stopIndexerEventListener, getListenerStatus } = await import('../src/services/indexerEventHandler.js');
    
    // Create a mock event emitter
    const mockEvents = new EventEmitter();
    
    // Start listener
    console.log('Starting event listener...');
    startIndexerEventListener(mockEvents, {
      enableBlockEvents: true,
      enableTransactionEvents: false
    });
    
    // Check status
    const status = getListenerStatus();
    console.log('✓ Listener status:', status);
    
    if (!status.isListening) {
      throw new Error('Listener should be active');
    }
    
    // Emit a test event
    console.log('Emitting test block event...');
    mockEvents.emit('blockProcessed', {
      height: 999999,
      hash: 'test-hash',
      transactionCount: 0
    });
    
    // Wait a bit for event processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Stop listener
    console.log('Stopping event listener...');
    stopIndexerEventListener(mockEvents);
    
    const finalStatus = getListenerStatus();
    console.log('✓ Final status:', finalStatus);
    
    if (finalStatus.isListening) {
      throw new Error('Listener should be stopped');
    }
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('BLOCKCHAIN INDEXER INTEGRATION TESTS');
  console.log('========================================');
  
  const tests = [
    { name: 'Get Tracked Wallets', fn: testGetTrackedWallets },
    { name: 'Get Address Transactions', fn: testGetAddressTransactions },
    { name: 'Process Wallet Transactions', fn: testProcessWalletTransactions },
    { name: 'Get Wallet Sync Status', fn: testGetWalletSyncStatus },
    { name: 'Wallet Activity Metrics', fn: testWalletActivityMetrics },
    { name: 'Processed Transactions', fn: testProcessedTransactions },
    { name: 'Event Handling', fn: testEventHandling },
    { name: 'Indexer Event Emitter', fn: testIndexerEventEmitter },
    { name: 'Sync All Wallets', fn: testSyncAllWallets }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`Error running test ${test.name}:`, error.message);
      results.push({ name: test.name, passed: false });
    }
  }
  
  console.log('\n========================================');
  console.log('TEST RESULTS');
  console.log('========================================');
  
  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.name}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\nTotal: ${passedCount}/${totalCount} tests passed`);
  
  // Close database connection
  await pool.end();
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
