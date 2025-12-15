#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT || 5432,
});

const chains = [
  // Mainnets
  { id: 1, name: 'Ethereum', rpc_url: process.env.ETHEREUM_RPC, chain_id: 1 },
  { id: 137, name: 'Polygon', rpc_url: process.env.POLYGON_RPC, chain_id: 137 },
  { id: 56, name: 'BSC', rpc_url: process.env.BSC_RPC, chain_id: 56 },
  { id: 42161, name: 'Arbitrum', rpc_url: process.env.ARBITRUM_RPC, chain_id: 42161 },
  { id: 10, name: 'Optimism', rpc_url: process.env.OPTIMISM_RPC, chain_id: 10 },
  { id: 8453, name: 'Base', rpc_url: process.env.BASE_RPC, chain_id: 8453 },
  { id: 43114, name: 'Avalanche', rpc_url: process.env.AVALANCHE_RPC, chain_id: 43114 },
  { id: 250, name: 'Fantom', rpc_url: process.env.FANTOM_RPC, chain_id: 250 },
  { id: 100, name: 'Gnosis', rpc_url: process.env.GNOSIS_RPC, chain_id: 100 },
  { id: 42220, name: 'Celo', rpc_url: process.env.CELO_RPC, chain_id: 42220 },
  { id: 1284, name: 'Moonbeam', rpc_url: process.env.MOONBEAM_RPC, chain_id: 1284 },
  { id: 1285, name: 'Moonriver', rpc_url: process.env.MOONRIVER_RPC, chain_id: 1285 },
  { id: 25, name: 'Cronos', rpc_url: process.env.CRONOS_RPC, chain_id: 25 },
  { id: 1135, name: 'Lisk', rpc_url: process.env.LISK_MAINNET_RPC, chain_id: 1135 },
  
  // Testnets
  { id: 11155111, name: 'Sepolia', rpc_url: process.env.ETHEREUM_SEPOLIA_RPC, chain_id: 11155111 },
  { id: 17000, name: 'Holesky', rpc_url: process.env.ETHEREUM_HOLESKY_RPC, chain_id: 17000 },
  { id: 80002, name: 'Polygon Amoy', rpc_url: process.env.POLYGON_AMOY_RPC, chain_id: 80002 },
  { id: 97, name: 'BSC Testnet', rpc_url: process.env.BSC_TESTNET_RPC, chain_id: 97 },
  { id: 421614, name: 'Arbitrum Sepolia', rpc_url: process.env.ARBITRUM_SEPOLIA_RPC, chain_id: 421614 },
  { id: 11155420, name: 'Optimism Sepolia', rpc_url: process.env.OPTIMISM_SEPOLIA_RPC, chain_id: 11155420 },
  { id: 84532, name: 'Base Sepolia', rpc_url: process.env.BASE_SEPOLIA_RPC, chain_id: 84532 },
  { id: 43113, name: 'Avalanche Fuji', rpc_url: process.env.AVALANCHE_FUJI_RPC, chain_id: 43113 },
  { id: 4002, name: 'Fantom Testnet', rpc_url: process.env.FANTOM_TESTNET_RPC, chain_id: 4002 },
  { id: 10200, name: 'Gnosis Chiado', rpc_url: process.env.GNOSIS_CHIADO_RPC, chain_id: 10200 },
  { id: 44787, name: 'Celo Alfajores', rpc_url: process.env.CELO_ALFAJORES_RPC, chain_id: 44787 },
  { id: 4202, name: 'Lisk Sepolia', rpc_url: process.env.LISK_SEPOLIA_RPC, chain_id: 4202 },
  
  // Starknet (special handling)
  { id: 9001, name: 'Starknet Mainnet', rpc_url: process.env.STARKNET_RPC_PRIMARY, chain_id: 'SN_MAIN' },
];

async function addChains() {
  console.log('🌐 Adding comprehensive chain coverage...');
  
  try {
    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mc_chains (
        id INTEGER PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        rpc_url TEXT NOT NULL,
        chain_id VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    let added = 0;
    let updated = 0;

    for (const chain of chains) {
      if (!chain.rpc_url) {
        console.log(`⚠️ Skipping ${chain.name} - no RPC URL configured`);
        continue;
      }

      try {
        const result = await pool.query(`
          INSERT INTO mc_chains (id, name, rpc_url, chain_id, is_active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (id) DO UPDATE SET
            name = $2,
            rpc_url = $3,
            chain_id = $4,
            is_active = true,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `, [chain.id, chain.name, chain.rpc_url, chain.chain_id]);

        if (result.rows[0].inserted) {
          console.log(`✅ Added: ${chain.name} (${chain.chain_id})`);
          added++;
        } else {
          console.log(`🔄 Updated: ${chain.name} (${chain.chain_id})`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Failed to add ${chain.name}: ${error.message}`);
      }
    }

    // Show summary
    const totalChains = await pool.query('SELECT COUNT(*) as count FROM mc_chains WHERE is_active = true');
    
    console.log('\n📊 Chain Addition Summary:');
    console.log(`   Added: ${added} chains`);
    console.log(`   Updated: ${updated} chains`);
    console.log(`   Total Active: ${totalChains.rows[0].count} chains`);
    
    // Show all active chains
    const activeChains = await pool.query(`
      SELECT id, name, chain_id FROM mc_chains 
      WHERE is_active = true 
      ORDER BY id
    `);
    
    console.log('\n🌐 Active Chains:');
    for (const chain of activeChains.rows) {
      console.log(`   ${chain.name} (${chain.chain_id}) - ID: ${chain.id}`);
    }

  } catch (error) {
    console.error('❌ Failed to add chains:', error);
  } finally {
    await pool.end();
  }
}

addChains();
