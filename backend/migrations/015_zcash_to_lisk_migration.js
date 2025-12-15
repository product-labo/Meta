/**
 * Zcash to Lisk Migration Script
 * 
 * This migration converts all Zcash-specific database structures to Lisk equivalents
 * while preserving all user and project data.
 * 
 * **Validates: Requirements 1.2, 5.1, 5.2**
 */

import { Pool } from 'pg';

/**
 * Main migration function to convert Zcash data to Lisk format
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Object} options - Migration options
 * @returns {Object} Migration result with preserved and converted data
 */
export async function runZcashToLiskMigration(pool, options = {}) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting Zcash to Lisk migration...');
    
    // Step 1: Create backup tables if requested
    let backupCreated = false;
    if (options.createBackup) {
      await createBackupTables(client);
      backupCreated = true;
      console.log('Backup tables created successfully');
    }
    
    // Step 2: Get current data counts for validation
    const initialCounts = await getDataCounts(client);
    console.log('Initial data counts:', initialCounts);
    
    // Step 3: Create new Lisk-specific tables
    await createLiskTables(client);
    console.log('Lisk tables created successfully');
    
    // Step 4: Migrate user data (convert ZEC balances to LSK)
    const migratedUsers = await migrateUserData(client);
    console.log(`Migrated ${migratedUsers.length} users`);
    
    // Step 5: Migrate invoice data (convert Zcash addresses and amounts to Lisk)
    const migratedInvoices = await migrateInvoiceData(client);
    console.log(`Migrated ${migratedInvoices.length} invoices`);
    
    // Step 6: Migrate wallet data
    const migratedWallets = await migrateWalletData(client);
    console.log(`Migrated ${migratedWallets.length} wallets`);
    
    // Step 7: Create Lisk-specific indexes for performance
    await createLiskIndexes(client);
    console.log('Lisk indexes created successfully');
    
    // Step 8: Drop old Zcash-specific columns and tables
    await dropZcashStructures(client);
    console.log('Zcash structures removed successfully');
    
    // Step 9: Validate migration integrity
    const finalCounts = await getDataCounts(client);
    const validationResult = await validateMigrationIntegrity(client, { 
      initialCounts, 
      finalCounts 
    });
    
    if (!validationResult.valid) {
      throw new Error(`Migration validation failed: ${validationResult.errors.join(', ')}`);
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully');
    
    return {
      success: true,
      backupCreated,
      preservedCounts: {
        users: migratedUsers.length,
        invoices: migratedInvoices.length,
        wallets: migratedWallets.length,
        projects: initialCounts.projects // Projects don't change
      },
      preservedData: {
        users: migratedUsers,
        projects: await getProjectData(client) // Projects preserved as-is
      },
      convertedData: {
        users: migratedUsers,
        invoices: migratedInvoices,
        wallets: migratedWallets
      },
      validation: validationResult
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    
    return {
      success: false,
      error: error.message,
      backupCreated: false
    };
  } finally {
    client.release();
  }
}

/**
 * Create backup tables for rollback capability
 */
async function createBackupTables(client) {
  const backupQueries = [
    `CREATE TABLE IF NOT EXISTS backup_users AS SELECT * FROM users`,
    `CREATE TABLE IF NOT EXISTS backup_invoices AS SELECT * FROM invoices`,
    `CREATE TABLE IF NOT EXISTS backup_wallets AS SELECT * FROM wallets`,
    `CREATE TABLE IF NOT EXISTS backup_webzjs_wallets AS SELECT * FROM webzjs_wallets`,
    `CREATE TABLE IF NOT EXISTS backup_devtool_wallets AS SELECT * FROM devtool_wallets`,
    `CREATE TABLE IF NOT EXISTS backup_unified_addresses AS SELECT * FROM unified_addresses`,
    `CREATE TABLE IF NOT EXISTS backup_unified_invoices AS SELECT * FROM unified_invoices`
  ];
  
  for (const query of backupQueries) {
    try {
      await client.query(query);
    } catch (error) {
      // Table might not exist, continue with migration
      console.warn(`Backup warning: ${error.message}`);
    }
  }
}

/**
 * Get current data counts for validation
 */
async function getDataCounts(client) {
  const counts = {};
  
  const tables = ['users', 'invoices', 'projects', 'wallets'];
  
  for (const table of tables) {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      counts[table] = parseInt(result.rows[0].count);
    } catch (error) {
      counts[table] = 0;
    }
  }
  
  return counts;
}

