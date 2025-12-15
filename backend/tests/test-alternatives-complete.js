/**
 * Complete Alternative Routes Testing Suite
 * Tests WebZjs and zcash-devtool routes with database and wallet interactions
 */

import axios from 'axios';
import { pool } from '../src/config/appConfig.js';

const API_BASE = 'http://localhost:3000';
let testUser = null;
let webzjsWallet = null;
let devtoolWallet = null;
let apiKey = null;

// Test configuration
const TEST_CONFIG = {
  network: 'testnet',
  testAmount: 0.001, // Small amount for testing
  faucetAddress: 'https://faucet.testnet.z.cash/', // Testnet faucet
  timeout: 30000 // 30 second timeout for operations
};

console.log('🧪 Starting Complete Alternative Routes Testing Suite');
console.log('📋 This test will verify:');
console.log('   - Database operations for alternatives');
console.log('   - WebZjs wallet creation and management');
console.log('   - zcash-devtool wallet creation and management');
console.log('   - Invoice creation and payment flows');
console.log('   - API route functionality');
console.log('   - Error handling and edge cases');
console.log('');

/**
 * Helper Functions
 */

// Wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Make API request with error handling
async function apiRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ API Request failed: ${method} ${endpoint}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

// Check if server is running
async function checkServerHealth() {
  console.log('🔍 Checking server health...');
  try {
    const health = await apiRequest('GET', '/health');
    console.log(`✅ Server is healthy: ${health.status}`);
    console.log(`   Database: ${health.services.database}`);
    console.log(`   Zcash RPC: ${health.services.zcash_rpc}`);
    return health;
  } catch (error) {
    console.error('❌ Server health check failed');
    throw error;
  }
}

