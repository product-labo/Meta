/**
 * Working test for MetaGauge Metrics Data Pipeline
 * Tests the core functionality without complex imports
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

class SimpleMetricsCalculator {
    constructor(dbConfig) {
        this.pool = new Pool(dbConfig);
    }

    async calculateProjectMetrics(contractAddress, chainId) {
        const client = await this.pool.connect();
        
        try {
            // Get basic transaction data
            const transactionQuery = `
                SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_transactions,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                    COUNT(DISTINCT from_address) as total_customers,
                    COALESCE(SUM(transaction_value), 0) as total_volume_eth,
                    COALESCE(SUM(gas_fee_eth), 0) as total_fees_eth,
                    COALESCE(AVG(transaction_value), 0) as avg_transaction_value_eth,
                    MIN(block_timestamp) as first_transaction,
                    MAX(block_timestamp) as last_transaction
                FROM mc_transaction_details 
                WHERE contract_address = $1 AND chain_id = $2
            `;
            
            const transactionResult = await client.query(transactionQuery, [contractAddress, chainId]);
            const txData = transactionResult.rows[0];

            // Calculate time-based customer metrics
            const customerMetricsQuery = `
                SELECT 
                    COUNT(DISTINCT CASE WHEN block_timestamp >= NOW() - INTERVAL '1 day' THEN from_address END) as daily_active_customers,
                    COUNT(DISTINCT CASE WHEN block_timestamp >= NOW() - INTERVAL '7 days' THEN from_address END) as weekly_active_customers,
                    COUNT(DISTINCT CASE WHEN block_timestamp >= NOW() - INTERVAL '30 days' THEN from_address END) as monthly_active_customers
                FROM mc_transaction_details 
                WHERE contract_address = $1 AND chain_id = $2
            `;
            
            const customerResult = await client.query(customerMetricsQuery, [contractAddress, chainId]);
            const customerData = customerResult.rows[0];

            // Calculate composite scores
            const successRate = txData.total_transactions > 0 ? 
                (parseFloat(txData.successful_transactions) / parseFloat(txData.total_transactions)) * 100 : 0;

            const daysSinceFirst = txData.first_transaction ? 
                Math.ceil((new Date() - new Date(txData.first_transaction)) / (1000 * 60 * 60 * 24)) : 1;
            
            const avgTransactionsPerDay = parseFloat(txData.total_transactions) / daysSinceFirst;

            // Simple scoring algorithms
            const healthScore = Math.round(successRate);
            const growthScore = Math.min(100, Math.round(50 + (avgTransactionsPerDay * 2))); // Base 50 + activity bonus
            const riskScore = Math.max(0, 100 - healthScore);

            return {
                contract_address: contractAddress,
                chain_id: chainId,
                
                // Customer Metrics
                total_customers: parseInt(txData.total_customers),
                daily_active_customers: parseInt(customerData.daily_active_customers),
                weekly_active_customers: parseInt(customerData.weekly_active_customers),
                monthly_active_customers: parseInt(customerData.monthly_active_customers),
                customer_retention_rate: 0, // Simplified for testing
                customer_stickiness: 0,
                
                // Transaction Metrics
                total_transactions: parseInt(txData.total_transactions),
                successful_transactions: parseInt(txData.successful_transactions),
                failed_transactions: parseInt(txData.failed_transactions),
                success_rate_percent: successRate,
                avg_transactions_per_day: avgTransactionsPerDay,
                transaction_volume_trend: 0, // Simplified for testing
                
                // Financial Metrics
                total_volume_eth: parseFloat(txData.total_volume_eth),
                total_volume_usd: 0,
                total_fees_generated_eth: parseFloat(txData.total_fees_eth),
                total_fees_generated_usd: 0,
                avg_transaction_value_eth: parseFloat(txData.avg_transaction_value_eth),
                avg_transaction_value_usd: 0,
                revenue_per_customer: txData.total_customers > 0 ? 
                    parseFloat(txData.total_volume_eth) / parseInt(txData.total_customers) : 0,
                
                // Growth Metrics
                customer_growth_rate: 0, // Simplified for testing
                transaction_growth_rate: 0,
                volume_growth_rate: 0,
                
                // Composite Scores
                growth_score: growthScore,
                health_score: healthScore,
                risk_score: riskScore,
                uptime_percentage: 100,
                error_rate: txData.total_transactions > 0 ? 
                    (parseFloat(txData.failed_transactions) / parseFloat(txData.total_transactions)) * 100 : 0
            };

        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}

class SimpleMetricsPipeline {
    constructor(dbConfig) {
        this.pool = new Pool(dbConfig);
        this.calculator = new SimpleMetricsCalculator(dbConfig);
    }

    async upsertProjectMetricsRealtime(metrics) {
        const client = await this.pool.connect();
        
        try {
            const upsertQuery = `
                INSERT INTO project_metrics_realtime (
                    contract_address, chain_id, last_updated,
                    total_customers, daily_active_customers, weekly_active_customers, monthly_active_customers,
                    customer_retention_rate, customer_stickiness,
                    total_transactions, successful_transactions, failed_transactions, success_rate_percent,
                    avg_transactions_per_day, transaction_volume_trend,
                    total_volume_eth, total_volume_usd, total_fees_generated_eth, total_fees_generated_usd,
                    avg_transaction_value_eth, avg_transaction_value_usd, revenue_per_customer,
                    customer_growth_rate, transaction_growth_rate, volume_growth_rate,
                    growth_score, health_score, risk_score, uptime_percentage, error_rate
                ) VALUES (
                    $1, $2, NOW(),
                    $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
                )
                ON CONFLICT (contract_address) 
                DO UPDATE SET
                    chain_id = EXCLUDED.chain_id,
                    last_updated = NOW(),
                    total_customers = EXCLUDED.total_customers,
                    daily_active_customers = EXCLUDED.daily_active_customers,
                    weekly_active_customers = EXCLUDED.weekly_active_customers,
                    monthly_active_customers = EXCLUDED.monthly_active_customers,
                    customer_retention_rate = EXCLUDED.customer_retention_rate,
                    customer_stickiness = EXCLUDED.customer_stickiness,
                    total_transactions = EXCLUDED.total_transactions,
                    successful_transactions = EXCLUDED.successful_transactions,
                    failed_transactions = EXCLUDED.failed_transactions,
                    success_rate_percent = EXCLUDED.success_rate_percent,
                    avg_transactions_per_day = EXCLUDED.avg_transactions_per_day,
                    transaction_volume_trend = EXCLUDED.transaction_volume_trend,
                    total_volume_eth = EXCLUDED.total_volume_eth,
                    total_volume_usd = EXCLUDED.total_volume_usd,
                    total_fees_generated_eth = EXCLUDED.total_fees_generated_eth,
                    total_fees_generated_usd = EXCLUDED.total_fees_generated_usd,
                    avg_transaction_value_eth = EXCLUDED.avg_transaction_value_eth,
                    avg_transaction_value_usd = EXCLUDED.avg_transaction_value_usd,
                    revenue_per_customer = EXCLUDED.revenue_per_customer,
                    customer_growth_rate = EXCLUDED.customer_growth_rate,
                    transaction_growth_rate = EXCLUDED.transaction_growth_rate,
                    volume_growth_rate = EXCLUDED.volume_growth_rate,
                    growth_score = EXCLUDED.growth_score,
                    health_score = EXCLUDED.health_score,
                    risk_score = EXCLUDED.risk_score,
                    uptime_percentage = EXCLUDED.uptime_percentage,
                    error_rate = EXCLUDED.error_rate
            `;

            const values = [
                metrics.contract_address, metrics.chain_id,
                metrics.total_customers, metrics.daily_active_customers, metrics.weekly_active_customers, metrics.monthly_active_customers,
                metrics.customer_retention_rate, metrics.customer_stickiness,
                metrics.total_transactions, metrics.successful_transactions, metrics.failed_transactions, metrics.success_rate_percent,
                metrics.avg_transactions_per_day, metrics.transaction_volume_trend,
                metrics.total_volume_eth, metrics.total_volume_usd, metrics.total_fees_generated_eth, metrics.total_fees_generated_usd,
                metrics.avg_transaction_value_eth, metrics.avg_transaction_value_usd, metrics.revenue_per_customer,
                metrics.customer_growth_rate, metrics.transaction_growth_rate, metrics.volume_growth_rate,
                metrics.growth_score, metrics.health_score, metrics.risk_score, metrics.uptime_percentage, metrics.error_rate
            ];

            await client.query(upsertQuery, values);

        } finally {
            client.release();
        }
    }

    async processRealtimeUpdates() {
        const client = await this.pool.connect();
        
        try {
            console.log('🔄 Processing real-time metrics updates...');

            // Get all contracts with transaction data
            const contractsQuery = `
                SELECT DISTINCT contract_address, chain_id
                FROM mc_transaction_details 
                WHERE contract_address IS NOT NULL
                LIMIT 10
            `;
            
            const contractsResult = await client.query(contractsQuery);
            const contracts = contractsResult.rows;

            console.log(`📊 Updating metrics for ${contracts.length} contracts`);

            // Process each contract
            let updatedCount = 0;
            for (const contract of contracts) {
                try {
                    const metrics = await this.calculator.calculateProjectMetrics(contract.contract_address, contract.chain_id);
                    await this.upsertProjectMetricsRealtime(metrics);
                    updatedCount++;
                    console.log(`✅ Updated metrics for ${contract.contract_address}`);
                } catch (error) {
                    console.error(`❌ Failed to update metrics for ${contract.contract_address}:`, error.message);
                }
            }

            console.log(`✅ Real-time update completed: ${updatedCount}/${contracts.length} contracts updated`);

        } finally {
            client.release();
        }
    }

    async close() {
        await this.calculator.close();
        await this.pool.end();
    }
}

async function testWorkingPipeline() {
    console.log('🧪 Testing Working MetaGauge Metrics Data Pipeline...\n');

    let pipeline = null;

    try {
        // Initialize pipeline
        console.log('1️⃣ Initializing pipeline...');
        pipeline = new SimpleMetricsPipeline(dbConfig);
        console.log('✅ Pipeline initialized');

        // Test metrics calculation for all sample contracts
        console.log('\n2️⃣ Testing metrics calculation for all contracts...');
        
        const contractsQuery = `
            SELECT DISTINCT bci.contract_address, bci.chain_id, bci.contract_name
            FROM bi_contract_index bci
            JOIN mc_transaction_details mtd ON bci.contract_address = mtd.contract_address
            ORDER BY bci.contract_name
        `;
        
        const contractsResult = await pipeline.pool.query(contractsQuery);
        
        for (const contract of contractsResult.rows) {
            console.log(`\n📊 Testing ${contract.contract_name} (${contract.contract_address}):`);
            
            const metrics = await pipeline.calculator.calculateProjectMetrics(contract.contract_address, contract.chain_id);
            
            console.log(`  - Total customers: ${metrics.total_customers}`);
            console.log(`  - Total transactions: ${metrics.total_transactions}`);
            console.log(`  - Success rate: ${metrics.success_rate_percent.toFixed(1)}%`);
            console.log(`  - Total volume: ${metrics.total_volume_eth.toFixed(4)} ETH`);
            console.log(`  - Growth score: ${metrics.growth_score}/100`);
            console.log(`  - Health score: ${metrics.health_score}/100`);
            console.log(`  - Risk score: ${metrics.risk_score}/100`);
        }

        // Test real-time updates
        console.log('\n3️⃣ Testing real-time metrics updates...');
        await pipeline.processRealtimeUpdates();

        // Verify data was stored
        console.log('\n4️⃣ Verifying stored metrics...');
        const storedMetricsQuery = `
            SELECT 
                pmr.contract_address,
                bci.contract_name,
                pmr.total_customers,
                pmr.total_transactions,
                pmr.success_rate_percent,
                pmr.growth_score,
                pmr.health_score,
                pmr.risk_score,
                pmr.last_updated
            FROM project_metrics_realtime pmr
            JOIN bi_contract_index bci ON pmr.contract_address = bci.contract_address
            ORDER BY pmr.growth_score DESC
        `;
        
        const storedResult = await pipeline.pool.query(storedMetricsQuery);
        
        console.log('\n📊 Stored metrics verification:');
        storedResult.rows.forEach(row => {
            console.log(`  ${row.contract_name}:`);
            console.log(`    - Customers: ${row.total_customers}, Transactions: ${row.total_transactions}`);
            console.log(`    - Success: ${parseFloat(row.success_rate_percent).toFixed(1)}%, Growth: ${row.growth_score}, Health: ${row.health_score}, Risk: ${row.risk_score}`);
            console.log(`    - Last updated: ${row.last_updated}`);
        });

        // Test data validation
        console.log('\n5️⃣ Testing data validation...');
        
        const validationQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN growth_score < 0 OR growth_score > 100 THEN 1 END) as invalid_growth_scores,
                COUNT(CASE WHEN health_score < 0 OR health_score > 100 THEN 1 END) as invalid_health_scores,
                COUNT(CASE WHEN risk_score < 0 OR risk_score > 100 THEN 1 END) as invalid_risk_scores,
                COUNT(CASE WHEN total_customers < 0 THEN 1 END) as negative_customers,
                COUNT(CASE WHEN success_rate_percent < 0 OR success_rate_percent > 100 THEN 1 END) as invalid_success_rates
            FROM project_metrics_realtime
        `;
        
        const validationResult = await pipeline.pool.query(validationQuery);
        const validation = validationResult.rows[0];
        
        console.log('📊 Data validation results:');
        console.log(`  - Total records: ${validation.total_records}`);
        console.log(`  - Invalid growth scores: ${validation.invalid_growth_scores}`);
        console.log(`  - Invalid health scores: ${validation.invalid_health_scores}`);
        console.log(`  - Invalid risk scores: ${validation.invalid_risk_scores}`);
        console.log(`  - Negative customers: ${validation.negative_customers}`);
        console.log(`  - Invalid success rates: ${validation.invalid_success_rates}`);
        
        const totalIssues = parseInt(validation.invalid_growth_scores) + 
                           parseInt(validation.invalid_health_scores) + 
                           parseInt(validation.invalid_risk_scores) + 
                           parseInt(validation.negative_customers) + 
                           parseInt(validation.invalid_success_rates);
        
        if (totalIssues === 0) {
            console.log('✅ All data validation checks passed');
        } else {
            console.log(`⚠️  Found ${totalIssues} data validation issues`);
        }

        console.log('\n🎉 Working pipeline test completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Processed ${contractsResult.rows.length} contracts`);
        console.log(`   - Generated ${validation.total_records} metrics records`);
        console.log(`   - Data validation: ${totalIssues === 0 ? 'PASSED' : 'ISSUES FOUND'}`);
        console.log('\n📋 Next steps:');
        console.log('   1. Integrate with main application');
        console.log('   2. Set up scheduled batch processing');
        console.log('   3. Add API endpoints for metrics access');

    } catch (error) {
        console.error('❌ Working pipeline test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        if (pipeline) {
            await pipeline.close();
        }
    }
}

// Run the test
testWorkingPipeline().catch(console.error);