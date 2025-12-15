import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from indexer root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
};

async function runAdvancedMigration() {
    console.log('=== Running Advanced Multi-Chain Indexer Migration ===');
    console.log(`Target: ${config.database} @ ${config.host}`);

    const client = new Client(config);

    try {
        await client.connect();

        const migrationFile = path.join(__dirname, '../../migrations/002_advanced_features.sql');
        console.log(`Applying: ${migrationFile}`);

        const sql = fs.readFileSync(migrationFile, 'utf8');

        await client.query(sql);
        console.log('✅ Advanced features migration applied successfully.');

        // Seed some common signatures
        console.log('🔧 Seeding common function signatures...');
        
        const commonSignatures = [
            // ERC20
            { selector: '0xa9059cbb', signature: 'transfer(address,uint256)', name: 'transfer' },
            { selector: '0x23b872dd', signature: 'transferFrom(address,address,uint256)', name: 'transferFrom' },
            { selector: '0x095ea7b3', signature: 'approve(address,uint256)', name: 'approve' },
            { selector: '0x70a08231', signature: 'balanceOf(address)', name: 'balanceOf' },
            
            // Uniswap V2
            { selector: '0x38ed1739', signature: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)', name: 'swapExactTokensForTokens' },
            { selector: '0x8803dbee', signature: 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)', name: 'swapTokensForExactTokens' },
            
            // Compound
            { selector: '0xa0712d68', signature: 'mint(uint256)', name: 'mint' },
            { selector: '0xdb006a75', signature: 'redeem(uint256)', name: 'redeem' },
            { selector: '0xc5ebeaec', signature: 'borrow(uint256)', name: 'borrow' },
        ];

        for (const sig of commonSignatures) {
            await client.query(
                `INSERT INTO mc_function_signatures (selector, signature, function_name, inputs, source)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT (selector) DO NOTHING`,
                [sig.selector, sig.signature, sig.name, '[]', 'manual']
            );
        }

        // Seed common event signatures
        console.log('🔧 Seeding common event signatures...');
        
        const commonEvents = [
            {
                topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                signature: 'Transfer(address,address,uint256)',
                name: 'Transfer'
            },
            {
                topic0: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
                signature: 'Approval(address,address,uint256)',
                name: 'Approval'
            }
        ];

        for (const event of commonEvents) {
            await client.query(
                `INSERT INTO mc_event_signatures (topic0, signature, event_name, inputs, source)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT (topic0) DO NOTHING`,
                [event.topic0, event.signature, event.name, '[]', 'manual']
            );
        }

        console.log('✅ Migration completed successfully!');
        console.log('\n🚀 NEW FEATURES AVAILABLE:');
        console.log('   ✅ Full transaction decoding');
        console.log('   ✅ Function signature resolution');
        console.log('   ✅ Event decoding with parameters');
        console.log('   ✅ Token transfer tracking');
        console.log('   ✅ DeFi interaction detection');
        console.log('   ✅ NFT transfer monitoring');
        console.log('   ✅ Address analytics');
        console.log('   ✅ Advanced querying capabilities');

    } catch (error: any) {
        console.error('❌ Migration Failed:', error.message);
    } finally {
        await client.end();
    }
}

runAdvancedMigration();