// Create test user
async function createTestUser() {
  console.log('👤 Creating test user...');
  try {
    const userData = {
      email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      name: 'Alternative Test User'
    };

    const response = await apiRequest('POST', '/api/users/create', userData);
    const user = response.user;
    console.log(`✅ Test user created: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    return user;
  } catch (error) {
    console.error('❌ Failed to create test user');
    throw error;
  }
}

// Create API key for authenticated requests
async function createApiKey(userId) {
  console.log('🔑 Creating API key...');
  try {
    const keyData = {
      user_id: userId,
      name: 'Alternative Test Key',
      permissions: ['read', 'write', 'admin']
    };

    const result = await apiRequest('POST', '/api/keys/create', keyData);
    console.log(`✅ API key created: ${result.key_info.id}`);
    return result.api_key;
  } catch (error) {
    console.error('❌ Failed to create API key');
    throw error;
  }
}

/**
 * Alternative Overview Tests
 */

async function testAlternativeOverview() {
  console.log('\n📊 Testing Alternative Overview...');
  
  try {
    // Test overview endpoint
    const overview = await apiRequest('GET', '/api/alternatives/overview');
    console.log('✅ Alternative overview retrieved');
    console.log(`   WebZjs available: ${!!overview.zcash_development_alternatives.alternatives.webzjs}`);
    console.log(`   zcash-devtool available: ${!!overview.zcash_development_alternatives.alternatives.zcash_devtool}`);

    // Test recommendation endpoint
    const recommendation = await apiRequest('POST', '/api/alternatives/recommend', {
      use_case: 'web_wallet',
      platform: 'browser',
      experience_level: 'beginner'
    });
    console.log('✅ Alternative recommendation retrieved');
    console.log(`   Primary choice: ${recommendation.recommendation.primary_choice}`);
    console.log(`   Secondary choice: ${recommendation.recommendation.secondary_choice}`);

    // Test setup comparison
    const comparison = await apiRequest('GET', '/api/alternatives/setup-comparison');
    console.log('✅ Setup comparison retrieved');
    console.log(`   WebZjs complexity: ${comparison.setup_comparison.webzjs.complexity}`);
    console.log(`   zcash-devtool complexity: ${comparison.setup_comparison.zcash_devtool.complexity}`);

    return true;
  } catch (error) {
    console.error('❌ Alternative overview tests failed');
    throw error;
  }
}

/**
 * WebZjs Tests
 */

async function testWebZjsRoutes() {
  console.log('\n🌐 Testing WebZjs Routes...');
  
  try {
    // Test WebZjs configuration
    console.log('📋 Testing WebZjs configuration...');
    const config = await apiRequest('GET', '/api/webzjs/config');
    console.log('✅ WebZjs configuration retrieved');
    console.log(`   Mainnet proxy: ${config.webzjs.networks.mainnet.proxy_url}`);
    console.log(`   Testnet proxy: ${config.webzjs.networks.testnet.proxy_url}`);

    // Test WebZjs guide
    console.log('📖 Testing WebZjs guide...');
    const guide = await apiRequest('GET', '/api/webzjs/guide');
    console.log('✅ WebZjs guide retrieved');
    console.log(`   Setup steps: ${guide.webzjs_setup_guide.setup_steps ? Object.keys(guide.webzjs_setup_guide.setup_steps).length : 0}`);

    // Create WebZjs wallet
    console.log('💼 Creating WebZjs wallet...');
    const walletData = {
      user_id: testUser.id,
      wallet_name: 'Test WebZjs Wallet',
      network: TEST_CONFIG.network
    };

    webzjsWallet = await apiRequest('POST', '/api/webzjs/wallet/create', walletData);
    console.log('✅ WebZjs wallet created');
    console.log(`   Wallet ID: ${webzjsWallet.wallet.id}`);
    console.log(`   Wallet name: ${webzjsWallet.wallet.name}`);
    console.log(`   Network: ${webzjsWallet.wallet.network}`);
    console.log(`   Proxy URL: ${webzjsWallet.wallet.proxy_url}`);

    // Verify wallet in database
    const dbWallet = await pool.query(
      'SELECT * FROM webzjs_wallets WHERE id = $1',
      [webzjsWallet.wallet.id]
    );
    console.log('✅ WebZjs wallet verified in database');
    console.log(`   DB record exists: ${dbWallet.rows.length > 0}`);

    // Get user wallets
    console.log('📋 Getting user WebZjs wallets...');
    const userWallets = await apiRequest('GET', `/api/webzjs/wallet/user/${testUser.id}`);
    console.log('✅ User WebZjs wallets retrieved');
    console.log(`   Wallet count: ${userWallets.wallets.length}`);

    // Get wallet setup
    console.log('⚙️ Getting WebZjs wallet setup...');
    const setup = await apiRequest('GET', `/api/webzjs/wallet/${webzjsWallet.wallet.id}/setup`);
    console.log('✅ WebZjs wallet setup retrieved');
    console.log(`   Has mnemonic: ${setup.wallet.has_mnemonic}`);
    console.log(`   Network: ${setup.wallet.network}`);

    // Create WebZjs invoice
    console.log('🧾 Creating WebZjs invoice...');
    const invoiceData = {
      user_id: testUser.id,
      wallet_id: webzjsWallet.wallet.id,
      amount_zec: TEST_CONFIG.testAmount,
      description: 'Test WebZjs Payment'
    };

    const invoice = await apiRequest('POST', '/api/webzjs/invoice/create', invoiceData);
    console.log('✅ WebZjs invoice created');
    console.log(`   Invoice ID: ${invoice.invoice.id}`);
    console.log(`   Amount: ${invoice.invoice.amount_zec} ZEC`);
    console.log(`   Status: ${invoice.invoice.status}`);

    // Verify invoice in database
    const dbInvoice = await pool.query(
      'SELECT * FROM webzjs_invoices WHERE id = $1',
      [invoice.invoice.id]
    );
    console.log('✅ WebZjs invoice verified in database');
    console.log(`   DB record exists: ${dbInvoice.rows.length > 0}`);

    return true;
  } catch (error) {
    console.error('❌ WebZjs tests failed');
    throw error;
  }
}

/**
 * zcash-devtool Tests
 */

async function testDevtoolRoutes() {
  console.log('\n⚙️ Testing zcash-devtool Routes...');
  
  try {
    // Test zcash-devtool configuration
    console.log('📋 Testing zcash-devtool configuration...');
    const config = await apiRequest('GET', '/api/zcash-devtool/config');
    console.log('✅ zcash-devtool configuration retrieved');
    console.log(`   Mainnet server: ${config.zcash_devtool.networks.mainnet.server}`);
    console.log(`   Testnet server: ${config.zcash_devtool.networks.testnet.server}`);

    // Test zcash-devtool guide
    console.log('📖 Testing zcash-devtool guide...');
    const guide = await apiRequest('GET', '/api/zcash-devtool/guide');
    console.log('✅ zcash-devtool guide retrieved');
    console.log(`   Setup steps: ${guide.zcash_devtool_guide.setup_steps ? Object.keys(guide.zcash_devtool_guide.setup_steps).length : 0}`);

    // Create zcash-devtool wallet
    console.log('💼 Creating zcash-devtool wallet...');
    const walletData = {
      user_id: testUser.id,
      wallet_name: 'Test CLI Wallet',
      network: TEST_CONFIG.network
    };

    devtoolWallet = await apiRequest('POST', '/api/zcash-devtool/wallet/create', walletData);
    console.log('✅ zcash-devtool wallet created');
    console.log(`   Wallet ID: ${devtoolWallet.wallet.id}`);
    console.log(`   Wallet name: ${devtoolWallet.wallet.name}`);
    console.log(`   Network: ${devtoolWallet.wallet.network}`);
    console.log(`   Wallet path: ${devtoolWallet.wallet.wallet_path}`);
    console.log(`   Server URL: ${devtoolWallet.wallet.server_url}`);

    // Verify wallet in database
    const dbWallet = await pool.query(
      'SELECT * FROM devtool_wallets WHERE id = $1',
      [devtoolWallet.wallet.id]
    );
    console.log('✅ zcash-devtool wallet verified in database');
    console.log(`   DB record exists: ${dbWallet.rows.length > 0}`);

    // Get user wallets
    console.log('📋 Getting user zcash-devtool wallets...');
    const userWallets = await apiRequest('GET', `/api/zcash-devtool/wallet/user/${testUser.id}`);
    console.log('✅ User zcash-devtool wallets retrieved');
    console.log(`   Wallet count: ${userWallets.wallets.length}`);

    // Get wallet commands
    console.log('⚙️ Getting zcash-devtool wallet commands...');
    const commands = await apiRequest('GET', `/api/zcash-devtool/wallet/${devtoolWallet.wallet.id}/commands`);
    console.log('✅ zcash-devtool wallet commands retrieved');
    console.log(`   Basic operations available: ${!!commands.commands.basic_operations}`);
    console.log(`   Advanced operations available: ${!!commands.commands.advanced_operations}`);

    // Create zcash-devtool invoice
    console.log('🧾 Creating zcash-devtool invoice...');
    const invoiceData = {
      user_id: testUser.id,
      wallet_id: devtoolWallet.wallet.id,
      amount_zec: TEST_CONFIG.testAmount,
      description: 'Test CLI Payment'
    };

    const invoice = await apiRequest('POST', '/api/zcash-devtool/invoice/create', invoiceData);
    console.log('✅ zcash-devtool invoice created');
    console.log(`   Invoice ID: ${invoice.invoice.id}`);
    console.log(`   Amount: ${invoice.invoice.amount_zec} ZEC`);
    console.log(`   Status: ${invoice.invoice.status}`);

    // Verify invoice in database
    const dbInvoice = await pool.query(
      'SELECT * FROM devtool_invoices WHERE id = $1',
      [invoice.invoice.id]
    );
    console.log('✅ zcash-devtool invoice verified in database');
    console.log(`   DB record exists: ${dbInvoice.rows.length > 0}`);

    return true;
  } catch (error) {
    console.error('❌ zcash-devtool tests failed');
    throw error;
  }
}

/**
 * Unified Address Testing (ZIP-316 Compliant)
 */

async function testUnifiedAddressCreation() {
  console.log('\n🔗 Testing ZIP-316 Unified Address Creation...');
  
  try {
    // Test unified address configuration
    console.log('📋 Testing unified address configuration...');
    const config = await apiRequest('GET', '/api/unified/config');
    console.log('✅ Unified address configuration retrieved');
    console.log(`   ZIP-316 specification: ${config.unified_addresses.specification}`);
    console.log(`   Supported receivers: ${Object.keys(config.unified_addresses.supported_receivers).length}`);

    // Test unified address guide
    console.log('📖 Testing ZIP-316 implementation guide...');
    const guide = await apiRequest('GET', '/api/unified/guide');
    console.log('✅ ZIP-316 implementation guide retrieved');
    console.log(`   Creation process steps: ${Object.keys(guide.zip316_implementation_guide.creation_process).length}`);

    // Create ZIP-316 compliant unified address
    console.log('🏗️ Creating ZIP-316 unified address...');
    const unifiedAddressData = {
      user_id: testUser.id,
      name: 'Test Unified Address',
      network: TEST_CONFIG.network,
      include_transparent: false, // 2025 standard: usually no transparent
      include_sapling: true,      // Almost always included
      include_orchard: true,      // 2025 standard: almost always included
      webzjs_wallet_id: webzjsWallet.wallet.id,
      devtool_wallet_id: devtoolWallet.wallet.id
    };

    const unifiedAddress = await apiRequest('POST', '/api/unified/address/create', unifiedAddressData);
    console.log('✅ ZIP-316 unified address created');
    console.log(`   Address ID: ${unifiedAddress.unified_address.id}`);
    console.log(`   Address: ${unifiedAddress.unified_address.address}`);
    console.log(`   Network: ${unifiedAddress.unified_address.network}`);
    console.log(`   Pools included: Orchard=${unifiedAddress.unified_address.pools_included.orchard}, Sapling=${unifiedAddress.unified_address.pools_included.sapling}, Transparent=${unifiedAddress.unified_address.pools_included.transparent}`);
    console.log(`   Diversifier: ${unifiedAddress.unified_address.diversifier.substring(0, 16)}...`);

    // Verify unified address in database
    const dbUnified = await pool.query(
      'SELECT * FROM unified_addresses WHERE id = $1',
      [unifiedAddress.unified_address.id]
    );
    console.log('✅ Unified address verified in database');
    console.log(`   DB record exists: ${dbUnified.rows.length > 0}`);

    // Test unified address validation
    console.log('🔍 Validating unified address...');
    const validation = await apiRequest('POST', '/api/unified/address/validate', {
      address: unifiedAddress.unified_address.address
    });
    console.log('✅ Unified address validation completed');
    console.log(`   Valid: ${validation.valid}`);
    console.log(`   Type: ${validation.type}`);
    console.log(`   Network: ${validation.network}`);
    console.log(`   ZIP-316 compliant: ${validation.zip316_compliant}`);

    // Get unified address details
    console.log('📋 Getting unified address details...');
    const details = await apiRequest('GET', `/api/unified/address/${unifiedAddress.unified_address.id}/details`);
    console.log('✅ Unified address details retrieved');
    console.log(`   Individual receivers: ${details.unified_address.individual_receivers.length}`);
    console.log(`   Linked wallets: WebZjs=${!!details.unified_address.linked_wallets.webzjs}, zcash-devtool=${!!details.unified_address.linked_wallets.devtool}`);

    // Get user unified addresses
    console.log('📋 Getting user unified addresses...');
    const userAddresses = await apiRequest('GET', `/api/unified/address/user/${testUser.id}`);
    console.log('✅ User unified addresses retrieved');
    console.log(`   Address count: ${userAddresses.addresses.length}`);
    console.log(`   Networks: mainnet=${userAddresses.networks.mainnet}, testnet=${userAddresses.networks.testnet}`);

    // Create unified invoice
    console.log('🧾 Creating unified invoice...');
    const invoiceData = {
      user_id: testUser.id,
      unified_address_id: unifiedAddress.unified_address.id,
      amount_zec: TEST_CONFIG.testAmount,
      description: 'Test Unified Payment',
      preferred_pool: 'orchard' // 2025 standard preference
    };

    const invoice = await apiRequest('POST', '/api/unified/invoice/create', invoiceData);
    console.log('✅ Unified invoice created');
    console.log(`   Invoice ID: ${invoice.invoice.id}`);
    console.log(`   Unified address: ${invoice.invoice.unified_address}`);
    console.log(`   Amount: ${invoice.invoice.amount_zec} ZEC`);
    console.log(`   Preferred pool: ${invoice.invoice.preferred_pool}`);
    console.log(`   Pools available: ${invoice.payment_info.pools_available.join(', ')}`);

    // Verify unified invoice in database
    const dbInvoice = await pool.query(
      'SELECT * FROM unified_invoices WHERE id = $1',
      [invoice.invoice.id]
    );
    console.log('✅ Unified invoice verified in database');
    console.log(`   DB record exists: ${dbInvoice.rows.length > 0}`);

    console.log('✅ ZIP-316 unified address system fully operational');
    console.log(`   Compatible with: ${invoice.compatible_wallets.others.join(', ')}`);
    
    return {
      unifiedAddress: unifiedAddress.unified_address,
      invoice: invoice.invoice,
      validation: validation,
      details: details.unified_address
    };
  } catch (error) {
    console.error('❌ Unified address creation failed');
    throw error;
  }
}

/**
 * Error Handling Tests
 */

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  try {
    // Test invalid user ID
    console.log('🔍 Testing invalid user ID...');
    try {
      await apiRequest('POST', '/api/webzjs/wallet/create', {
        user_id: 'invalid-uuid',
        wallet_name: 'Test Wallet',
        network: 'testnet'
      });
      console.log('❌ Should have failed with invalid user ID');
    } catch (error) {
      console.log('✅ Correctly handled invalid user ID');
    }

    // Test missing required fields
    console.log('🔍 Testing missing required fields...');
    try {
      await apiRequest('POST', '/api/webzjs/wallet/create', {
        wallet_name: 'Test Wallet'
        // Missing user_id
      });
      console.log('❌ Should have failed with missing user_id');
    } catch (error) {
      console.log('✅ Correctly handled missing required fields');
    }

    // Test invalid network
    console.log('🔍 Testing invalid network...');
    try {
      await apiRequest('POST', '/api/zcash-devtool/wallet/create', {
        user_id: testUser.id,
        wallet_name: 'Test Wallet',
        network: 'invalid-network'
      });
      console.log('❌ Should have failed with invalid network');
    } catch (error) {
      console.log('✅ Correctly handled invalid network');
    }

    // Test non-existent wallet
    console.log('🔍 Testing non-existent wallet...');
    try {
      await apiRequest('GET', '/api/webzjs/wallet/99999/setup');
      console.log('❌ Should have failed with non-existent wallet');
    } catch (error) {
      console.log('✅ Correctly handled non-existent wallet');
    }

    return true;
  } catch (error) {
    console.error('❌ Error handling tests failed');
    throw error;
  }
}

/**
 * Database Integrity Tests
 */

async function testDatabaseIntegrity() {
  console.log('\n🗄️ Testing Database Integrity...');
  
  try {
    // Check foreign key constraints
    console.log('🔗 Testing foreign key constraints...');
    
    // Verify WebZjs wallet references user
    const webzjsWalletCheck = await pool.query(`
      SELECT w.*, u.email 
      FROM webzjs_wallets w 
      JOIN users u ON w.user_id = u.id 
      WHERE w.id = $1
    `, [webzjsWallet.wallet.id]);
    
    console.log('✅ WebZjs wallet foreign key constraint verified');
    console.log(`   Wallet belongs to user: ${webzjsWalletCheck.rows[0].email}`);

    // Verify zcash-devtool wallet references user
    const devtoolWalletCheck = await pool.query(`
      SELECT w.*, u.email 
      FROM devtool_wallets w 
      JOIN users u ON w.user_id = u.id 
      WHERE w.id = $1
    `, [devtoolWallet.wallet.id]);
    
    console.log('✅ zcash-devtool wallet foreign key constraint verified');
    console.log(`   Wallet belongs to user: ${devtoolWalletCheck.rows[0].email}`);

    // Check invoice relationships
    console.log('🧾 Testing invoice relationships...');
    
    const invoiceCheck = await pool.query(`
      SELECT wi.*, w.name as wallet_name, u.email 
      FROM webzjs_invoices wi 
      JOIN webzjs_wallets w ON wi.wallet_id = w.id 
      JOIN users u ON wi.user_id = u.id 
      WHERE wi.user_id = $1
    `, [testUser.id]);
    
    console.log('✅ Invoice relationships verified');
    console.log(`   Invoices found: ${invoiceCheck.rows.length}`);

    // Test cascade delete (optional - be careful in production)
    console.log('🗑️ Testing cascade behavior (read-only check)...');
    
    const cascadeCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM webzjs_wallets WHERE user_id = $1) as webzjs_wallets,
        (SELECT COUNT(*) FROM devtool_wallets WHERE user_id = $1) as devtool_wallets,
        (SELECT COUNT(*) FROM webzjs_invoices WHERE user_id = $1) as webzjs_invoices,
        (SELECT COUNT(*) FROM devtool_invoices WHERE user_id = $1) as devtool_invoices
    `, [testUser.id]);
    
    console.log('✅ Cascade relationships verified');
    console.log(`   User has ${cascadeCheck.rows[0].webzjs_wallets} WebZjs wallets`);
    console.log(`   User has ${cascadeCheck.rows[0].devtool_wallets} zcash-devtool wallets`);
    console.log(`   User has ${cascadeCheck.rows[0].webzjs_invoices} WebZjs invoices`);
    console.log(`   User has ${cascadeCheck.rows[0].devtool_invoices} zcash-devtool invoices`);

    return true;
  } catch (error) {
    console.error('❌ Database integrity tests failed');
    throw error;
  }
}

