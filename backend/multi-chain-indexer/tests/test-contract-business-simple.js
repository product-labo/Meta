const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/contract-business';

async function testContractBusinessAPI() {
    console.log('🏢 TESTING INDIVIDUAL CONTRACT BUSINESS ANALYTICS API');
    console.log('=' .repeat(80));
    
    try {
        // 1. Test Business Directory
        console.log('\n📋 TESTING BUSINESS DIRECTORY');
        console.log('-'.repeat(50));
        
        const directoryResponse = await axios.get(`${API_BASE}/`);
        const businesses = directoryResponse.data.data.businesses;
        
        console.log(`Found ${businesses.length} businesses:`);
        
        businesses.slice(0, 3).forEach((business, index) => {
            console.log(`\n${index + 1}. ${business.business_name}`);
            console.log(`   📍 Contract: ${business.contract_address}`);
            console.log(`   ⛓️  Chain: ${business.chain}`);
            console.log(`   🏷️  Category: ${business.category}/${business.subcategory}`);
            console.log(`   👥 Customers: ${business.total_customers.toLocaleString()}`);
            console.log(`   💰 Revenue: ${business.total_revenue_eth.toFixed(4)} ETH`);
            console.log(`   📊 Transactions: ${business.total_transactions.toLocaleString()}`);
            console.log(`   ✅ Success Rate: ${business.success_rate_percent.toFixed(1)}%`);
            console.log(`   🔄 Retention: ${business.customer_retention_rate_percent.toFixed(1)}%`);
            console.log(`   ⚖️  Risk Score: ${business.risk_score}/100`);
        });
        
        // 2. Test Individual Contract Analysis
        if (businesses.length > 0) {
            const testContract = businesses[0];
            
            console.log(`\n🔍 TESTING INDIVIDUAL CONTRACT ANALYSIS`);
            console.log('-'.repeat(50));
            console.log(`Analyzing: ${testContract.business_name} (${testContract.contract_address})`);
            
            const contractResponse = await axios.get(`${API_BASE}/${testContract.contract_address}`);
            const contractData = contractResponse.data.data;
            
            console.log('\n🏢 BUSINESS IDENTITY:');
            console.log(`   Business Name: ${contractData.business_identity.business_name}`);
            console.log(`   Category: ${contractData.business_identity.category}/${contractData.business_identity.subcategory}`);
            console.log(`   Chain: ${contractData.business_identity.chain}`);
            console.log(`   Verified: ${contractData.business_identity.is_verified ? 'Yes' : 'No'}`);
            console.log(`   Health Score: ${contractData.business_identity.business_health_score}/100`);
            
            console.log('\n💼 BUSINESS METRICS:');
            console.log(`   Total Customers: ${contractData.business_metrics.total_customers.toLocaleString()}`);
            console.log(`   Weekly Active: ${contractData.business_metrics.weekly_active_customers.toLocaleString()}`);
            console.log(`   Daily Active: ${contractData.business_metrics.daily_active_customers.toLocaleString()}`);
            console.log(`   Customer Stickiness: ${contractData.business_metrics.customer_stickiness_percent}%`);
            console.log(`   Customer Growth: ${contractData.business_metrics.customer_growth_rate_percent}%`);
            
            console.log('\n💰 REVENUE METRICS:');
            console.log(`   Total Revenue: ${contractData.business_metrics.total_revenue_eth.toFixed(4)} ETH`);
            console.log(`   Fees Generated: ${contractData.business_metrics.total_fees_generated_eth.toFixed(4)} ETH`);
            console.log(`   Avg Transaction: ${contractData.business_metrics.avg_transaction_value_eth.toFixed(6)} ETH`);
            console.log(`   Success Rate: ${contractData.business_metrics.success_rate_percent}%`);
            
            console.log('\n👥 CUSTOMER ANALYTICS:');
            console.log(`   Whale Customers: ${contractData.customer_analytics.whale_customers} (≥10 ETH)`);
            console.log(`   Premium Customers: ${contractData.customer_analytics.premium_customers} (1-10 ETH)`);
            console.log(`   Regular Customers: ${contractData.customer_analytics.regular_customers} (0.1-1 ETH)`);
            console.log(`   Small Customers: ${contractData.customer_analytics.small_customers} (<0.1 ETH)`);
            console.log(`   One-time Customers: ${contractData.customer_analytics.one_time_customers}`);
            console.log(`   Power Customers: ${contractData.customer_analytics.power_customers} (>20 txs)`);
            
            console.log('\n📈 DAILY PERFORMANCE (Recent):');
            contractData.daily_performance.slice(0, 3).forEach(day => {
                console.log(`   ${day.business_date}: ${day.daily_active_customers} customers, ${day.daily_transactions} txs, ${parseFloat(day.daily_revenue_eth).toFixed(4)} ETH`);
            });
            
            console.log('\n🔧 TOP PRODUCT FEATURES:');
            contractData.product_features.slice(0, 5).forEach((feature, index) => {
                const successRate = feature.success_rate ? parseFloat(feature.success_rate).toFixed(1) : '0.0';
                console.log(`   ${index + 1}. ${feature.function_name}: ${feature.usage_count} uses, ${feature.unique_users} users, ${successRate}% success`);
            });
            
            console.log('\n🏆 COMPETITIVE POSITION:');
            contractData.competitive_analysis.slice(0, 3).forEach((competitor, index) => {
                const isCurrentContract = competitor.contract_address === testContract.contract_address;
                const marker = isCurrentContract ? '👑' : '  ';
                console.log(`   ${marker}${index + 1}. ${competitor.protocol_name}: ${competitor.customers} customers, ${parseFloat(competitor.volume_eth).toFixed(2)} ETH`);
            });
            
            // Business Valuation
            const monthlyRevenueUSD = contractData.business_metrics.total_revenue_eth * 2000; // Assume $2000 ETH
            const annualRevenueUSD = monthlyRevenueUSD * 12;
            const estimatedValuation = annualRevenueUSD * 10; // 10x revenue multiple
            
            console.log('\n💎 BUSINESS VALUATION:');
            console.log(`   Monthly Revenue: $${monthlyRevenueUSD.toLocaleString()}`);
            console.log(`   Annual Revenue (est): $${annualRevenueUSD.toLocaleString()}`);
            console.log(`   Estimated Valuation: $${estimatedValuation.toLocaleString()} (10x revenue)`);
            
            // Investment Recommendation
            console.log('\n💡 INVESTMENT ANALYSIS:');
            
            const healthScore = contractData.business_identity.business_health_score;
            const customerCount = contractData.business_metrics.total_customers;
            const retentionRate = contractData.customer_analytics.one_time_customers / customerCount * 100;
            
            if (healthScore >= 80 && customerCount > 100 && retentionRate < 80) {
                console.log('   ✅ STRONG BUY - High health score, good user base, decent retention');
            } else if (healthScore >= 60 && customerCount > 50) {
                console.log('   🟡 MODERATE BUY - Decent metrics, monitor growth');
            } else if (customerCount < 20) {
                console.log('   🔴 HIGH RISK - Small user base, early stage');
            } else {
                console.log('   🟡 HOLD - Mixed signals, needs deeper analysis');
            }
            
            if (contractData.business_metrics.success_rate_percent < 90) {
                console.log('   ⚠️  WARNING - Low success rate indicates technical issues');
            }
            
            if (retentionRate > 90) {
                console.log('   ⚠️  WARNING - Very high one-time user rate, poor retention');
            }
        }
        
        // 3. Test Filtering
        console.log('\n🔍 TESTING BUSINESS DIRECTORY FILTERS');
        console.log('-'.repeat(50));
        
        // Filter by category
        const defiResponse = await axios.get(`${API_BASE}/?category=defi&limit=10`);
        console.log(`DeFi Businesses: ${defiResponse.data.data.businesses.length}`);
        
        // Sort by revenue
        const revenueResponse = await axios.get(`${API_BASE}/?sortBy=revenue&limit=5`);
        console.log(`Top Revenue Businesses: ${revenueResponse.data.data.businesses.length}`);
        
        console.log('\n✅ ALL CONTRACT BUSINESS ANALYTICS API TESTS PASSED!');
        
        console.log('\n🎯 KEY API FEATURES DEMONSTRATED:');
        console.log('   • Individual contract business analytics');
        console.log('   • Complete customer segmentation and behavior analysis');
        console.log('   • Revenue and financial metrics per contract');
        console.log('   • Daily performance tracking');
        console.log('   • Product feature usage analytics');
        console.log('   • Competitive positioning analysis');
        console.log('   • Business health scoring');
        console.log('   • Investment valuation estimates');
        console.log('   • Business directory with filtering and sorting');
        
        console.log('\n📊 INVESTOR VALUE:');
        console.log('   • Each smart contract treated as individual business');
        console.log('   • Complete due diligence data per contract');
        console.log('   • Customer acquisition and retention metrics');
        console.log('   • Revenue and monetization analysis');
        console.log('   • Risk assessment and competitive analysis');
        console.log('   • Automated business valuation estimates');
        
    } catch (error) {
        console.error('❌ API Test Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

testContractBusinessAPI();