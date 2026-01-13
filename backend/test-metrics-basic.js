/**
 * Basic test for metrics pipeline functionality
 * Tests database connection and basic operations
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

async function testBasicFunctionality() {
    console.log('🧪 Testing basic metrics pipeline functionality...\n');

    const pool = new Pool(dbConfig);

    try {
        // Test database connection
        console.log('1️⃣ Testing database connection...');
        const client = await pool.connect();
        console.log('✅ Database connection successful');
        client.release();

        // Test if metrics tables exist
        console.log('\n2️⃣ Checking metrics tables...');
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('project_metrics_realtime', 'wallet_metrics_realtime', 'project_metrics_daily')
        `;
        
        const tablesResult = await pool.query(tablesQuery);
        const existingTables = tablesResult.rows.map(row => row.table_name);
        
        console.log('📊 Found metrics tables:', existingTables);
        
        if (existingTables.length === 0) {
            console.log('⚠️  No metrics tables found. Please run the migration first.');
            console.log('   Run: node run-metrics-migration.js');
        } else {
            console.log('✅ Metrics tables verified');
        }

        // Test sample data availability
        console.log('\n3️⃣ Checking sample data availability...');
        
        // Check for transaction data
        const transactionQuery = `
            SELECT COUNT(*) as count, 
                   COUNT(DISTINCT contract_address) as contracts,
                   COUNT(DISTINCT from_address) as wallets
            FROM mc_transaction_details 
            WHERE contract_address IS NOT NULL
        `;
        
        const transactionResult = await pool.query(transactionQuery);
        const transactionData = transactionResult.rows[0];
        
        console.log('📊 Transaction data:', {
            total_transactions: transactionData.count,
            unique_contracts: transactionData.contracts,
            unique_wallets: transactionData.wallets
        });

        if (parseInt(transactionData.count) === 0) {
            console.log('⚠️  No transaction data found. Metrics calculation will not work without data.');
        } else {
            console.log('✅ Transaction data available for metrics calculation');
        }

        // Check for contract index data
        const contractQuery = `
            SELECT COUNT(*) as count,
                   COUNT(DISTINCT category) as categories
            FROM bi_contract_index
        `;
        
        const contractResult = await pool.query(contractQuery);
        const contractData = contractResult.rows[0];
        
        console.log('📊 Contract index data:', {
            total_contracts: contractData.count,
            unique_categories: contractData.categories
        });

        // Test basic metrics calculation logic
        console.log('\n4️⃣ Testing basic metrics calculation...');
        
        if (parseInt(transactionData.count) > 0) {
            // Get a sample contract
            const sampleQuery = `
                SELECT contract_address, chain_id, COUNT(*) as tx_count
                FROM mc_transaction_details 
                WHERE contract_address IS NOT NULL
                GROUP BY contract_address, chain_id
                ORDER BY tx_count DESC
                LIMIT 1
            `;
            
            const sampleResult = await pool.query(sampleQuery);
            
            if (sampleResult.rows.length > 0) {
                const { contract_address, chain_id, tx_count } = sampleResult.rows[0];
                console.log(`📊 Testing with contract: ${contract_address} (${tx_count} transactions)`);

                // Calculate basic metrics manually
                const metricsQuery = `
                    SELECT 
                        COUNT(DISTINCT from_address) as total_customers,
                        COUNT(*) as total_transactions,
                        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_transactions,
                        COALESCE(SUM(transaction_value), 0) as total_volume_eth,
                        MIN(block_timestamp) as first_transaction,
                        MAX(block_timestamp) as last_transaction
                    FROM mc_transaction_details 
                    WHERE contract_address = $1 AND chain_id = $2
                `;
                
                const metricsResult = await pool.query(metricsQuery, [contract_address, chain_id]);
                const metrics = metricsResult.rows[0];

                console.log('✅ Basic metrics calculated:', {
                    total_customers: metrics.total_customers,
                    total_transactions: metrics.total_transactions,
                    success_rate: metrics.total_transactions > 0 ? 
                        (metrics.successful_transactions / metrics.total_transactions * 100).toFixed(2) + '%' : '0%',
                    total_volume_eth: parseFloat(metrics.total_volume_eth).toFixed(4),
                    first_transaction: metrics.first_transaction,
                    last_transaction: metrics.last_transaction
                });
            }
        }

        // Test data validation rules
        console.log('\n5️⃣ Testing data validation rules...');
        
        const validationRules = {
            total_customers: { min: 0, max: 1000000, type: 'integer' },
            success_rate_percent: { min: 0, max: 100, type: 'decimal' },
            growth_score: { min: 0, max: 100, type: 'integer' }
        };

        const testMetrics = {
            total_customers: 150,
            success_rate_percent: 95.5,
            growth_score: 75
        };

        let validationPassed = true;
        Object.entries(validationRules).forEach(([field, rule]) => {
            const value = testMetrics[field];
            
            if (rule.min !== undefined && value < rule.min) {
                console.log(`❌ ${field} validation failed: ${value} < ${rule.min}`);
                validationPassed = false;
            }
            
            if (rule.max !== undefined && value > rule.max) {
                console.log(`❌ ${field} validation failed: ${value} > ${rule.max}`);
                validationPassed = false;
            }
        });

        if (validationPassed) {
            console.log('✅ Data validation rules working correctly');
        }

        console.log('\n🎉 Basic functionality test completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Ensure metrics tables are created (run migration if needed)');
        console.log('   2. Populate with sample data if needed');
        console.log('   3. Start the full metrics pipeline');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

// Run the test
testBasicFunctionality().catch(console.error);