import 'dotenv/config';
import { DatabaseManager } from './database/manager';

class DataAnalyzer {
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  async showDataSummary(): Promise<void> {
    console.log('🔍 LISK BLOCKCHAIN DATA ANALYSIS');
    console.log('═'.repeat(50));
    
    // Top active wallets
    const activeWallets = await this.db.query(`
      SELECT from_address, COUNT(*) as tx_count 
      FROM lisk_transactions 
      GROUP BY from_address 
      ORDER BY tx_count DESC LIMIT 5
    `);
    
    console.log('\n📊 TOP ACTIVE WALLETS:');
    activeWallets.rows.forEach((row: any, i: number) => {
      console.log(`${i+1}. ${row.from_address}: ${row.tx_count} transactions`);
    });

    // Contract activity
    const contractActivity = await this.db.query(`
      SELECT contract_address, COUNT(*) as event_count
      FROM lisk_logs 
      GROUP BY contract_address 
      ORDER BY event_count DESC LIMIT 5
    `);
    
    console.log('\n🏗️ MOST ACTIVE CONTRACTS:');
    contractActivity.rows.forEach((row: any, i: number) => {
      console.log(`${i+1}. ${row.contract_address}: ${row.event_count} events`);
    });

    // Recent blocks with high activity
    const busyBlocks = await this.db.query(`
      SELECT block_number, transaction_count, gas_used
      FROM lisk_blocks 
      WHERE transaction_count > 1
      ORDER BY transaction_count DESC LIMIT 5
    `);
    
    console.log('\n⚡ BUSIEST BLOCKS:');
    busyBlocks.rows.forEach((row: any, i: number) => {
      console.log(`${i+1}. Block ${row.block_number}: ${row.transaction_count} txs, ${row.gas_used} gas`);
    });

    // ERC20 transfers
    const erc20Transfers = await this.db.query(`
      SELECT COUNT(*) as transfer_count
      FROM lisk_logs 
      WHERE topic0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    `);
    
    console.log(`\n💰 ERC20 TRANSFERS DETECTED: ${erc20Transfers.rows[0].transfer_count}`);
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}

if (require.main === module) {
  const analyzer = new DataAnalyzer();
  analyzer.showDataSummary().then(() => analyzer.close());
}
