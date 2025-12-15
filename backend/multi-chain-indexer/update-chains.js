#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function updateChains() {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT || 5432
    });

    try {
        console.log('🔧 Updating chains with working RPC URLs...');

        // First, deactivate all chains
        await pool.query('UPDATE mc_chains SET is_active = false');

        const chainUpdates = [
            {
                name: 'ethereum',
                rpc_urls: [process.env.ETHEREUM_RPC],
                block_time_sec: 12
            },
            {
                name: 'starknet',
                rpc_urls: [process.env.STARKNET_RPC_PRIMARY, process.env.STARKNET_RPC_FALLBACK].filter(Boolean),
                block_time_sec: 30
            },
            {
                name: 'polygon',
                rpc_urls: [process.env.POLYGON_RPC],
                block_time_sec: 2
            },
            {
                name: 'bsc',
                rpc_urls: [process.env.BSC_RPC],
                block_time_sec: 3
            },
            {
                name: 'arbitrum',
                rpc_urls: [process.env.ARBITRUM_RPC],
                block_time_sec: 1
            }
        ];

        for (const chain of chainUpdates) {
            if (chain.rpc_urls.length > 0 && chain.rpc_urls[0]) {
                const result = await pool.query(`
                    UPDATE mc_chains 
                    SET rpc_urls = $1, block_time_sec = $2, is_active = true
                    WHERE name = $3
                `, [chain.rpc_urls, chain.block_time_sec, chain.name]);
                
                if (result.rowCount > 0) {
                    console.log(`✅ Updated ${chain.name} with ${chain.rpc_urls.length} RPC(s)`);
                } else {
                    // Insert if doesn't exist
                    await pool.query(`
                        INSERT INTO mc_chains (name, rpc_urls, block_time_sec, is_active)
                        VALUES ($1, $2, $3, true)
                    `, [chain.name, chain.rpc_urls, chain.block_time_sec]);
                    console.log(`✅ Added ${chain.name} with ${chain.rpc_urls.length} RPC(s)`);
                }
            } else {
                console.log(`⚠️ Skipped ${chain.name} - no RPC URL configured`);
            }
        }

        // Show active chains
        const active = await pool.query('SELECT name, rpc_urls FROM mc_chains WHERE is_active = true');
        console.log(`\n📊 Active chains: ${active.rowCount}`);
        active.rows.forEach(row => {
            console.log(`   • ${row.name}: ${row.rpc_urls[0]}`);
        });
        
    } catch (error) {
        console.error('❌ Update failed:', error.message);
    } finally {
        await pool.end();
    }
}

updateChains();
