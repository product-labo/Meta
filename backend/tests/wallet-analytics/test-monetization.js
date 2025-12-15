/**
 * Test Monetization and Payment Service
 * Tests payment processing and earnings distribution
 */

import MonetizationService from './src/services/monetizationService.js';

// Mock Zcash Paywall SDK
class MockZcashPaywall {
  constructor() {
    this.users = new MockUsersAPI();
    this.invoices = new MockInvoicesAPI();
    this.withdrawals = new MockWithdrawalsAPI();
  }

  async initialize() {
    return true;
  }
}

class MockUsersAPI {
  constructor() {
    this.users = new Map();
  }

  async getByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    throw new Error('User not found');
  }

  async create({ email, name }) {
    const user = {
      id: `user-${Date.now()}`,
      email,
      name,
      created_at: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }
}

class MockInvoicesAPI {
  constructor() {
    this.invoices = new Map();
  }

  async create({ user_id, type, amount_zec, item_id }) {
    const invoice = {
      id: `invoice-${Date.now()}`,
      user_id,
      type,
      amount_zec,
      item_id,
      z_address: `z1mock${Math.random().toString(36).substring(7)}`,
      qr_code: 'data:image/png;base64,mockqrcode',
      payment_uri: `zcash:z1mock?amount=${amount_zec}`,
      status: 'pending',
      created_at: new Date()
    };
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async checkPayment(invoiceId) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return {
      paid: invoice.status === 'paid',
      invoice: invoice
    };
  }

  // Helper to mark invoice as paid
  markAsPaid(invoiceId, txid) {
    const invoice = this.invoices.get(invoiceId);
    if (invoice) {
      invoice.status = 'paid';
      invoice.paid_at = new Date();
      invoice.paid_txid = txid;
    }
  }
}

class MockWithdrawalsAPI {
  constructor() {
    this.withdrawals = new Map();
  }

  async create({ user_id, to_address, amount_zec }) {
    const withdrawal = {
      id: `withdrawal-${Date.now()}`,
      user_id,
      to_address,
      amount_zec,
      status: 'pending',
      requested_at: new Date()
    };
    this.withdrawals.set(withdrawal.id, withdrawal);
    return withdrawal;
  }
}

// Mock database
class MockDB {
  constructor() {
    this.wallets = new Map();
    this.projects = new Map();
    this.users = new Map();
    this.payments = new Map();
    this.earnings = new Map();
    this.withdrawals = new Map();
    this.tables = new Set();
  }

  async query(sql, params = []) {
    // Handle different query types
    if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      this.tables.add(tableName);
      return { rows: [] };
    }

    if (sql.includes('CREATE INDEX IF NOT EXISTS')) {
      return { rows: [] };
    }

    if (sql.includes('SELECT') && sql.includes('FROM wallets') && sql.includes('WHERE id')) {
      return this.getWallet(params);
    }

    if (sql.includes('SELECT p.user_id') && sql.includes('FROM wallets w')) {
      return this.getWalletOwner(params);
    }

    if (sql.includes('INSERT INTO wallet_data_access_payments')) {
      return this.insertPayment(params);
    }

    if (sql.includes('UPDATE wallet_data_access_payments')) {
      return this.updatePayment(params);
    }

    if (sql.includes('SELECT requester_id, wallet_id, amount_zec')) {
      return this.getPayment(params);
    }

    if (sql.includes('INSERT INTO wallet_owner_earnings')) {
      return this.insertEarnings(params);
    }

    if (sql.includes('SELECT') && sql.includes('FROM wallet_owner_earnings') && sql.includes('SUM')) {
      return this.getEarningsSummary(params);
    }

    if (sql.includes('SELECT email FROM users')) {
      return this.getUser(params);
    }

    if (sql.includes('INSERT INTO wallet_earnings_withdrawals')) {
      return this.insertWithdrawal(params);
    }

    if (sql.includes('UPDATE wallet_owner_earnings') && sql.includes('withdrawn')) {
      return this.markEarningsWithdrawn(params);
    }

    if (sql.includes('SELECT id FROM wallet_data_access_payments') && sql.includes('LIMIT 1')) {
      return this.checkAccess(params);
    }

    if (sql.includes('FROM wallets w') && sql.includes('wallet_activity_metrics')) {
      return this.getMarketplaceListing(params);
    }

