const { Client } = require('pg');
require('dotenv').config();

class TransactionAnalytics {
    constructor() {
        this.client = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASS,
            port: parseInt(process.env.DB_PORT || '5432'),
        });
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.end();
    }

    /**
     * Analyze transaction patterns across all chains
     */
    async analyzeTransactionPatterns() {
        console.log('🔍 TRANSACTION PATTERN ANALYSIS');
        console.log('=' .repeat(60));

        // Success vs Failure rates by chain
        const successRates = await this.client.query(`
            SELECT 
                c.name as chain_name,
                COUNT(*) as total_transactions,
                SUM(CASE WHEN td.status = 1 THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN td.status = 0 THEN 1 ELSE 0 END) as failed,
                ROUND(
                    (SUM(CASE WHEN td.status = 1 THEN 1 ELSE 0 END)::float / COUNT(*)) * 100, 2
                ) as success_rate_percent
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            GROUP BY c.name, c.id
            ORDER BY total_transactions DESC
        `);

        console.log('\n📊 SUCCESS RATES BY CHAIN:');
        successRates.rows.forEach(row => {
            console.log(`${row.chain_name}:`);
            console.log(`  Total: ${row.total_transactions} transactions`);
            console.log(`  Success: ${row.successful} (${row.success_rate_percent}%)`);
            console.log(`  Failed: ${row.failed}`);
            console.log('');
        });

        // Gas usage analysis
        const gasAnalysis = await this.client.query(`
            SELECT 
                c.name as chain_name,
                AVG(td.gas_used::bigint) as avg_gas_used,
                MIN(td.gas_used::bigint) as min_gas_used,
                MAX(td.gas_used::bigint) as max_gas_used,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY td.gas_used::bigint) as median_gas_used,
                AVG(td.gas_price::bigint) as avg_gas_price
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            WHERE td.gas_used IS NOT NULL
            GROUP BY c.name, c.id
            ORDER BY avg_gas_used DESC
        `);

        console.log('\n⛽ GAS USAGE ANALYSIS:');
        gasAnalysis.rows.forEach(row => {
            console.log(`${row.chain_name}:`);
            console.log(`  Avg Gas Used: ${Math.round(row.avg_gas_used).toLocaleString()}`);
            console.log(`  Median Gas Used: ${Math.round(row.median_gas_used).toLocaleString()}`);
            console.log(`  Range: ${Math.round(row.min_gas_used).toLocaleString()} - ${Math.round(row.max_gas_used).toLocaleString()}`);
            console.log(`  Avg Gas Price: ${Math.round(row.avg_gas_price).toLocaleString()} wei`);
            console.log('');
        });

        return { successRates: successRates.rows, gasAnalysis: gasAnalysis.rows };
    }

    /**
     * Analyze most popular functions across chains
     */
    async analyzeFunctionPopularity() {
        console.log('\n🎯 FUNCTION POPULARITY ANALYSIS');
        console.log('=' .repeat(60));

        const popularFunctions = await this.client.query(`
            SELECT 
                td.function_name,
                COUNT(*) as call_count,
                COUNT(DISTINCT td.from_address) as unique_callers,
                COUNT(DISTINCT td.to_address) as unique_contracts,
                ARRAY_AGG(DISTINCT c.name) as chains,
                AVG(td.gas_used::bigint) as avg_gas_used,
                SUM(CASE WHEN td.status = 1 THEN 1 ELSE 0 END) as successful_calls,
                ROUND(
                    (SUM(CASE WHEN td.status = 1 THEN 1 ELSE 0 END)::float / COUNT(*)) * 100, 2
                ) as success_rate
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            WHERE td.function_name IS NOT NULL 
            AND td.function_name != 'unknown'
            GROUP BY td.function_name
            HAVING COUNT(*) >= 5
            ORDER BY call_count DESC
            LIMIT 15
        `);

        console.log('\n📈 TOP FUNCTIONS BY USAGE:');
        popularFunctions.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.function_name}:`);
            console.log(`   Calls: ${row.call_count.toLocaleString()}`);
            console.log(`   Unique Callers: ${row.unique_callers}`);
            console.log(`   Unique Contracts: ${row.unique_contracts}`);
            console.log(`   Chains: ${row.chains.join(', ')}`);
            console.log(`   Avg Gas: ${Math.round(row.avg_gas_used).toLocaleString()}`);
            console.log(`   Success Rate: ${row.success_rate}%`);
            console.log('');
        });

        return popularFunctions.rows;
    }

    /**
     * Analyze transaction value distribution
     */
    async analyzeValueDistribution() {
        console.log('\n💰 TRANSACTION VALUE ANALYSIS');
        console.log('=' .repeat(60));

        const valueAnalysis = await this.client.query(`
            SELECT 
                c.name as chain_name,
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN td.value::bigint = 0 THEN 1 END) as zero_value_txs,
                COUNT(CASE WHEN td.value::bigint > 0 AND td.value::bigint <= 1000000000000000000 THEN 1 END) as small_value_txs,
                COUNT(CASE WHEN td.value::bigint > 1000000000000000000 AND td.value::bigint <= 10000000000000000000 THEN 1 END) as medium_value_txs,
                COUNT(CASE WHEN td.value::bigint > 10000000000000000000 THEN 1 END) as large_value_txs,
                SUM(td.value::bigint) as total_value_wei,
                AVG(td.value::bigint) as avg_value_wei,
                MAX(td.value::bigint) as max_value_wei
            FROM mc_transaction_details td
            JOIN mc_chains c ON td.chain_id = c.id
            WHERE td.value IS NOT NULL
            GROUP BY c.name, c.id
            ORDER BY total_value_wei DESC
        `);

        console.log('\n💎 VALUE DISTRIBUTION BY CHAIN:');
        valueAnalysis.rows.forEach(row => {
            const totalEth = row.total_value_wei / 1e18;
            const avgEth = row.avg_value_wei / 1e18;
            const maxEth = row.max_value_wei / 1e18;
            
            console.log(`${row.chain_name}:`);
            console.log(`  Total Transactions: ${row.total_transactions.toLocaleString()}`);
            console.log(`  Zero Value: ${row.zero_value_txs} (${Math.round(row.zero_value_txs/row.total_transactions*100)}%)`);
            console.log(`  Small (≤1 ETH): ${row.small_value_txs}`);
            console.log(`  Medium (1-10 ETH): ${row.medium_value_txs}`);
            console.log(`  Large (>10 ETH): ${row.large_value_txs}`);
            console.log(`  Total Value: ${totalEth.toFixed(2)} ETH`);
            console.log(`  Average Value: ${avgEth.toFixed(6)} ETH`);
            console.log(`  Max Value: ${maxEth.toFixed(2)} ETH`);
            console.log('');
        });

        return valueAnalysis.rows;
    }

    /**
     * Analyze transaction timing patterns
     */
    async analyzeTimingPatterns() {
        console.log('\n⏰ TRANSACTION TIMING ANALYSIS');
        console.log('=' .repeat(60));

        const hourlyPattern = await this.client.query(`
            SELECT 
                EXTRACT(HOUR FROM td.captured_at) as hour,
                COUNT(*) as transaction_count,
                AVG(td.gas_used::bigint) as avg_gas_used,
                COUNT(DISTINCT td.from_address) as unique_users
            FROM mc_transaction_details td
            WHERE td.captured_at >= NOW() - INTERVAL '7 days'
            GROUP BY EXTRACT(HOUR FROM td.captured_at)
            ORDER BY hour
        `);

        console.log('\n📅 HOURLY TRANSACTION PATTERNS (Last 7 Days):');
        hourlyPattern.rows.forEach(row => {
            const hour = row.hour.toString().padStart(2, '0');
            const bar = '█'.repeat(Math.round(row.transaction_count / 10));
            console.log(`${hour}:00 | ${bar} ${row.transaction_count} txs (${row.unique_users} users)`);
        });

        // Daily trends
        const dailyTrend = await this.client.query(`
            SELECT 
                DATE(td.captured_at) as date,
                COUNT(*) as transaction_count,
                COUNT(DISTINCT td.from_address) as unique_users,
                SUM(td.value::bigint) as total_value,
                AVG(td.gas_used::bigint) as avg_gas_used
            FROM mc_transaction_details td
            WHERE td.captured_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(td.captured_at)
            ORDER BY date DESC
            LIMIT 7
        `);

        console.log('\n📈 DAILY TRENDS (Last 7 Days):');
        dailyTrend.rows.forEach(row => {
            const totalEth = row.total_value / 1e18;
            console.log(`${row.date}:`);
            console.log(`  Transactions: ${row.transaction_count.toLocaleString()}`);
            console.log(`  Unique Users: ${row.unique_users.toLocaleString()}`);
            console.log(`  Total Value: ${totalEth.toFixed(2)} ETH`);
            console.log(`  Avg Gas: ${Math.round(row.avg_gas_used).toLocaleString()}`);
            console.log('');
        });

        return { hourlyPattern: hourlyPattern.rows, dailyTrend: dailyTrend.rows };
    }

    /**
     * Generate comprehensive transaction analytics report
     */
    async generateReport() {
        console.log('🚀 COMPREHENSIVE TRANSACTION ANALYTICS REPORT');
        console.log('=' .repeat(80));
        console.log(`Generated at: ${new Date().toISOString()}`);
        console.log('');

        await this.connect();

        try {
            const patterns = await this.analyzeTransactionPatterns();
            const functions = await this.analyzeFunctionPopularity();
            const values = await this.analyzeValueDistribution();
            const timing = await this.analyzeTimingPatterns();

            console.log('\n🎯 KEY INSIGHTS:');
            console.log('=' .repeat(60));
            
            // Calculate key metrics
            const totalTxs = patterns.successRates.reduce((sum, chain) => sum + parseInt(chain.total_transactions), 0);
            const avgSuccessRate = patterns.successRates.reduce((sum, chain) => sum + parseFloat(chain.success_rate_percent), 0) / patterns.successRates.length;
            const topFunction = functions[0];
            const totalValue = values.reduce((sum, chain) => sum + parseFloat(chain.total_value_wei), 0) / 1e18;

            console.log(`📊 Total Transactions Analyzed: ${totalTxs.toLocaleString()}`);
            console.log(`✅ Average Success Rate: ${avgSuccessRate.toFixed(2)}%`);
            console.log(`🎯 Most Popular Function: ${topFunction?.function_name} (${topFunction?.call_count} calls)`);
            console.log(`💰 Total Value Transferred: ${totalValue.toFixed(2)} ETH`);
            console.log(`⛓️ Active Chains: ${patterns.successRates.length}`);

            return {
                summary: {
                    totalTransactions: totalTxs,
                    averageSuccessRate: avgSuccessRate,
                    topFunction: topFunction,
                    totalValue: totalValue,
                    activeChains: patterns.successRates.length
                },
                patterns,
                functions,
                values,
                timing
            };

        } finally {
            await this.disconnect();
        }
    }
}

// Run analytics if called directly
if (require.main === module) {
    const analytics = new TransactionAnalytics();
    analytics.generateReport().catch(console.error);
}

module.exports = TransactionAnalytics;