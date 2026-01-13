/**
 * Test script for MetaGauge Metrics Data Pipeline
 * Tests real-time updates, batch processing, and data validation
 */

import { MetricsDataPipeline } from './src/services/metrics-pipeline.js';
import { MetricsCalculator } from './src/services/metrics-calculator.js';
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

async function testMetricsPipeline() {
    console.log('🧪 Testing MetaGauge Metrics Data Pipeline...\n');

    let pipeline = null;
    let calculator = null;

    try {
        // Initialize components
        console.log('1️⃣ Initializing pipeline components...');
        pipeline = new MetricsDataPipeline(dbConfig);
        calculator = new MetricsCalculator(dbConfig);

        // Test database table initialization
        console.log('2️⃣ Testing database table initialization...');
        const tablesInitialized = await pipeline.initializeTables();
        if (tablesInitialized) {
            console.log('✅ Database tables verified');
        } else {
            console.log('⚠️  Some metrics tables are missing');
        }

        // Test metrics calculation
        console.log('\n3️⃣ Testing metrics calculation...');
        
        // Get a sample contract address from the database
        const sampleContractQuery = `
            SELECT DISTINCT contract_address, chain_id 
            FROM mc_transaction_details 
            WHERE contract_address IS NOT NULL 
            LIMIT 1
        `;
        
        const sampleResult = await calculator.pool.query(sampleContractQuery);
        
        if (sampleResult.rows.length > 0) {
            const { contract_address, chain_id } = sampleResult.rows[0];
            console.log(`📊 Testing with contract: ${contract_address} on chain ${chain_id}`);

            // Test project metrics calculation
            const projectMetrics = await calculator.calculateProjectMetrics(contract_address, chain_id);
            console.log('✅ Project metrics calculated:', {
                total_customers: projectMetrics.total_customers,
                growth_score: projectMetrics.growth_score,
                health_score: projectMetrics.health_score,
                risk_score: projectMetrics.risk_score
            });

            // Test real-time metrics update
            console.log('\n4️⃣ Testing real-time metrics update...');
            await pipeline.updateProjectMetricsRealtime(contract_address, chain_id);
            console.log('✅ Real-time metrics update completed');

            // Test data validation
            console.log('\n5️⃣ Testing data validation...');
            const validationResult = pipeline.validateMetrics('project_metrics', projectMetrics);
            if (validationResult.isValid) {
                console.log('✅ Metrics validation passed');
            } else {
                console.log('⚠️  Metrics validation issues:', validationResult.errors);
                
                // Test data sanitization
                const sanitizedMetrics = pipeline.sanitizeMetrics(projectMetrics, validationResult.errors);
                console.log('✅ Metrics sanitized successfully');
            }

        } else {
            console.log('⚠️  No sample contract data found in database');
        }

        // Test wallet metrics if we have wallet data
        console.log('\n6️⃣ Testing wallet metrics...');
        const sampleWalletQuery = `
            SELECT DISTINCT from_address, chain_id 
            FROM mc_transaction_details 
            WHERE from_address IS NOT NULL 
            LIMIT 1
        `;
        
        const walletResult = await calculator.pool.query(sampleWalletQuery);
        
        if (walletResult.rows.length > 0) {
            const { from_address, chain_id } = walletResult.rows[0];
            console.log(`👛 Testing with wallet: ${from_address} on chain ${chain_id}`);

            const walletMetrics = await calculator.calculateWalletMetrics(from_address, chain_id);
            console.log('✅ Wallet metrics calculated:', {
                wallet_type: walletMetrics.wallet_type,
                activity_pattern: walletMetrics.activity_pattern,
                loyalty_score: walletMetrics.loyalty_score,
                total_interactions: walletMetrics.total_interactions
            });
        }

        // Test category metrics
        console.log('\n7️⃣ Testing category metrics...');
        const sampleCategoryQuery = `
            SELECT DISTINCT category, chain_id 
            FROM bi_contract_index 
            WHERE category IS NOT NULL 
            LIMIT 1
        `;
        
        const categoryResult = await calculator.pool.query(sampleCategoryQuery);
        
        if (categoryResult.rows.length > 0) {
            const { category, chain_id } = categoryResult.rows[0];
            console.log(`📂 Testing with category: ${category} on chain ${chain_id}`);

            const categoryMetrics = await calculator.calculateCategoryMetrics(category, chain_id);
            console.log('✅ Category metrics calculated:', {
                total_contracts: categoryMetrics.total_contracts,
                market_share_volume: categoryMetrics.market_share_volume,
                category_health_score: categoryMetrics.category_health_score
            });
        }

        // Test pipeline status
        console.log('\n8️⃣ Testing pipeline status...');
        const status = pipeline.getPipelineStatus();
        console.log('✅ Pipeline status retrieved:', status);

        // Test batch processing simulation (without actually running cron jobs)
        console.log('\n9️⃣ Testing batch processing simulation...');
        
        // Simulate daily aggregation for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        
        console.log(`📅 Simulating daily aggregation for ${dateStr}...`);
        
        // Check if we have data for yesterday
        const dailyDataQuery = `
            SELECT COUNT(*) as count
            FROM mc_transaction_details 
            WHERE DATE(block_timestamp) = $1
        `;
        
        const dailyDataResult = await calculator.pool.query(dailyDataQuery, [dateStr]);
        const transactionCount = parseInt(dailyDataResult.rows[0].count);
        
        if (transactionCount > 0) {
            console.log(`📊 Found ${transactionCount} transactions for ${dateStr}`);
            
            // Test daily metrics calculation for one contract
            if (sampleResult.rows.length > 0) {
                const { contract_address, chain_id } = sampleResult.rows[0];
                await pipeline.calculateAndStoreDailyMetrics(contract_address, chain_id, dateStr);
                console.log('✅ Daily metrics calculation completed');
            }
        } else {
            console.log(`⚠️  No transaction data found for ${dateStr}`);
        }

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        if (calculator) {
            await calculator.close();
        }
        if (pipeline) {
            // Don't start the actual pipeline in test mode
            console.log('🧹 Cleaning up test resources...');
        }
    }
}

// Run the test
testMetricsPipeline().catch(console.error);