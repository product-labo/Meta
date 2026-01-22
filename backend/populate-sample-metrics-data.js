/**
 * Populate sample data for metrics pipeline testing
 * Creates sample contracts, transactions, and business intelligence data
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'david_user',
    password: process.env.DB_PASS || 'Davidsoyaya@1015',
    database: process.env.DB_NAME || 'david',
};

async function populateSampleData() {
    console.log('🌱 Populating sample data for metrics pipeline testing...\n');

    const pool = new Pool(dbConfig);

    try {
        // Sample contract addresses and data
        const sampleContracts = [
            {
                address: '0x1234567890123456789012345678901234567890',
                chain_id: 1,
                name: 'DeFi Protocol Alpha',
                category: 'DeFi',
                subcategory: 'DEX'
            },
            {
                address: '0x2345678901234567890123456789012345678901',
                chain_id: 1,
                name: 'NFT Marketplace Beta',
                category: 'NFT',
                subcategory: 'Marketplace'
            },
            {
                address: '0x3456789012345678901234567890123456789012',
                chain_id: 4202,
                name: 'Gaming Platform Gamma',
                category: 'Gaming',
                subcategory: 'Platform'
            }
        ];

        // Sample wallet addresses
        const sampleWallets = [
            '0xabcdef1234567890123456789012345678901234',
            '0xbcdef12345678901234567890123456789012345',
            '0xcdef123456789012345678901234567890123456',
            '0xdef1234567890123456789012345678901234567',
            '0xef12345678901234567890123456789012345678'
        ];

        console.log('1️⃣ Inserting sample contract data...');

        // Insert sample contracts into bi_contract_index
        for (const contract of sampleContracts) {
            const insertContractQuery = `
                INSERT INTO bi_contract_index (
                    contract_address, chain_id, contract_name, category, subcategory,
                    description, is_verified, deployment_date, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
                )
                ON CONFLICT (contract_address) DO UPDATE SET
                    contract_name = EXCLUDED.contract_name,
                    category = EXCLUDED.category,
                    subcategory = EXCLUDED.subcategory,
                    updated_at = NOW()
            `;

            await pool.query(insertContractQuery, [
                contract.address,
                contract.chain_id,
                contract.name,
                contract.category,
                contract.subcategory,
                `Sample ${contract.category} contract for testing metrics pipeline`,
                true,
                new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date within last year
            ]);

            console.log(`✅ Inserted contract: ${contract.name}`);
        }

        console.log('\n2️⃣ Generating sample transaction data...');

        // Generate sample transactions for each contract
        let totalTransactions = 0;
        
        for (const contract of sampleContracts) {
            const numTransactions = Math.floor(Math.random() * 500) + 100; // 100-600 transactions per contract
            
            console.log(`📊 Generating ${numTransactions} transactions for ${contract.name}...`);

            for (let i = 0; i < numTransactions; i++) {
                const wallet = sampleWallets[Math.floor(Math.random() * sampleWallets.length)];
                const timestamp = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
                const value = Math.random() * 10; // 0-10 ETH
                const gasUsed = Math.floor(Math.random() * 200000) + 21000; // 21k-221k gas
                const gasPrice = Math.random() * 100 + 10; // 10-110 gwei
                const gasFee = (gasUsed * gasPrice) / 1e9; // Convert to ETH
                const status = Math.random() > 0.05 ? 'success' : 'failed'; // 95% success rate

                const insertTransactionQuery = `
                    INSERT INTO mc_transaction_details (
                        transaction_hash, chain_id, block_number, block_timestamp,
                        from_address, to_address, contract_address,
                        transaction_value, transaction_value_usd, gas_used, gas_price,
                        gas_fee_eth, gas_fee_usd, status, function_name, created_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
                    )
                    ON CONFLICT (transaction_hash, chain_id) DO NOTHING
                `;

                const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
                const blockNumber = Math.floor(Math.random() * 1000000) + 18000000;

                await pool.query(insertTransactionQuery, [
                    txHash,
                    contract.chain_id,
                    blockNumber,
                    timestamp,
                    wallet,
                    contract.address,
                    contract.address,
                    value,
                    value * 2000, // Assume $2000 per ETH
                    gasUsed,
                    gasPrice,
                    gasFee,
                    gasFee * 2000,
                    status,
                    ['transfer', 'swap', 'mint', 'burn', 'approve'][Math.floor(Math.random() * 5)]
                ]);

                totalTransactions++;
            }

            console.log(`✅ Generated ${numTransactions} transactions for ${contract.name}`);
        }

        console.log(`\n📊 Total transactions generated: ${totalTransactions}`);

        console.log('\n3️⃣ Verifying sample data...');

        // Verify the data was inserted correctly
        const verificationQuery = `
            SELECT 
                bci.contract_name,
                bci.category,
                COUNT(mtd.*) as transaction_count,
                COUNT(DISTINCT mtd.from_address) as unique_wallets,
                COALESCE(SUM(mtd.transaction_value), 0) as total_volume_eth,
                COUNT(CASE WHEN mtd.status = 'success' THEN 1 END) as successful_transactions
            FROM bi_contract_index bci
            LEFT JOIN mc_transaction_details mtd ON bci.contract_address = mtd.contract_address
            WHERE bci.contract_address IN (${sampleContracts.map((_, i) => `$${i + 1}`).join(', ')})
            GROUP BY bci.contract_address, bci.contract_name, bci.category
            ORDER BY transaction_count DESC
        `;

        const verificationResult = await pool.query(
            verificationQuery, 
            sampleContracts.map(c => c.address)
        );

        console.log('\n📊 Sample data verification:');
        verificationResult.rows.forEach(row => {
            console.log(`  ${row.contract_name} (${row.category}):`);
            console.log(`    - Transactions: ${row.transaction_count}`);
            console.log(`    - Unique wallets: ${row.unique_wallets}`);
            console.log(`    - Total volume: ${parseFloat(row.total_volume_eth).toFixed(4)} ETH`);
            console.log(`    - Success rate: ${row.transaction_count > 0 ? (row.successful_transactions / row.transaction_count * 100).toFixed(1) : 0}%`);
        });

        console.log('\n4️⃣ Testing basic metrics calculation with sample data...');

        // Test metrics calculation with the first contract
        const testContract = sampleContracts[0];
        const metricsQuery = `
            SELECT 
                COUNT(DISTINCT from_address) as total_customers,
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_transactions,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                COALESCE(SUM(transaction_value), 0) as total_volume_eth,
                COALESCE(AVG(transaction_value), 0) as avg_transaction_value_eth,
                MIN(block_timestamp) as first_transaction,
                MAX(block_timestamp) as last_transaction
            FROM mc_transaction_details 
            WHERE contract_address = $1 AND chain_id = $2
        `;

        const metricsResult = await pool.query(metricsQuery, [testContract.address, testContract.chain_id]);
        const metrics = metricsResult.rows[0];

        // Calculate derived metrics
        const successRate = metrics.total_transactions > 0 ? 
            (metrics.successful_transactions / metrics.total_transactions) * 100 : 0;
        
        const daysSinceFirst = metrics.first_transaction ? 
            Math.ceil((new Date() - new Date(metrics.first_transaction)) / (1000 * 60 * 60 * 24)) : 1;
        
        const avgTransactionsPerDay = metrics.total_transactions / daysSinceFirst;

        // Simple scoring algorithms
        const healthScore = Math.round(successRate);
        const growthScore = Math.min(100, Math.round(50 + (avgTransactionsPerDay * 2))); // Base 50 + activity bonus
        const riskScore = Math.max(0, 100 - healthScore);

        console.log(`\n📊 Calculated metrics for ${testContract.name}:`);
        console.log(`  - Total customers: ${metrics.total_customers}`);
        console.log(`  - Total transactions: ${metrics.total_transactions}`);
        console.log(`  - Success rate: ${successRate.toFixed(1)}%`);
        console.log(`  - Total volume: ${parseFloat(metrics.total_volume_eth).toFixed(4)} ETH`);
        console.log(`  - Avg transaction value: ${parseFloat(metrics.avg_transaction_value_eth).toFixed(4)} ETH`);
        console.log(`  - Days active: ${daysSinceFirst}`);
        console.log(`  - Avg transactions/day: ${avgTransactionsPerDay.toFixed(2)}`);
        console.log(`  - Health score: ${healthScore}/100`);
        console.log(`  - Growth score: ${growthScore}/100`);
        console.log(`  - Risk score: ${riskScore}/100`);

        console.log('\n🎉 Sample data population completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Run the metrics pipeline test: node test-metrics-basic.js');
        console.log('   2. Start the full metrics pipeline');
        console.log('   3. Test the API endpoints');

    } catch (error) {
        console.error('❌ Sample data population failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

// Run the population script
populateSampleData().catch(console.error);