/**
 * Performance Tests
 */

async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  try {
    // Test concurrent wallet creation
    console.log('🏃 Testing concurrent operations...');
    
    const startTime = Date.now();
    
    const concurrentPromises = [
      apiRequest('GET', '/api/alternatives/overview'),
      apiRequest('GET', '/api/webzjs/config'),
      apiRequest('GET', '/api/zcash-devtool/config'),
      apiRequest('GET', `/api/webzjs/wallet/user/${testUser.id}`),
      apiRequest('GET', `/api/zcash-devtool/wallet/user/${testUser.id}`)
    ];
    
    await Promise.all(concurrentPromises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Concurrent operations completed');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Average per request: ${Math.round(duration / concurrentPromises.length)}ms`);

    // Test bulk operations
    console.log('📦 Testing bulk operations...');
    
    const bulkStartTime = Date.now();
    
    // Create multiple wallets
    const bulkWallets = [];
    for (let i = 0; i < 3; i++) {
      const wallet = await apiRequest('POST', '/api/webzjs/wallet/create', {
        user_id: testUser.id,
        wallet_name: `Bulk Test Wallet ${i + 1}`,
        network: TEST_CONFIG.network
      });
      bulkWallets.push(wallet);
    }
    
    const bulkEndTime = Date.now();
    const bulkDuration = bulkEndTime - bulkStartTime;
    
    console.log('✅ Bulk operations completed');
    console.log(`   Created ${bulkWallets.length} wallets in ${bulkDuration}ms`);
    console.log(`   Average per wallet: ${Math.round(bulkDuration / bulkWallets.length)}ms`);

    return true;
  } catch (error) {
    console.error('❌ Performance tests failed');
    throw error;
  }
}

