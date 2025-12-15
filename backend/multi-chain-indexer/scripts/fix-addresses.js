const { Client } = require('pg');
const { ethers } = require('ethers');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function fixAddresses() {
    console.log('🔧 Fixing Invalid Addresses...\n');

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();

        // The problematic address - this is actually not a valid Ethereum address
        // Let's replace it with the real Uniswap V3 Factory address
        const correctUniswapV3Factory = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

        console.log('Fixing Uniswap V3 Factory address...');
        await client.query(`
            UPDATE mc_registry 
            SET address = $1 
            WHERE address = '0xA0b86a33E6441E6C673A4a1C3CC2C4C8F98FB8A4'
        `, [correctUniswapV3Factory]);

        console.log('✅ Fixed Uniswap V3 Factory address');
        console.log(`   Old: 0xA0b86a33E6441E6C673A4a1C3CC2C4C8F98FB8A4`);
        console.log(`   New: ${correctUniswapV3Factory}`);

        // Verify the fix
        const result = await client.query(`
            SELECT address, name FROM mc_registry 
            WHERE name LIKE '%Uniswap%'
        `);

        if (result.rows.length > 0) {
            const addr = result.rows[0].address;
            try {
                const checksummed = ethers.getAddress(addr);
                console.log(`✅ Checksum validation: PASSED`);
                console.log(`   Checksummed: ${checksummed}`);
            } catch (error) {
                console.log(`❌ Still invalid: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
    } finally {
        await client.end();
    }
}

fixAddresses();