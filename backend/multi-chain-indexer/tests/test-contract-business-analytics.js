const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testContractBusinessAnalytics() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });

    try {
        await client.connect();
        console.log('🏢 INDIVIDUAL CONTRACT BUSINESS ANALYTICS');
        console.log('='.repeat(80));
        console.log('Each Smart Contract = One Business Entity for Investors');
        console.log('='.repeat(80));

        // Get all contracts to analyze
        const contractsQuery = `
            SELECT DISTINCT
                bci.contract_address,
                bci.protocol_name,
                bci.contract_name,
                bcc.category_name,
                bcc.subcategory,
                c.name as chain_name,
                COUNT(td.id) as tx_count
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            JOIN mc_chains c ON bci.chain_id = c.id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.to_address 
                AND bci.chain_id = td.chain_id
                AND td.captured_at > NOW() - INTERVAL '30 days'
            GROUP BY bci.contract_address, bci.protocol_name, bci.contract_name, 
                     bcc.category_name, bcc.subcategory, c.name
            HAVING COUNT(td.id) > 0
            ORDER BY COUNT(td.id) DESC
            LIMIT 5
        `;

        const contractsResult = await client.query(contractsQuery);

        console.log(`\n📊 ANALYZING ${contractsResult.rows.length} INDIVIDUAL BUSINESSES:`);

        for (let i = 0; i < contractsResult.rows.length; i++) {
            const contract = contractsResult.rows[i];

            console.log(`\n${'='.repeat(80)}`);
            console.log(`🏢 BUSINESS ${i + 1}: ${contract.protocol_name || contract.contract_name || 'Unknown Business'}`);
            console.log(`${'='.repeat(80)}`);
            console.log(`📍 Contract: ${contract.contract_address}`);
            console.log(`⛓️  Chain: ${contract.chain_name}`);
            console.log(`🏷️  Category: ${contract.category_name}/${contract.subcategory}`);

            // DETAILED BUSINESS ANALYSIS FOR THIS CONTRACT
            const businessAnalysisQuery = `
                WITH business_metrics AS (
                    SELECT 
                        -- Customer Metrics
                        COUNT(DISTINCT td.from_address) as total_customers,
                        COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '7 days' THEN td.from_address END) as weekly_active_customers,
                        COUNT(DISTINCT CASE WHEN td.captured_at > NOW() - INTERVAL '1 day' THEN td.from_address END) as daily_active_customers,
                        
                        -- Revenue Metrics
                        COUNT(*) as total_transactions,
                        COUNT(CASE WHEN td.status = 1 THEN 1 END) as successful_transactions,
                        SUM(td.value::numeric) / 1e18 as total_revenue_eth,
                        SUM(td.gas_used * td.gas_price) / 1e18 as total_fees_generated_eth,
                        AVG(td.value::numeric) / 1e18 as avg_transaction_value_eth,
                        
                        -- Customer Behavior
                        COUNT(DISTINCT td.from_address) FILTER (WHERE customer_stats.tx_count = 1) as one_time_customers,
                        COUNT(DISTINCT td.from_address) FILTER (WHERE customer_stats.tx_count BETWEEN 2 AND 5) as occasional_customers,
                        COUNT(DISTINCT td.from_address) FILTER (WHERE customer_stats.tx_count > 5) as loyal_customers,
                        
                        -- Customer Value Segments
                        COUNT(DISTINCT td.from_address) FILTER (WHERE customer_stats.total_value >= 1) as premium_customers,
                        COUNT(DISTINCT td.from_address) FILTER (WHERE customer_stats.total_value < 0.1) as small_customers,
                        
                        -- Performance
                        AVG(td.gas_used) as avg_gas_used,
                        MAX(customer_stats.total_value) as top_customer_value_eth,
                        AVG(customer_stats.total_value) as avg_customer_value_eth
                        
                    FROM mc_transaction_details td
                    LEFT JOIN (
                        SELECT 
                            from_address,
                            COUNT(*) as tx_count,
                            SUM(value::numeric) / 1e18 as total_value
                        FROM mc_transaction_details
                        WHERE to_address = $1
                        AND captured_at > NOW() - INTERVAL '30 days'
                        GROUP BY from_address
                    ) customer_stats ON td.from_address = customer_stats.from_address
                    WHERE td.to_address = $1
                    AND td.captured_at > NOW() - INTERVAL '30 days'
                ),
                daily_performance AS (
                    SELECT 
                        DATE(td.captured_at) as business_date,
                        COUNT(DISTINCT td.from_address) as daily_customers,
                        COUNT(*) as daily_transactions,
                        SUM(td.value::numeric) / 1e18 as daily_revenue_eth
                    FROM mc_transaction_details td
                    WHERE td.to_address = $1
                    AND td.captured_at > NOW() - INTERVAL '7 days'
                    GROUP BY DATE(td.captured_at)
                    ORDER BY business_date DESC
                    LIMIT 7
                ),
                function_usage AS (
                    SELECT 
                        td.function_name,
                        COUNT(*) as usage_count,
                        COUNT(DISTINCT td.from_address) as unique_users,
                        AVG(td.gas_used) as avg_gas_cost
                    FROM mc_transaction_details td
                    WHERE td.to_address = $1
                    AND td.captured_at > NOW() - INTERVAL '30 days'
                    AND td.function_name IS NOT NULL
                    GROUP BY td.function_name
                    ORDER BY usage_count DESC
                    LIMIT 5
                )
                SELECT 
                    (SELECT row_to_json(bm) FROM business_metrics bm) as business_metrics,
                    (SELECT json_agg(dp ORDER BY dp.business_date DESC) FROM daily_performance dp) as daily_performance,
                    (SELECT json_agg(fu ORDER BY fu.usage_count DESC) FROM function_usage fu) as function_usage
            `;

            const analysisResult = await client.query(businessAnalysisQuery, [contract.contract_address]);
            const analysis = analysisResult.rows[0];

            const businessMetrics = analysis.business_metrics;
            const dailyPerformance = analysis.daily_performance || [];
            const functionUsage = analysis.function_usage || [];

            // Calculate KPIs
            const successRate = businessMetrics.total_transactions > 0
                ? ((businessMetrics.successful_transactions / businessMetrics.total_transactions) * 100).toFixed(1)
                : 0;

            const customerStickiness = businessMetrics.weekly_active_customers > 0
                ? ((businessMetrics.daily_active_customers / businessMetrics.weekly_active_customers) * 100).toFixed(1)
                : 0;

            const customerRetentionRate = businessMetrics.total_customers > 0
                ? (((businessMetrics.total_customers - businessMetrics.one_time_customers) / businessMetrics.total_customers) * 100).toFixed(1)
                : 0;

            // Business Health Score
            let healthScore = 50;
            if (businessMetrics.total_customers > 100) healthScore += 15;
            else if (businessMetrics.total_customers > 10) healthScore += 8;
            if (parseFloat(successRate) > 95) healthScore += 15;
            if (parseFloat(customerRetentionRate) > 50) healthScore += 10;
            if (businessMetrics.total_revenue_eth > 1) healthScore += 10;

            console.log('\n💼 BUSINESS OVERVIEW:');
            console.log(`   Business Health Score: ${Math.min(100, healthScore)}/100`);
            console.log(`   Total Customers: ${businessMetrics.total_customers?.toLocaleString() || 0}`);
            console.log(`   Active Customers (7d): ${businessMetrics.weekly_active_customers?.toLocaleString() || 0}`);
            console.log(`   Customer Stickiness: ${customerStickiness}% (DAU/WAU)`);
            console.log(`   Customer Retention: ${customerRetentionRate}% (repeat customers)`);

            console.log('\n💰 REVENUE METRICS:');
            console.log(`   Total Revenue: ${parseFloat(businessMetrics.total_revenue_eth || 0).toFixed(4)} ETH`);
            console.log(`   Fees Generated: ${parseFloat(businessMetrics.total_fees_generated_eth || 0).toFixed(4)} ETH`);
            console.log(`   Avg Transaction Value: ${parseFloat(businessMetrics.avg_transaction_value_eth || 0).toFixed(6)} ETH`);
            console.log(`   Top Customer Value: ${parseFloat(businessMetrics.top_customer_value_eth || 0).toFixed(4)} ETH`);
            console.log(`   Avg Customer Value: ${parseFloat(businessMetrics.avg_customer_value_eth || 0).toFixed(6)} ETH`);

            console.log('\n👥 CUSTOMER SEGMENTATION:');
            console.log(`   One-time Customers: ${businessMetrics.one_time_customers || 0} (${businessMetrics.total_customers > 0 ? ((businessMetrics.one_time_customers / businessMetrics.total_customers) * 100).toFixed(1) : 0}%)`);
            console.log(`   Occasional Customers: ${businessMetrics.occasional_customers || 0} (2-5 transactions)`);
            console.log(`   Loyal Customers: ${businessMetrics.loyal_customers || 0} (5+ transactions)`);
            console.log(`   Premium Customers: ${businessMetrics.premium_customers || 0} (≥1 ETH spent)`);
            console.log(`   Small Customers: ${businessMetrics.small_customers || 0} (<0.1 ETH spent)`);

            console.log('\n📊 OPERATIONAL METRICS:');
            console.log(`   Total Transactions: ${businessMetrics.total_transactions?.toLocaleString() || 0}`);
            console.log(`   Success Rate: ${successRate}%`);
            console.log(`   Avg Gas Used: ${Math.round(businessMetrics.avg_gas_used || 0).toLocaleString()}`);
            console.log(`   Transactions per Customer: ${businessMetrics.total_customers > 0 ? (businessMetrics.total_transactions / businessMetrics.total_customers).toFixed(1) : 0}`);

            if (dailyPerformance.length > 0) {
                console.log('\n📈 RECENT DAILY PERFORMANCE (Last 7 Days):');
                dailyPerformance.forEach(day => {
                    console.log(`   ${day.business_date}: ${day.daily_customers} customers, ${day.daily_transactions} txs, ${parseFloat(day.daily_revenue_eth).toFixed(4)} ETH`);
                });
            }

            if (functionUsage.length > 0) {
                console.log('\n🔧 TOP PRODUCT FEATURES (Functions):');
                functionUsage.forEach((func, index) => {
                    console.log(`   ${index + 1}. ${func.function_name}: ${func.usage_count} uses, ${func.unique_users} users, ${Math.round(func.avg_gas_cost)} avg gas`);
                });
            }

            // Investment Analysis
            console.log('\n💡 INVESTOR INSIGHTS:');

            if (businessMetrics.total_customers > 500) {
                console.log('   ✅ Strong user base - High market adoption');
            } else if (businessMetrics.total_customers > 50) {
                console.log('   🟡 Growing user base - Moderate traction');
            } else {
                console.log('   🔴 Small user base - Early stage or niche market');
            }

            if (parseFloat(customerRetentionRate) > 60) {
                console.log('   ✅ High customer retention - Strong product-market fit');
            } else if (parseFloat(customerRetentionRate) > 30) {
                console.log('   🟡 Moderate retention - Room for improvement');
            } else {
                console.log('   🔴 Low retention - Product or UX issues');
            }

            if (parseFloat(successRate) > 95) {
                console.log('   ✅ Excellent reliability - Well-tested smart contract');
            } else if (parseFloat(successRate) > 85) {
                console.log('   🟡 Good reliability - Minor technical issues');
            } else {
                console.log('   🔴 Poor reliability - Technical problems need attention');
            }

            const revenueUSD = parseFloat(businessMetrics.total_revenue_eth || 0) * 2000; // Assume $2000 ETH
            if (revenueUSD > 100000) {
                console.log(`   ✅ High revenue - $${revenueUSD.toLocaleString()} (30d)`);
            } else if (revenueUSD > 10000) {
                console.log(`   🟡 Moderate revenue - $${revenueUSD.toLocaleString()} (30d)`);
            } else {
                console.log(`   🔴 Low revenue - $${revenueUSD.toLocaleString()} (30d)`);
            }

            // Business Valuation Estimate
            const monthlyRevenue = revenueUSD;
            const annualRevenue = monthlyRevenue * 12;
            const estimatedValuation = annualRevenue * 10; // 10x revenue multiple (conservative)

            console.log('\n💎 BUSINESS VALUATION ESTIMATE:');
            console.log(`   Monthly Revenue: $${monthlyRevenue.toLocaleString()}`);
            console.log(`   Annual Revenue (est): $${annualRevenue.toLocaleString()}`);
            console.log(`   Estimated Valuation: $${estimatedValuation.toLocaleString()} (10x revenue)`);

            if (i < contractsResult.rows.length - 1) {
                console.log('\n⏳ Analyzing next business...\n');
            }
        }

        // BUSINESS DIRECTORY SUMMARY
        console.log(`\n${'='.repeat(80)}`);
        console.log('📋 BUSINESS DIRECTORY SUMMARY');
        console.log(`${'='.repeat(80)}`);

        const summaryQuery = `
            SELECT 
                bcc.category_name,
                COUNT(DISTINCT bci.contract_address) as total_businesses,
                SUM(business_stats.customers) as total_customers,
                SUM(business_stats.revenue_eth) as total_revenue_eth,
                AVG(business_stats.customers) as avg_customers_per_business,
                AVG(business_stats.revenue_eth) as avg_revenue_per_business_eth
            FROM bi_contract_index bci
            JOIN bi_contract_categories bcc ON bci.category_id = bcc.id
            LEFT JOIN (
                SELECT 
                    td.to_address,
                    COUNT(DISTINCT td.from_address) as customers,
                    SUM(td.value::numeric) / 1e18 as revenue_eth
                FROM mc_transaction_details td
                WHERE td.captured_at > NOW() - INTERVAL '30 days'
                GROUP BY td.to_address
            ) business_stats ON bci.contract_address = business_stats.to_address
            GROUP BY bcc.category_name
            HAVING SUM(business_stats.customers) > 0
            ORDER BY total_customers DESC
        `;

        const summaryResult = await client.query(summaryQuery);

        console.log('\n🏢 BUSINESSES BY CATEGORY:');
        summaryResult.rows.forEach(category => {
            const totalRevenueUSD = parseFloat(category.total_revenue_eth) * 2000;
            const avgRevenueUSD = parseFloat(category.avg_revenue_per_business_eth) * 2000;

            console.log(`\n📂 ${category.category_name.toUpperCase()}:`);
            console.log(`   Total Businesses: ${category.total_businesses}`);
            console.log(`   Total Customers: ${category.total_customers?.toLocaleString()}`);
            console.log(`   Total Revenue: ${parseFloat(category.total_revenue_eth).toFixed(2)} ETH ($${totalRevenueUSD.toLocaleString()})`);
            console.log(`   Avg Customers/Business: ${Math.round(category.avg_customers_per_business)}`);
            console.log(`   Avg Revenue/Business: ${parseFloat(category.avg_revenue_per_business_eth).toFixed(4)} ETH ($${avgRevenueUSD.toLocaleString()})`);
        });

        console.log('\n✅ INDIVIDUAL CONTRACT BUSINESS ANALYTICS COMPLETE!');
        console.log('\n🎯 KEY INSIGHTS FOR INVESTORS:');
        console.log('   • Each smart contract represents a unique business opportunity');
        console.log('   • Customer metrics show real user adoption and engagement');
        console.log('   • Revenue data provides clear monetization evidence');
        console.log('   • Retention rates indicate product-market fit strength');
        console.log('   • Function usage reveals product feature popularity');
        console.log('   • Business health scores enable quick investment screening');
        console.log('   • Valuation estimates help with investment sizing');

        console.log('\n📊 AVAILABLE API ENDPOINTS:');
        console.log('   GET /api/contract-business/:contractAddress - Full business analytics');
        console.log('   GET /api/contract-business/ - Business directory with filters');
        console.log('   Example: /api/contract-business/0x1F98431c8aD98523631AE4a59f267346ea31F984');

    } catch (error) {
        console.error('❌ Error in contract business analytics:', error.message);
    } finally {
        await client.end();
    }
}

testContractBusinessAnalytics();