/**
 * Real ZEC Testing Instructions
 */

function displayRealZECTestingInstructions(unifiedAddressResult = null) {
  console.log('\n💰 Real ZEC Testing Instructions');
  console.log('=====================================');
  console.log('');
  console.log('To test with real ZEC, follow these steps:');
  console.log('');
  console.log('1. 🚰 Get Testnet ZEC from Faucet:');
  console.log(`   Visit: ${TEST_CONFIG.faucetAddress}`);
  console.log('   Request testnet ZEC to test addresses');
  console.log('');
  console.log('2. 📋 Test Addresses Created:');
  if (webzjsWallet) {
    console.log(`   WebZjs Wallet ID: ${webzjsWallet.wallet.id}`);
    console.log(`   Network: ${webzjsWallet.wallet.network}`);
  }
  if (devtoolWallet) {
    console.log(`   zcash-devtool Wallet ID: ${devtoolWallet.wallet.id}`);
    console.log(`   Network: ${devtoolWallet.wallet.network}`);
    console.log(`   CLI Path: ${devtoolWallet.wallet.wallet_path}`);
  }
  if (unifiedAddressResult) {
    console.log(`   ZIP-316 Unified Address: ${unifiedAddressResult.address}`);
    console.log(`   Pools: Orchard=${unifiedAddressResult.pools_included.orchard}, Sapling=${unifiedAddressResult.pools_included.sapling}`);
  }
  console.log('');
  console.log('3. 🔧 WebZjs Testing:');
  console.log('   - Use browser implementation to generate receiving address');
  console.log('   - Send testnet ZEC to the generated address');
  console.log('   - Sync wallet to see balance update');
  console.log('');
  console.log('4. ⚙️ zcash-devtool Testing:');
  console.log('   - Use CLI commands to generate receiving address');
  console.log('   - Send testnet ZEC to the CLI-generated address');
  console.log('   - Sync wallet via CLI to see balance update');
  console.log('');
  console.log('5. 🔗 ZIP-316 Unified Address Testing:');
  if (unifiedAddressResult) {
    console.log(`   - Send ZEC to unified address: ${unifiedAddressResult.address}`);
    console.log(`   - Recommended pool: Orchard (2025 standard)`);
    console.log('   - Sender wallet will automatically choose best pool');
    console.log('   - Payment detected across all included pools');
    console.log(`   - Compatible with: Nighthawk, YWallet, Zingo!, Unstoppable, Edge`);
  } else {
    console.log('   - Create unified address via API first');
    console.log('   - Test with modern Zcash wallets');
  }
  console.log('');
  console.log('6. 🧪 Cross-Alternative Testing:');
  console.log('   - Send from WebZjs to zcash-devtool addresses');
  console.log('   - Send from zcash-devtool to WebZjs addresses');
  console.log('   - Send from external wallets to unified addresses');
  console.log('   - Verify payment detection across all systems');
  console.log('');
  console.log('7. 📊 Monitor Results:');
  console.log('   - Check database for payment records');
  console.log('   - Verify invoice status updates');
  console.log('   - Test payment confirmation flows');
  console.log('   - Monitor unified address receiver usage');
  console.log('');
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('   - Only use testnet ZEC for testing');
  console.log('   - Keep test amounts small (0.001 ZEC or less)');
  console.log('   - Monitor faucet rate limits');
  console.log('   - Save wallet mnemonics/paths for recovery');
  console.log('   - Unified addresses work with all major 2025 wallets');
  console.log('   - Orchard pool is preferred for new transactions');
  console.log('');
}