    return { rows: [] };
  }

  getWallet(params) {
    const [walletId] = params;
    const wallet = this.wallets.get(walletId);
    return wallet ? { rows: [wallet] } : { rows: [] };
  }

  getWalletOwner(params) {
    const [walletId] = params;
    const wallet = this.wallets.get(walletId);
    if (!wallet) return { rows: [] };
    
    const project = this.projects.get(wallet.project_id);
    return project ? { rows: [{ user_id: project.user_id }] } : { rows: [] };
  }

  insertPayment(params) {
    const [id, requesterId, walletId, invoiceId, amountZec, status] = params;
    this.payments.set(id, {
      id,
      requester_id: requesterId,
      wallet_id: walletId,
      invoice_id: invoiceId,
      amount_zec: amountZec,
      status
    });
    return { rows: [] };
  }

  updatePayment(params) {
    const [txid, invoiceId] = params;
    for (const payment of this.payments.values()) {
      if (payment.invoice_id === invoiceId) {
        payment.status = 'paid';
        payment.paid_txid = txid;
        payment.paid_at = new Date();
      }
    }
    return { rows: [] };
  }

  getPayment(params) {
    const [invoiceId] = params;
    for (const payment of this.payments.values()) {
      if (payment.invoice_id === invoiceId) {
        return { rows: [payment] };
      }
    }
    return { rows: [] };
  }

  insertEarnings(params) {
    const [userId, walletId, amountZec, platformFee] = params;
    const id = `earning-${Date.now()}`;
    this.earnings.set(id, {
      id,
      user_id: userId,
      wallet_id: walletId,
      amount_zec: amountZec,
      platform_fee_zec: platformFee,
      status: 'pending'
    });
    return { rows: [] };
  }

  getEarningsSummary(params) {
    const [userId] = params;
    let totalSales = 0;
    let totalEarnings = 0;
    let totalFees = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;

    for (const earning of this.earnings.values()) {
      if (earning.user_id === userId) {
        totalSales++;
        totalEarnings += parseFloat(earning.amount_zec);
        totalFees += parseFloat(earning.platform_fee_zec);
        
        if (earning.status === 'pending') {
          pendingEarnings += parseFloat(earning.amount_zec);
        } else if (earning.status === 'paid') {
          paidEarnings += parseFloat(earning.amount_zec);
        }
      }
    }

    return {
      rows: [{
        total_sales: totalSales,
        total_earnings: totalEarnings,
        total_fees: totalFees,
        pending_earnings: pendingEarnings,
        paid_earnings: paidEarnings
      }]
    };
  }

  getUser(params) {
    const [userId] = params;
    const user = this.users.get(userId);
    return user ? { rows: [user] } : { rows: [] };
  }

  insertWithdrawal(params) {
    const [userId, withdrawalId, amountZec, toAddress] = params;
    const id = `withdrawal-${Date.now()}`;
    this.withdrawals.set(id, {
      id,
      user_id: userId,
      withdrawal_id: withdrawalId,
      amount_zec: amountZec,
      to_address: toAddress,
      status: 'pending'
    });
    return { rows: [] };
  }

  markEarningsWithdrawn(params) {
    const [userId, amountZec] = params;
    for (const earning of this.earnings.values()) {
      if (earning.user_id === userId && earning.status === 'pending') {
        earning.status = 'withdrawn';
        earning.withdrawn_at = new Date();
      }
    }
    return { rows: [] };
  }

  checkAccess(params) {
    const [requesterId, walletId] = params;
    for (const payment of this.payments.values()) {
      if (payment.requester_id === requesterId && 
          payment.wallet_id === walletId && 
          payment.status === 'paid') {
        return { rows: [payment] };
      }
    }
    return { rows: [] };
  }

  getMarketplaceListing(params) {
    const results = [];
    for (const wallet of this.wallets.values()) {
      if (wallet.privacy_mode === 'monetizable') {
        results.push({
          id: wallet.id,
          type: wallet.type,
          active_days: 10,
          total_transactions: 50,
          avg_productivity_score: 75,
          purchase_count: 0
        });
      }
    }
    return { rows: results };
  }

  // Helper methods
  addWallet(wallet) {
    this.wallets.set(wallet.id, wallet);
  }

  addProject(project) {
    this.projects.set(project.id, project);
  }

  addUser(user) {
    this.users.set(user.id, user);
  }
}

