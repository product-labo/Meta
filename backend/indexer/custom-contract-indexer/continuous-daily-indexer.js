#!/usr/bin/env node

import dotenv from 'dotenv';
import { Pool } from 'pg';
import UltimateStarknetIndexer from './ultimate-starknet-indexer.js';
import cron from 'node-cron';

dotenv.config();

class ContinuousDailyIndexer {
  constructor() {
    this.indexer = new UltimateStarknetIndexer();
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });
    
    this.contracts = new Map(); // Store contract configurations
    this.isRunning = false;
  }

  // Add contract to continuous monitoring
  addContract(address, chainType = 'auto', options = {}) {
    this.contracts.set(address, {
      address,
      chainType,
      lastIndexedBlock: 0,
      addedAt: new Date(),
      ...options
    });
    console.log(`📝 Added contract ${address} to continuous monitoring`);
  }

  // Get last indexed block for a contract
  async getLastIndexedBlock(address) {
    const result = await this.pool.query(`
      SELECT MAX(block_number) as last_block 
      FROM ultimate_transactions 
      WHERE contract_address = $1
    `, [address.toLowerCase()]);
    
    return result.rows[0]?.last_block || 0;
  }

  // Update contract's last indexed block
  async updateLastIndexedBlock(address, blockNumber) {
    const contract = this.contracts.get(address);
    if (contract) {
      contract.lastIndexedBlock = blockNumber;
    }
  }

  // Index single contract from last known block
  async indexContractIncremental(address) {
    try {
      console.log(`🔄 Starting incremental indexing for ${address}`);
      
      // Get last indexed block from database
      const lastBlock = await this.getLastIndexedBlock(address);
      const startBlock = lastBlock + 1; // Start from next block
      
      console.log(`📊 Resuming from block ${startBlock} for ${address}`);
      
      // Index from last block to current
      const result = await this.indexer.indexContract(address, startBlock);
      
      // Update tracking
      await this.updateLastIndexedBlock(address, result.currentBlock || startBlock);
      
      // Log daily stats
      await this.logDailyStats(address, result);
      
      console.log(`✅ Incremental indexing complete for ${address}`);
      console.log(`   New Events: ${result.events || 0}`);
      console.log(`   New Transactions: ${result.transactions || 0}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Incremental indexing failed for ${address}: ${error.message}`);
      await this.logError(address, error);
    }
  }

  // Run daily indexing for all contracts
  async runDailyIndexing() {
    if (this.isRunning) {
      console.log('⏳ Daily indexing already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log(`\n🌅 Starting daily indexing at ${new Date().toISOString()}`);
    console.log(`📋 Contracts to process: ${this.contracts.size}`);

    const results = [];
    
    for (const [address, config] of this.contracts) {
      try {
        const result = await this.indexContractIncremental(address);
        results.push({ address, success: true, ...result });
        
        // Small delay between contracts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({ address, success: false, error: error.message });
      }
    }

    // Generate daily summary
    await this.generateDailySummary(results);
    
    this.isRunning = false;
    console.log(`🌙 Daily indexing completed at ${new Date().toISOString()}\n`);
  }

  // Log daily statistics
  async logDailyStats(address, result) {
    await this.pool.query(`
      INSERT INTO daily_indexing_stats (
        date, contract_address, chain_type, events_added, 
        transactions_added, blocks_processed, status
      ) VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, 'success')
      ON CONFLICT (date, contract_address) 
      DO UPDATE SET 
        events_added = daily_indexing_stats.events_added + $3,
        transactions_added = daily_indexing_stats.transactions_added + $4,
        blocks_processed = daily_indexing_stats.blocks_processed + $5,
        updated_at = NOW()
    `, [
      address.toLowerCase(),
      result.type || 'unknown',
      result.events || 0,
      result.transactions || 0,
      1000 // Default block range
    ]);
  }

  // Log errors
  async logError(address, error) {
    await this.pool.query(`
      INSERT INTO daily_indexing_stats (
        date, contract_address, status, error_message
      ) VALUES (CURRENT_DATE, $1, 'error', $2)
      ON CONFLICT (date, contract_address) 
      DO UPDATE SET 
        status = 'error',
        error_message = $2,
        updated_at = NOW()
    `, [address.toLowerCase(), error.message]);
  }

  // Generate daily summary report
  async generateDailySummary(results) {
    const summary = {
      date: new Date().toISOString().split('T')[0],
      totalContracts: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalEvents: results.reduce((sum, r) => sum + (r.events || 0), 0),
      totalTransactions: results.reduce((sum, r) => sum + (r.transactions || 0), 0)
    };

    console.log('\n📊 Daily Summary Report:');
    console.log('========================');
    console.log(`Date: ${summary.date}`);
    console.log(`Contracts Processed: ${summary.totalContracts}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Total New Events: ${summary.totalEvents}`);
    console.log(`Total New Transactions: ${summary.totalTransactions}`);

    // Save summary to database
    await this.pool.query(`
      INSERT INTO daily_summary_reports (
        date, total_contracts, successful_contracts, failed_contracts,
        total_events, total_transactions, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (date) DO UPDATE SET
        total_contracts = $2,
        successful_contracts = $3,
        failed_contracts = $4,
        total_events = daily_summary_reports.total_events + $5,
        total_transactions = daily_summary_reports.total_transactions + $6,
        updated_at = NOW()
    `, [
      summary.date, summary.totalContracts, summary.successful,
      summary.failed, summary.totalEvents, summary.totalTransactions
    ]);
  }

  // Initialize database tables for continuous tracking
  async initContinuousDatabase() {
    await this.indexer.initDatabase(); // Initialize main tables

    // Daily stats tracking
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS daily_indexing_stats (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        contract_address VARCHAR(66) NOT NULL,
        chain_type VARCHAR(20) DEFAULT 'unknown',
        events_added INTEGER DEFAULT 0,
        transactions_added INTEGER DEFAULT 0,
        blocks_processed INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date, contract_address)
      );
    `);

    // Daily summary reports
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS daily_summary_reports (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        total_contracts INTEGER DEFAULT 0,
        successful_contracts INTEGER DEFAULT 0,
        failed_contracts INTEGER DEFAULT 0,
        total_events INTEGER DEFAULT 0,
        total_transactions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Contract monitoring registry
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS monitored_contracts (
        id SERIAL PRIMARY KEY,
        contract_address VARCHAR(66) NOT NULL UNIQUE,
        chain_type VARCHAR(20),
        added_at TIMESTAMP DEFAULT NOW(),
        last_indexed_block BIGINT DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      );
    `);

    console.log('✅ Continuous indexing database initialized');
  }

  // Load contracts from database
  async loadMonitoredContracts() {
    const result = await this.pool.query(`
      SELECT contract_address, chain_type, last_indexed_block 
      FROM monitored_contracts 
      WHERE is_active = true
    `);

    for (const row of result.rows) {
      this.contracts.set(row.contract_address, {
        address: row.contract_address,
        chainType: row.chain_type,
        lastIndexedBlock: row.last_indexed_block
      });
    }

    console.log(`📋 Loaded ${result.rows.length} contracts from database`);
  }

  // Save contract to database
  async saveMonitoredContract(address, chainType = 'auto') {
    await this.pool.query(`
      INSERT INTO monitored_contracts (contract_address, chain_type)
      VALUES ($1, $2)
      ON CONFLICT (contract_address) DO UPDATE SET
        chain_type = $2,
        is_active = true
    `, [address.toLowerCase(), chainType]);
  }

  // Start continuous monitoring with cron schedule
  startContinuousMonitoring() {
    console.log('🚀 Starting continuous daily monitoring...');
    
    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.runDailyIndexing();
    });

    // Run every 4 hours for more frequent updates
    cron.schedule('0 */4 * * *', async () => {
      console.log('🔄 Running 4-hour incremental update...');
      await this.runDailyIndexing();
    });

    console.log('⏰ Scheduled daily indexing at 2 AM and every 4 hours');
    console.log('📊 Continuous monitoring is now active');
  }

  // Get monitoring statistics
  async getMonitoringStats() {
    const [contractCount, todayStats, totalStats] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as count FROM monitored_contracts WHERE is_active = true'),
      this.pool.query('SELECT * FROM daily_summary_reports WHERE date = CURRENT_DATE'),
      this.pool.query(`
        SELECT 
          SUM(events_added) as total_events,
          SUM(transactions_added) as total_transactions,
          COUNT(DISTINCT contract_address) as active_contracts
        FROM daily_indexing_stats 
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      `)
    ]);

    return {
      monitoredContracts: contractCount.rows[0].count,
      todayStats: todayStats.rows[0] || {},
      weeklyStats: totalStats.rows[0] || {}
    };
  }
}