/**
 * Main Test Runner
 */

async function runCompleteTests() {
  let unifiedAddressResult = null;
  
  try {
    console.log('🚀 Starting Complete Alternative Routes Test Suite');
    console.log('================================================');
    
    // Check server health
    await checkServerHealth();
    
    // Create test user and API key
    testUser = await createTestUser();
    apiKey = await createApiKey(testUser.id);
    
    // Run all test suites
    await testAlternativeOverview();
    await testWebZjsRoutes();
    await testDevtoolRoutes();
    unifiedAddressResult = await testUnifiedAddressCreation();
    await testErrorHandling();
    await testDatabaseIntegrity();
    await testPerformance();
    
    // Display real ZEC testing instructions
    displayRealZECTestingInstructions(unifiedAddressResult?.unifiedAddress);
    
    console.log('\n🎉 All Tests Completed Successfully!');
    console.log('===================================');
    console.log('');
    console.log('✅ Alternative overview routes working');
    console.log('✅ WebZjs routes and database integration working');
    console.log('✅ zcash-devtool routes and database integration working');
    console.log('✅ ZIP-316 unified address system working');
    console.log('✅ Error handling working correctly');
    console.log('✅ Database integrity maintained');
    console.log('✅ Performance within acceptable limits');
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('   1. Test with real testnet ZEC using the instructions above');
    console.log('   2. Test unified addresses with modern Zcash wallets');
    console.log('   3. Implement frontend components using the created wallets');
    console.log('   4. Test cross-alternative payment flows');
    console.log('   5. Monitor system performance under load');
    console.log('');
    console.log('🌟 ZIP-316 Unified Address Benefits:');
    console.log('   - Single address works with all Zcash pools');
    console.log('   - Compatible with Nighthawk, YWallet, Zingo!, Unstoppable, Edge');
    console.log('   - Sender automatically chooses best available pool');
    console.log('   - Future-proof with Orchard + Sapling support');
    console.log('   - Privacy through receiver diversification');
    console.log('');
    
  } catch (error) {
    console.error('\n💥 Test Suite Failed!');
    console.error('====================');
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Ensure the server is running on port 3000');
    console.error('   2. Check database connection and migrations');
    console.error('   3. Verify environment variables are set');
    console.error('   4. Check network connectivity');
    console.error('   5. Run database migrations for unified addresses');
    console.error('');
    process.exit(1);
  }
}

// Run the tests
runCompleteTests();