// Test suite
async function runTests() {
  console.log('🧪 Testing Monetization Service\n');

  const db = new MockDB();
  const mockPaywall = new MockZcashPaywall();
  
  // Create service with mock paywall
  const service = new MonetizationService(db, {});
  service.paywall = mockPaywall; // Override with mock

  // Set up test data
  const userId1 = 'user-1';
  const userId2 = 'user-2';
  const projectId1 = 'project-1';
  const walletId1 = 'wallet-1';
  const walletId2 = 'wallet-2';

  db.addUser({ id: userId1, email: 'owner@example.com' });
  db.addUser({ id: userId2, email: 'buyer@example.com' });
  db.addProject({ id: projectId1, user_id: userId1 });
  
  db.addWallet({
    id: walletId1,
    address: 't1abc123',
    type: 't',
    privacy_mode: 'monetizable',
    project_id: projectId1
  });

  db.addWallet({
    id: walletId2,
    address: 'z1def456',
    type: 'z',
    privacy_mode: 'private',
    project_id: projectId1
  });

  // Test 1: Create tables
  console.log('Test 1: Create monetization tables');
  try {
    await service.createTables();
    console.log('✅ Tables created successfully');
    console.log('   Tables:', Array.from(db.tables).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Create data access payment
  console.log('\nTest 2: Create data access payment');
  try {
    const payment = await service.createDataAccessPayment(
      userId2,
      walletId1,
      'buyer@example.com'
    );
    console.log('✅ Payment created');
    console.log('   Invoice ID:', payment.invoice_id);
    console.log('   Amount:', payment.amount_zec, 'ZEC');
    console.log('   Payment address:', payment.payment_address);
    console.log('   Has QR code:', payment.qr_code ? 'YES' : 'NO');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Try to pay for non-monetizable wallet
  console.log('\nTest 3: Try to pay for non-monetizable wallet');
  try {
    await service.createDataAccessPayment(
      userId2,
      walletId2,
      'buyer@example.com'
    );
    console.log('❌ Should have thrown error');
  } catch (error) {
    console.log('✅ Correctly rejected:', error.message);
  }

  // Test 4: Check payment status (unpaid)
  console.log('\nTest 4: Check payment status (unpaid)');
  try {
    const invoiceId = Array.from(mockPaywall.invoices.invoices.keys())[0];
    const status = await service.checkPaymentStatus(invoiceId);
    console.log('✅ Payment status checked');
    console.log('   Paid:', status.paid);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 5: Mark payment as paid and check status
  console.log('\nTest 5: Mark payment as paid and check status');
  try {
    const invoiceId = Array.from(mockPaywall.invoices.invoices.keys())[0];
    mockPaywall.invoices.markAsPaid(invoiceId, 'txid123');
    
    const status = await service.checkPaymentStatus(invoiceId);
    console.log('✅ Payment confirmed');
    console.log('   Paid:', status.paid);
    console.log('   TX ID:', status.paid_txid);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 6: Get owner earnings
  console.log('\nTest 6: Get owner earnings');
  try {
    const earnings = await service.getOwnerEarnings(userId1);
    console.log('✅ Earnings retrieved');
    console.log('   Total sales:', earnings.total_sales);
    console.log('   Total earnings:', earnings.total_earnings_zec, 'ZEC');
    console.log('   Platform fees:', earnings.total_fees_zec, 'ZEC');
    console.log('   Available for withdrawal:', earnings.available_for_withdrawal_zec, 'ZEC');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 7: Request withdrawal
  console.log('\nTest 7: Request withdrawal');
  try {
    const withdrawal = await service.requestWithdrawal(
      userId1,
      't1owneraddress123',
      0.0007
    );
    console.log('✅ Withdrawal requested');
    console.log('   Withdrawal ID:', withdrawal.withdrawal_id);
    console.log('   Amount:', withdrawal.amount_zec, 'ZEC');
    console.log('   To address:', withdrawal.to_address);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 8: Try to withdraw more than available
  console.log('\nTest 8: Try to withdraw more than available');
  try {
    await service.requestWithdrawal(
      userId1,
      't1owneraddress123',
      1.0
    );
    console.log('❌ Should have thrown error');
  } catch (error) {
    console.log('✅ Correctly rejected:', error.message);
  }

  // Test 9: Check if user has access to wallet
  console.log('\nTest 9: Check if user has access to wallet');
  try {
    const hasAccess = await service.hasAccessToWallet(userId2, walletId1);
    console.log('✅ Access checked');
    console.log('   Has access:', hasAccess);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 10: Get marketplace listing
  console.log('\nTest 10: Get marketplace listing');
  try {
    const listing = await service.getMarketplaceListing({ limit: 10 });
    console.log('✅ Marketplace listing retrieved');
    console.log('   Available wallets:', listing.length);
    if (listing.length > 0) {
      console.log('   First wallet type:', listing[0].wallet_type);
      console.log('   Price:', listing[0].price_zec, 'ZEC');
      console.log('   Productivity score:', listing[0].metrics_preview.productivity_score);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 11: Pricing configuration
  console.log('\nTest 11: Pricing configuration');
  console.log('✅ Pricing details:');
  console.log('   Single wallet access:', service.pricing.singleWalletAccess, 'ZEC');
  console.log('   Owner earnings share:', (service.pricing.ownerEarningsShare * 100) + '%');
  console.log('   Platform fee:', (service.pricing.platformFee * 100) + '%');

  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);
