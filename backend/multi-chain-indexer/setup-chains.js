#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function setupChains() {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT || 5432
    });

    try {
        console.log('🔧 Setting up chains with working RPC URLs...');

        // Clear existing chains and add working ones
        await pool.query('DELETE FROM mc_chains');

        const chains = [
            {
                id: 1,
                name: 'ethereum',
                rpc_urls: [process.env.ETHEREUM_RPC],
                chain_id: 1,
                block_time_sec: 12
            },
            {
                id: 2,
                name: 'starknet',
                rpc_urls: [process.env.STARKNET_RPC_PRIMARY, process.env.STARKNET_RPC_FALLBACK].filter(Boolean),
                chain_id: 2,
                block_time_sec: 30
            },
            {
                id: 3,
                name: 'polygon',
                rpc_urls: [process.env.POLYGON_RPC],
                chain_id: 137,
                block_time_sec: 2
            },
            {
                id: 4,
                name: 'bsc',
                rpc_urls: [process.env.BSC_RPC],
                chain_id: 56,
                block_time_sec: 3
            },
            {
                id: 5,
                name: 'arbitrum',
                rpc_urls: [process.env.ARBITRUM_RPC],
                chain_id: 42161,
                block_time_sec: 1
            }
        ];

        for (const chain of chains) {
            if (chain.rpc_urls.length > 0 && chain.rpc_urls[0]) {
                await pool.query(`
                    INSERT INTO mc_chains (id, name, rpc_urls, block_time_sec, is_active)
                    VALUES ($1, $2, $3, $4, true)
                `, [chain.id, chain.name, chain.rpc_urls, chain.block_time_sec]);
                
                console.log(`✅ Added ${chain.name} with ${chain.rpc_urls.length} RPC(s)`);
            } else {
                console.log(`⚠️ Skipped ${chain.name} - no RPC URL configured`);
            }
        }

        console.log('\n🎯 Chains setup complete!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        await pool.end();
    }
}

setupChains();
