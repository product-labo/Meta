const { Client } = require('pg');
const { ethers } = require('ethers');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function checkAddresses() {
    console.log('🔍 Checking Registry Addresses...\n');

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();

        const result = await client.query(`
            SELECT 
                c.name as chain_name,
                r.address,
                r.name as contract_name,
                r.category
            FROM mc_registry r
            JOIN mc_chains c ON r.chain_id = c.id
            ORDER BY c.name, r.address
        `);

        console.log('📋 CURRENT REGISTRY ADDRESSES:');
        console.log('='.repeat(60));

        result.rows.forEach(row => {
            console.log(`${row.chain_name.toUpperCase()}: ${row.contract_name || 'Unknown'}`);
            console.log(`  Address: ${row.address}`);
            console.log(`  Category: ${row.category}`);

            // Check if it's an EVM chain and validate checksum
            if (['ethereum', 'polygon', 'bsc', 'base'].includes(row.chain_name)) {
                try {
                    const checksummed = ethers.getAddress(row.address);
                    const isValid = checksummed === row.address;
                    console.log(`  Checksum: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
                    if (!isValid) {
                        console.log(`  Correct:  ${checksummed}`);
                    }
                } catch (error) {
                    console.log(`  Checksum: ❌ Invalid format`);
                }
            }
            console.log('');
        });

        // Show what the indexer monitors
        console.log('🎯 WHAT THE INDEXER MONITORS:');
        console.log('='.repeat(60));
        console.log('✅ Smart Contracts: Yes (any contract address)');
        console.log('✅ Regular Wallets: Yes (any wallet address)');
        console.log('✅ Token Contracts: Yes (ERC20, ERC721, etc.)');
        console.log('✅ DeFi Protocols: Yes (Uniswap, Compound, etc.)');
        console.log('✅ Any Address: Yes (whatever you add to mc_registry)');
        console.log('');
        console.log('📊 DATA COLLECTED PER ADDRESS:');
        console.log('- Balance (ETH/native token)');
        console.log('- Nonce (transaction count)');
        console.log('- Contract code (if it\'s a contract)');
        console.log('- Event logs (if monitor_events = true)');
        console.log('- Block-level data for each chain');

    } catch (error) {
        console.error('❌ Query failed:', error.message);
    } finally {
        await client.end();
    }
}

checkAddresses();