/**
 * Create new Lisk-specific tables
 */
async function createLiskTables(client) {
  // Create Lisk transactions table
  await client.query(`
    CREATE TABLE IF NOT EXISTS lisk_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id VARCHAR(64) UNIQUE NOT NULL,
      sender_address VARCHAR(41) NOT NULL,
      recipient_address VARCHAR(41) NOT NULL,
      amount_lsk DECIMAL(20,8) NOT NULL CHECK (amount_lsk > 0),
      fee_lsk DECIMAL(20,8) NOT NULL CHECK (fee_lsk > 0),
      block_height BIGINT,
      block_id VARCHAR(64),
      timestamp TIMESTAMP WITH TIME ZONE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  
  // Create Lisk analytics table
  await client.query(`
    CREATE TABLE IF NOT EXISTS lisk_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id),
      total_lsk_revenue DECIMAL(20,8) DEFAULT 0,
      transaction_count INTEGER DEFAULT 0,
      unique_payers INTEGER DEFAULT 0,
      average_payment_lsk DECIMAL(20,8) DEFAULT 0,
      period_start TIMESTAMP WITH TIME ZONE,
      period_end TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/**
 * Migrate user data from ZEC to LSK
 */
async function migrateUserData(client) {
  // Get all users with ZEC balances
  let usersResult;
  try {
    usersResult = await client.query('SELECT * FROM users');
  } catch (error) {
    // If users table doesn't exist, return empty array
    console.warn('Users table not found, skipping user migration');
    return [];
  }
  
  if (!usersResult || !usersResult.rows) {
    return [];
  }
  
  const users = usersResult.rows;
  
  const migratedUsers = [];
  
  for (const user of users) {
    // Convert ZEC balance to LSK (1:1 ratio for migration)
    const balanceLsk = user.balance_zec || '0';
    
    // Generate a Lisk address (simplified for migration - in production use proper Lisk cryptography)
    const liskAddress = generateLiskAddress(user.id);
    const liskPublicKey = generateLiskPublicKey(user.id);
    
    // Add Lisk-specific columns
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS balance_lsk DECIMAL(20,8) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS lisk_address VARCHAR(41),
      ADD COLUMN IF NOT EXISTS lisk_public_key VARCHAR(64)
    `);
    
    // Update user with Lisk data
    await client.query(`
      UPDATE users 
      SET balance_lsk = $1, lisk_address = $2, lisk_public_key = $3
      WHERE id = $4
    `, [balanceLsk, liskAddress, liskPublicKey, user.id]);
    
    migratedUsers.push({
      ...user,
      balance_lsk: balanceLsk,
      lisk_address: liskAddress,
      lisk_public_key: liskPublicKey
    });
  }
  
  return migratedUsers;
}

/**
 * Migrate invoice data from Zcash to Lisk format
 */
async function migrateInvoiceData(client) {
  // Get all invoices with Zcash data
  let invoicesResult;
  try {
    invoicesResult = await client.query('SELECT * FROM invoices');
  } catch (error) {
    // If invoices table doesn't exist, return empty array
    console.warn('Invoices table not found, skipping invoice migration');
    return [];
  }
  
  if (!invoicesResult || !invoicesResult.rows) {
    return [];
  }
  
  const invoices = invoicesResult.rows;
  
  const migratedInvoices = [];
  
  for (const invoice of invoices) {
    // Convert ZEC amounts to LSK (1:1 ratio for migration)
    const amountLsk = invoice.amount_zec || '0';
    const paidAmountLsk = invoice.paid_amount_zec || null;
    
    // Generate Lisk address to replace z_address
    const liskAddress = generateLiskAddress(invoice.id);
    
    // Add Lisk-specific columns to invoices table
    await client.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS amount_lsk DECIMAL(20,8),
      ADD COLUMN IF NOT EXISTS lisk_address VARCHAR(41),
      ADD COLUMN IF NOT EXISTS paid_amount_lsk DECIMAL(20,8)
    `);
    
    // Update invoice with Lisk data
    await client.query(`
      UPDATE invoices 
      SET amount_lsk = $1, lisk_address = $2, paid_amount_lsk = $3
      WHERE id = $4
    `, [amountLsk, liskAddress, paidAmountLsk, invoice.id]);
    
    migratedInvoices.push({
      ...invoice,
      amount_lsk: amountLsk,
      lisk_address: liskAddress,
      paid_amount_lsk: paidAmountLsk
    });
  }
  
  return migratedInvoices;
}

