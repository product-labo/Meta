import { DatabaseManager } from '../database/manager';

export class WalletProcessor {
  constructor(private db: DatabaseManager) {}

  async processBlock(blockNumber: number): Promise<void> {
    // Get all addresses from transactions in this block
    const addresses = await this.extractAddressesFromBlock(blockNumber);
    
    // Insert unique addresses
    for (const address of addresses) {
      await this.insertWallet(address);
    }
    
    // Process wallet interactions
    await this.processWalletInteractions(blockNumber);
  }

  private async extractAddressesFromBlock(blockNumber: number): Promise<Set<string>> {
    const addresses = new Set<string>();
    
    // From transactions
    const txResult = await this.db.query(`
      SELECT from_address, to_address FROM transactions WHERE block_number = $1
    `, [blockNumber]);
    
    for (const row of txResult.rows) {
      addresses.add(row.from_address);
      if (row.to_address) addresses.add(row.to_address);
    }
    
    // From execution calls
    const callResult = await this.db.query(`
      SELECT from_address, to_address FROM execution_calls 
      WHERE tx_hash IN (SELECT tx_hash FROM transactions WHERE block_number = $1)
    `, [blockNumber]);
    
    for (const row of callResult.rows) {
      addresses.add(row.from_address);
      addresses.add(row.to_address);
    }
    
    return addresses;
  }

  private async insertWallet(address: string): Promise<void> {
    await this.db.query(`
      INSERT INTO wallets (address, first_seen_block, created_at)
      SELECT $1, 
             (SELECT MIN(block_number) FROM transactions WHERE from_address = $1 OR to_address = $1),
             NOW()
      ON CONFLICT (address) DO NOTHING
    `, [address]);
  }

  private async processWalletInteractions(blockNumber: number): Promise<void> {
    // Insert wallet interactions from transactions
    await this.db.query(`
      INSERT INTO wallet_interactions (
        wallet_address, contract_address, function_selector, tx_hash, block_number, interaction_type
      )
      SELECT 
        t.from_address,
        t.to_address,
        CASE WHEN LENGTH(t.input_data) >= 10 THEN LEFT(t.input_data, 10) ELSE NULL END,
        t.tx_hash,
        t.block_number,
        'transaction'
      FROM transactions t
      WHERE t.block_number = $1 AND t.to_address IS NOT NULL
      ON CONFLICT (wallet_address, tx_hash, interaction_type) DO NOTHING
    `, [blockNumber]);
    
    // Insert wallet interactions from execution calls
    await this.db.query(`
      INSERT INTO wallet_interactions (
        wallet_address, contract_address, function_selector, tx_hash, block_number, interaction_type
      )
      SELECT 
        ec.from_address,
        ec.to_address,
        CASE WHEN LENGTH(ec.input_data) >= 10 THEN LEFT(ec.input_data, 10) ELSE NULL END,
        ec.tx_hash,
        t.block_number,
        'call'
      FROM execution_calls ec
      JOIN transactions t ON ec.tx_hash = t.tx_hash
      WHERE t.block_number = $1
      ON CONFLICT (wallet_address, tx_hash, interaction_type) DO NOTHING
    `, [blockNumber]);
  }
}
