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
  { id: 1, name: 'Ethereum', rpc_url: process.env.ETHEREUM_RPC, chain_id: '1' },
  { id: 137, name: 'Polygon', rpc_url: process.env.POLYGON_RPC, chain_id: '137' },
  { id: 56, name: 'BSC', rpc_url: process.env.BSC_RPC, chain_id: '56' },
  { id: 42161, name: 'Arbitrum', rpc_url: process.env.ARBITRUM_RPC, chain_id: '42161' },
  { id: 10, name: 'Optimism', rpc_url: process.env.OPTIMISM_RPC, chain_id: '10' },
  { id: 8453, name: 'Base', rpc_url: process.env.BASE_RPC, chain_id: '8453' },
  { id: 43114, name: 'Avalanche', rpc_url: process.env.AVALANCHE_RPC, chain_id: '43114' },
  { id: 250, name: 'Fantom', rpc_url: process.env.FANTOM_RPC, chain_id: '250' },
  { id: 100, name: 'Gnosis', rpc_url: process.env.GNOSIS_RPC, chain_id: '100' },
  { id: 25, name: 'Cronos', rpc_url: process.env.CRONOS_RPC, chain_id: '25' },
  { id: 11155111, name: 'Sepolia', rpc_url: process.env.ETHEREUM_SEPOLIA_RPC, chain_id: '11155111' },
  { id: 4202, name: 'Lisk Sepolia', rpc_url: process.env.LISK_SEPOLIA_RPC, chain_id: '4202' },
];

async function addChains() {
  console.log('🌐 Adding multi-chain streaming coverage...');
  
  try {
    let added = 0;
    
    for (const chain of chains) {
      if (!chain.rpc_url) {
        console.log(`⚠️ Skipping ${chain.name} - no RPC configured`);
        continue;
      }

      try {
        await pool.query(`
          UPDATE mc_chains 
          SET rpc_url = $1, chain_id = $2, is_active = true
          WHERE id = $3
        `, [chain.rpc_url, chain.chain_id, chain.id]);

        const result = await pool.query(`
          INSERT INTO mc_chains (id, name, rpc_url, chain_id, is_active)
          SELECT $1, $2, $3, $4, true
          WHERE NOT EXISTS (SELECT 1 FROM mc_chains WHERE id = $1)
        `, [chain.id, chain.name, chain.rpc_url, chain.chain_id]);

        console.log(`✅ ${chain.name} (${chain.chain_id}) - RPC configured`);
        added++;
      } catch (error) {
        console.error(`❌ ${chain.name}: ${error.message}`);
      }
    }

    const totalChains = await pool.query(`
      SELECT COUNT(*) as count FROM mc_chains 
      WHERE is_active = true AND rpc_url IS NOT NULL
    `);
    
    console.log('\n📊 Multi-Chain Streaming Setup:');
    console.log(`   Configured: ${added} chains`);
    console.log(`   Total Active: ${totalChains.rows[0].count} chains`);
    
    const activeChains = await pool.query(`
      SELECT name, chain_id, rpc_url FROM mc_chains 
      WHERE is_active = true AND rpc_url IS NOT NULL
      ORDER BY id
    `);
    
    console.log('\n🌐 Streaming-Ready Chains:');
    for (const chain of activeChains.rows) {
      const rpcDomain = new URL(chain.rpc_url).hostname;
      console.log(`   ${chain.name} (${chain.chain_id}) - ${rpcDomain}`);
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await pool.end();
  }
}

addChains();