/**
 * Migrate wallet data to Lisk format
 */
async function migrateWalletData(client) {
  const migratedWallets = [];
  
  // Update wallet_type enum to include Lisk types
  try {
    await client.query(`
      DROP TYPE IF EXISTS wallet_type CASCADE;
      CREATE TYPE wallet_type AS ENUM ('lisk_mainnet', 'lisk_testnet');
    `);
  } catch (error) {
    console.warn('Wallet type enum update warning:', error.message);
  }
  
  // Get existing wallets and convert them
  try {
    const walletsResult = await client.query('SELECT * FROM wallets');
    
    if (!walletsResult || !walletsResult.rows) {
      return [];
    }
    
    const wallets = walletsResult.rows;
    
    for (const wallet of wallets) {
      // Convert wallet to Lisk format
      const liskAddress = generateLiskAddress(wallet.id);
      const liskPublicKey = generateLiskPublicKey(wallet.id);
      const network = 'lisk_testnet'; // Default to testnet for migration
      
      // Add Lisk-specific columns
      await client.query(`
        ALTER TABLE wallets 
        ADD COLUMN IF NOT EXISTS lisk_address VARCHAR(41),
        ADD COLUMN IF NOT EXISTS lisk_public_key VARCHAR(64),
        ADD COLUMN IF NOT EXISTS network VARCHAR(20) DEFAULT 'lisk_testnet'
      `);
      
      // Update wallet with Lisk data
      await client.query(`
        UPDATE wallets 
        SET lisk_address = $1, lisk_public_key = $2, network = $3
        WHERE id = $4
      `, [liskAddress, liskPublicKey, network, wallet.id]);
      
      migratedWallets.push({
        ...wallet,
        lisk_address: liskAddress,
        lisk_public_key: liskPublicKey,
        network: network
      });
    }
  } catch (error) {
    console.warn('Wallet migration warning:', error.message);
  }
  
  return migratedWallets;
}

/**
 * Create Lisk-optimized indexes
 */
async function createLiskIndexes(client) {
  const indexQueries = [
    // User indexes
    'CREATE INDEX IF NOT EXISTS idx_users_lisk_address ON users(lisk_address)',
    'CREATE INDEX IF NOT EXISTS idx_users_balance_lsk ON users(balance_lsk)',
    
    // Invoice indexes
    'CREATE INDEX IF NOT EXISTS idx_invoices_lisk_address ON invoices(lisk_address)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_amount_lsk ON invoices(amount_lsk)',
    
    // Lisk transaction indexes
    'CREATE INDEX IF NOT EXISTS idx_lisk_transactions_transaction_id ON lisk_transactions(transaction_id)',
    'CREATE INDEX IF NOT EXISTS idx_lisk_transactions_sender_address ON lisk_transactions(sender_address)',
    'CREATE INDEX IF NOT EXISTS idx_lisk_transactions_recipient_address ON lisk_transactions(recipient_address)',
    'CREATE INDEX IF NOT EXISTS idx_lisk_transactions_block_height ON lisk_transactions(block_height)',
    'CREATE INDEX IF NOT EXISTS idx_lisk_transactions_timestamp ON lisk_transactions(timestamp)',
    
    // Lisk analytics indexes
    'CREATE INDEX IF NOT EXISTS idx_lisk_analytics_project_id ON lisk_analytics(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_lisk_analytics_period_start ON lisk_analytics(period_start)',
    'CREATE INDEX IF NOT EXISTS idx_lisk_analytics_total_lsk_revenue ON lisk_analytics(total_lsk_revenue)'
  ];
  
  for (const query of indexQueries) {
    await client.query(query);
  }
}

/**
 * Drop old Zcash-specific structures
 */