// CLI Usage
async function main() {
  const monitor = new ContinuousDailyIndexer();
  await monitor.initContinuousDatabase();
  await monitor.loadMonitoredContracts();

  const command = process.argv[2];
  const address = process.argv[3];

  switch (command) {
    case 'add':
      if (!address) {
        console.log('Usage: node continuous-daily-indexer.js add <contract_address>');
        process.exit(1);
      }
      monitor.addContract(address);
      await monitor.saveMonitoredContract(address);
      console.log(`✅ Added ${address} to continuous monitoring`);
      break;

    case 'run':
      console.log('🔄 Running manual daily indexing...');
      await monitor.runDailyIndexing();
      break;

    case 'start':
      monitor.startContinuousMonitoring();
      console.log('✅ Continuous monitoring started. Press Ctrl+C to stop.');
      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n👋 Stopping continuous monitoring...');
        process.exit(0);
      });
      break;

    case 'stats':
      const stats = await monitor.getMonitoringStats();
      console.log('\n📊 Monitoring Statistics:');
      console.log(JSON.stringify(stats, null, 2));
      break;

    default:
      console.log('🔄 Continuous Daily Indexer');
      console.log('===========================');
      console.log('');
      console.log('Commands:');
      console.log('  add <address>  - Add contract to monitoring');
      console.log('  run           - Run manual indexing now');
      console.log('  start         - Start continuous monitoring');
      console.log('  stats         - Show monitoring statistics');
      console.log('');
      console.log('Examples:');
      console.log('  node continuous-daily-indexer.js add 0x04bb1a742ac72a9a72beebe1f608c508fce6dfa9250b869018b6e157dccb46e8');
      console.log('  node continuous-daily-indexer.js start');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ContinuousDailyIndexer;
