import { Database } from '../database/Database';
import { LiskUnifiedProcessor } from '../services/LiskUnifiedProcessor';
import { logger } from '../utils/logger';

export class ConnectIndexersToUnified {
  private db: Database;
  private liskProcessor: LiskUnifiedProcessor;

  constructor() {
    this.db = new Database({
      host: 'localhost',
      port: 5432,
      database: 'david',
      user: 'david_user',
      password: 'Davidsoyaya@1015'
    });
    this.liskProcessor = new LiskUnifiedProcessor(this.db);
  }

  async connectLiskIndexer(): Promise<void> {
    logger.info('🔗 Connecting Lisk indexer to unified database...');

    try {
      await this.db.connect();

      // Set up trigger to automatically process new Lisk data
      await this.db.query(`
        -- Create function to process new Lisk transactions
        CREATE OR REPLACE FUNCTION process_new_lisk_transaction()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Insert into unified transactions table
          INSERT INTO transactions (
            chain_id, tx_hash, block_number, block_timestamp,
            from_address, to_address, value, gas_limit, gas_used,
            gas_price, transaction_fee, status, input_data, chain_specific_data
          ) VALUES (
            1, NEW.tx_hash, NEW.block_number, 
            CASE WHEN NEW.block_timestamp IS NOT NULL THEN NEW.block_timestamp ELSE NOW() END,
            NEW.from_address, NEW.to_address, COALESCE(NEW.value, 0),
            NEW.gas_limit, COALESCE(NEW.gas_used, 0), COALESCE(NEW.gas_price, 0),
            COALESCE(NEW.gas_fee, 0), COALESCE(NEW.status, 'success'), NEW.input_data,
            jsonb_build_object(
              'nonce', NEW.nonce,
              'transaction_index', NEW.transaction_index,
              'max_fee_per_gas', NEW.max_fee_per_gas,
              'max_priority_fee_per_gas', NEW.max_priority_fee_per_gas
            )
          ) ON CONFLICT (chain_id, tx_hash) DO NOTHING;

          -- Ensure wallets exist
          INSERT INTO wallets (wallet_address, chain_id, first_seen_block, first_seen_date)
          VALUES (NEW.from_address, 1, NEW.block_number, COALESCE(NEW.block_timestamp, NOW()))
          ON CONFLICT (chain_id, wallet_address) DO UPDATE SET
            last_activity_date = NOW(),
            total_transactions = wallets.total_transactions + 1;

          IF NEW.to_address IS NOT NULL THEN
            INSERT INTO wallets (wallet_address, chain_id, first_seen_block, first_seen_date, wallet_type)
            VALUES (NEW.to_address, 1, NEW.block_number, COALESCE(NEW.block_timestamp, NOW()), 'Contract')
            ON CONFLICT (chain_id, wallet_address) DO UPDATE SET
              last_activity_date = NOW();
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger for new Lisk transactions
        DROP TRIGGER IF EXISTS lisk_to_unified_trigger ON lisk_transactions;
        CREATE TRIGGER lisk_to_unified_trigger
          AFTER INSERT ON lisk_transactions
          FOR EACH ROW EXECUTE FUNCTION process_new_lisk_transaction();
      `);

      // Set up trigger for Lisk contracts
      await this.db.query(`
        -- Create function to process new Lisk contracts
        CREATE OR REPLACE FUNCTION process_new_lisk_contract()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO contracts (
            chain_id, contract_address, deployer_address, deployment_tx_hash,
            deployment_block_number, contract_type, abi_hash, bytecode_hash
          ) VALUES (
            1, NEW.contract_address, NEW.deployer_address, NEW.deployment_tx_hash,
            NEW.deployment_block_number, 'Smart Contract', NEW.code_hash, NEW.code_hash
          ) ON CONFLICT (chain_id, contract_address) DO UPDATE SET
            deployer_address = EXCLUDED.deployer_address,
            deployment_tx_hash = EXCLUDED.deployment_tx_hash,
            deployment_block_number = EXCLUDED.deployment_block_number;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger for new Lisk contracts
        DROP TRIGGER IF EXISTS lisk_contracts_to_unified_trigger ON lisk_contracts;
        CREATE TRIGGER lisk_contracts_to_unified_trigger
          AFTER INSERT ON lisk_contracts
          FOR EACH ROW EXECUTE FUNCTION process_new_lisk_contract();
      `);

      logger.info('✅ Lisk indexer connected to unified database with triggers');
    } catch (error) {
      logger.error('❌ Error connecting Lisk indexer:', error);
    }
  }

  async connectStarknetIndexer(): Promise<void> {
    logger.info('🔗 Connecting Starknet indexer to unified database...');

    try {
      // Set up trigger for Starknet transactions
      await this.db.query(`
        -- Create function to process new Starknet transactions
        CREATE OR REPLACE FUNCTION process_new_starknet_transaction()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO transactions (
            chain_id, tx_hash, block_number, block_timestamp,
            from_address, to_address, value, gas_limit, gas_used,
            gas_price, transaction_fee, status, input_data, chain_specific_data
          ) VALUES (
            2, NEW.tx_hash, NEW.block_number, 
            CASE WHEN NEW.block_timestamp IS NOT NULL THEN NEW.block_timestamp ELSE NOW() END,
            NEW.from_address, NEW.to_address, COALESCE(NEW.value, 0),
            COALESCE(NEW.max_fee, 0), COALESCE(NEW.actual_fee, 0), COALESCE(NEW.max_fee, 0),
            COALESCE(NEW.actual_fee, 0), COALESCE(NEW.execution_status, 'success'), 
            NEW.calldata::text,
            jsonb_build_object(
              'nonce', NEW.nonce,
              'version', NEW.version,
              'signature', NEW.signature,
              'execution_status', NEW.execution_status
            )
          ) ON CONFLICT (chain_id, tx_hash) DO NOTHING;

          -- Ensure wallets exist
          INSERT INTO wallets (wallet_address, chain_id, first_seen_block, first_seen_date)
          VALUES (NEW.from_address, 2, NEW.block_number, COALESCE(NEW.block_timestamp, NOW()))
          ON CONFLICT (chain_id, wallet_address) DO UPDATE SET
            last_activity_date = NOW(),
            total_transactions = wallets.total_transactions + 1;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger for new Starknet transactions
        DROP TRIGGER IF EXISTS starknet_to_unified_trigger ON starknet_transactions;
        CREATE TRIGGER starknet_to_unified_trigger
          AFTER INSERT ON starknet_transactions
          FOR EACH ROW EXECUTE FUNCTION process_new_starknet_transaction();
      `);

      logger.info('✅ Starknet indexer connected to unified database with triggers');
    } catch (error) {
      logger.error('❌ Error connecting Starknet indexer:', error);
    }
  }

  async run(): Promise<void> {
    await this.connectLiskIndexer();
    await this.connectStarknetIndexer();
    
    logger.info('🎉 Both indexers now connected to unified multi-chain database!');
    logger.info('📊 New data will automatically flow into unified tables');
    
    await this.db.disconnect();
  }
}

// Run the connection script
const connector = new ConnectIndexersToUnified();
connector.run().catch(console.error);