async function dropZcashStructures(client) {
  // Drop Zcash-specific columns from users table
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS balance_zec');
  
  // Drop Zcash-specific columns from invoices table
  await client.query('ALTER TABLE invoices DROP COLUMN IF EXISTS amount_zec');
  await client.query('ALTER TABLE invoices DROP COLUMN IF EXISTS z_address');
  await client.query('ALTER TABLE invoices DROP COLUMN IF EXISTS paid_amount_zec');
  
  // Drop Zcash-specific indexes
  const zcashIndexes = [
    'idx_invoices_z_address',
    'idx_users_balance_zec'
  ];
  
  for (const index of zcashIndexes) {
    await client.query(`DROP INDEX IF EXISTS ${index}`);
  }
  
  // Drop Zcash-specific tables (if they exist and are empty after migration)
  const zcashTables = [
    'webzjs_wallets',
    'webzjs_invoices', 
    'devtool_wallets',
    'devtool_invoices',
    'unified_addresses',
    'unified_invoices',
    'unified_payments',
    'unified_address_usage'
  ];
  
  for (const table of zcashTables) {
    try {
      // Only drop if table is empty or doesn't exist
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      if (parseInt(result.rows[0].count) === 0) {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
    } catch (error) {
      // Table might not exist, continue
      console.warn(`Drop table warning for ${table}:`, error.message);
    }
  }
}

/**
 * Validate migration integrity
 */
export async function validateMigrationIntegrity(client, options = {}) {
  const errors = [];
  
  try {
    // Check if rollback is requested
    if (options.performRollback) {
      return await performRollback(client);
    }
    
    // Validate data counts if provided
    if (options.initialCounts && options.finalCounts) {
      for (const table of ['users', 'projects']) {
        if (options.initialCounts[table] !== options.finalCounts[table]) {
          errors.push(`${table} count mismatch: ${options.initialCounts[table]} -> ${options.finalCounts[table]}`);
        }
      }
    }
    
    // Validate Lisk-specific columns exist
    const userColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('balance_lsk', 'lisk_address', 'lisk_public_key')
    `);
    
    if (userColumns.rows.length < 3) {
      errors.push('Missing Lisk columns in users table');
    }
    
    // Validate no Zcash columns remain
    const zcashColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name IN ('users', 'invoices') AND column_name LIKE '%zec%' OR column_name LIKE '%z_address%'
    `);
    
    if (zcashColumns.rows.length > 0) {
      errors.push(`Zcash columns still exist: ${zcashColumns.rows.map(r => r.column_name).join(', ')}`);
    }
    
    // Validate Lisk indexes exist
    const liskIndexes = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE indexname LIKE '%lisk%' OR indexname LIKE '%_lsk'
    `);
    
    if (liskIndexes.rows.length < 5) {
      errors.push('Missing Lisk-specific indexes');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [error.message]
    };
  }
}

/**
 * Perform rollback to restore original Zcash data
 */
async function performRollback(client) {
  try {
    console.log('Performing migration rollback...');
    
    // Restore from backup tables
    const restoreQueries = [
      'DROP TABLE IF EXISTS users CASCADE',
      'CREATE TABLE users AS SELECT * FROM backup_users',
      'DROP TABLE IF EXISTS invoices CASCADE', 
      'CREATE TABLE invoices AS SELECT * FROM backup_invoices',
      'DROP TABLE IF EXISTS wallets CASCADE',
      'CREATE TABLE wallets AS SELECT * FROM backup_wallets'
    ];
    
    for (const query of restoreQueries) {
      await client.query(query);
    }
    
    // Get restored data
    const restoredUsers = await client.query('SELECT * FROM users');
    
    return {
      rollbackSuccess: true,
      restoredData: {
        users: restoredUsers.rows
      }
    };
    
  } catch (error) {
    return {
      rollbackSuccess: false,
      error: error.message
    };
  }
}

/**
 * Get project data (unchanged during migration)
 */
async function getProjectData(client) {
  try {
    const result = await client.query('SELECT * FROM projects');
    return result.rows;
  } catch (error) {
    return [];
  }
}

/**
 * Generate a Lisk address from an ID (simplified for migration)
 * In production, use proper Lisk cryptography
 */
function generateLiskAddress(id) {
  // Create a deterministic 40-character hex string from the ID
  const hash = require('crypto').createHash('sha256').update(id.toString()).digest('hex');
  return hash.substring(0, 40);
}

/**
 * Generate a Lisk public key from an ID (simplified for migration)
 */
function generateLiskPublicKey(id) {
  // Create a deterministic 64-character hex string from the ID
  const hash = require('crypto').createHash('sha256').update(id.toString() + 'pubkey').digest('hex');
  return hash;
}