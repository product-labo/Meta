const axios = require('axios');

async function demonstrateInvestorAnalysis() {
    console.log('💎 INVESTOR ANALYSIS DEMONSTRATION');
    console.log('🏢 Each Smart Contract = Individual Business Investment Opportunity');
    console.log('=' .repeat(80));
    
    try {
        // 1. Get business directory to find investment opportunities
        console.log('\n📋 STEP 1: DISCOVER INVESTMENT OPPORTUNITIES');
        console.log('-'.repeat(60));
        
        const directoryResponse = await axios.get('http://localhost:3001/api/contract-business/?sortBy=customers&limit=10');
        const businesses = directoryResponse.data.data.businesses;
        
        console.log(`Found ${businesses.length} business investment opportunities:`);
        
        businesses.forEach((business, index) => {
            const marketCap = business.total_revenue_eth * 2000 * 12 * 10; // Rough valuation
            console.log(`\n${index + 1}. 🏢 ${business.business_name}`);
            console.log(`   📍 Contract: ${business.contract_address.substring(0, 10)}...`);
            console.log(`   ⛓️  Blockchain: ${business.chain.toUpperCase()}`);
            console.log(`   🏷️  Sector: ${business.category.toUpperCase()}/${business.subcategory}`);
            console.log(`   👥 Customer Base: ${business.total_customers.toLocaleString()} users`);
            console.log(`   💰 Monthly Revenue: ${business.total_revenue_eth.toFixed(4)} ETH`);
            console.log(`   📊 Transaction Volume: ${business.total_transactions.toLocaleString()}`);
            console.log(`   ✅ Reliability: ${business.success_rate_percent.toFixed(1)}% success rate`);
            console.log(`   🔄 Customer Retention: ${business.customer_retention_rate_percent.toFixed(1)}%`);
            console.log(`   ⚖️  Risk Level: ${business.risk_score}/100`);
            console.log(`   💎 Est. Valuation: $${marketCap.toLocaleString()} (10x revenue)`);
            
            // Investment recommendation
            if (business.total_customers > 200 && business.success_rate_percent > 95) {
                console.log(`   🟢 RECOMMENDATION: STRONG BUY - Large user base, high reliability`);
            } else if (business.total_customers > 50 && business.success_rate_percent > 90) {
                console.log(`   🟡 RECOMMENDATION: MODERATE BUY - Good fundamentals`);
            } else {
                console.log(`   🔴 RECOMMENDATION: HIGH RISK - Small scale or reliability issues`);
            }
        });
        
        // 2. Deep dive analysis on top opportunity
        if (businesses.length > 0) {
            const topBusiness = businesses[0];
            
            console.log(`\n🔍 STEP 2: DEEP DIVE ANALYSIS - TOP OPPORTUNITY`);
            console.log('-'.repeat(60));
            console.log(`Analyzing: ${topBusiness.business_name}`);
            
            const analysisResponse = await axios.get(`http://localhost:3001/api/contract-business/${topBusiness.contract_address}`);
            const analysis = analysisResponse.data.data;
            
            console.log('\n📊 COMPREHENSIVE BUSINESS ANALYSIS:');
            
            // Business fundamentals
            console.log('\n🏢 BUSINESS FUNDAMENTALS:');
            console.log(`   Business Name: ${analysis.business_identity.business_name}`);
            console.log(`   Industry: ${analysis.business_identity.category}/${analysis.business_identity.subcategory}`);
            console.log(`   Blockchain: ${analysis.business_identity.chain}`);
            console.log(`   Verified Contract: ${analysis.business_identity.is_verified ? 'Yes ✅' : 'No ❌'}`);
            console.log(`   Business Health Score: ${analysis.business_identity.business_health_score}/100`);
            
            // Customer analytics
            console.log('\n👥 CUSTOMER ANALYTICS:');
            console.log(`   Total Customer Base: ${analysis.business_metrics.total_customers.toLocaleString()}`);
            console.log(`   Weekly Active Users: ${analysis.business_metrics.weekly_active_customers.toLocaleString()}`);
            console.log(`   Daily Active Users: ${analysis.business_metrics.daily_active_customers.toLocaleString()}`);
            console.log(`   Customer Engagement: ${analysis.business_metrics.customer_stickiness_percent}% (DAU/WAU)`);
            
            // Customer segmentation
            console.log('\n💰 CUSTOMER SEGMENTATION BY VALUE:');
            console.log(`   🐋 Whale Customers: ${analysis.customer_analytics.whale_customers} (≥10 ETH spent)`);
            console.log(`   💎 Premium Customers: ${analysis.customer_analytics.premium_customers} (1-10 ETH)`);
            console.log(`   👤 Regular Customers: ${analysis.customer_analytics.regular_customers} (0.1-1 ETH)`);
            console.log(`   🔸 Small Customers: ${analysis.customer_analytics.small_customers} (<0.1 ETH)`);
            
            // Customer behavior
            console.log('\n🔄 CUSTOMER BEHAVIOR:');
            console.log(`   One-time Users: ${analysis.customer_analytics.one_time_customers} (${((analysis.customer_analytics.one_time_customers / analysis.business_metrics.total_customers) * 100).toFixed(1)}%)`);
            console.log(`   Power Users: ${analysis.customer_analytics.power_customers} (>20 transactions)`);
            console.log(`   Avg Transactions/Customer: ${analysis.customer_analytics.avg_transactions_per_customer.toFixed(1)}`);
            console.log(`   Avg Customer Value: ${analysis.customer_analytics.avg_customer_value_eth.toFixed(4)} ETH`);
            
            // Financial performance
            console.log('\n💼 FINANCIAL PERFORMANCE:');
            console.log(`   Total Revenue: ${analysis.business_metrics.total_revenue_eth.toFixed(4)} ETH`);
            console.log(`   Fees Generated: ${analysis.business_metrics.total_fees_generated_eth.toFixed(4)} ETH`);
            console.log(`   Average Transaction: ${analysis.business_metrics.avg_transaction_value_eth.toFixed(6)} ETH`);
            console.log(`   Success Rate: ${analysis.business_metrics.success_rate_percent}%`);
            console.log(`   Total Transactions: ${analysis.business_metrics.total_transactions.toLocaleString()}`);
            
            // Product analysis
            console.log('\n🔧 PRODUCT FEATURES (Top Functions):');
            analysis.product_features.slice(0, 5).forEach((feature, index) => {
                const successRate = feature.success_rate ? parseFloat(feature.success_rate).toFixed(1) : '0.0';
                console.log(`   ${index + 1}. ${feature.function_name}:`);
                console.log(`      Usage: ${feature.usage_count.toLocaleString()} calls`);
                console.log(`      Users: ${feature.unique_users.toLocaleString()} unique users`);
                console.log(`      Success Rate: ${successRate}%`);
                console.log(`      Avg Gas Cost: ${Math.round(feature.avg_gas_cost).toLocaleString()}`);
            });
            
            // Competitive analysis
            console.log('\n🏆 COMPETITIVE POSITION:');
            analysis.competitive_analysis.slice(0, 5).forEach((competitor, index) => {
                const isCurrentBusiness = competitor.contract_address === topBusiness.contract_address;
                const marker = isCurrentBusiness ? '👑 [THIS BUSINESS]' : '  ';
                console.log(`   ${marker} ${index + 1}. ${competitor.protocol_name}:`);
                console.log(`      Customers: ${competitor.customers.toLocaleString()}`);
                console.log(`      Volume: ${parseFloat(competitor.volume_eth).toFixed(2)} ETH`);
                console.log(`      Risk Score: ${competitor.risk_score}/100`);
            });
            
            // Investment thesis
            console.log('\n💡 INVESTMENT THESIS:');
            
            const metrics = analysis.business_metrics;
            const customers = analysis.customer_analytics;
            const health = analysis.business_identity.business_health_score;
            
            // Calculate key ratios
            const retentionRate = 100 - ((customers.one_time_customers / metrics.total_customers) * 100);
            const revenuePerCustomer = metrics.total_revenue_eth / metrics.total_customers;
            const monthlyRevenueUSD = metrics.total_revenue_eth * 2000; // Assume $2000 ETH
            const annualRevenueUSD = monthlyRevenueUSD * 12;
            const estimatedValuation = annualRevenueUSD * 10; // 10x revenue multiple
            
            console.log('\n📈 KEY INVESTMENT METRICS:');
            console.log(`   Customer Retention Rate: ${retentionRate.toFixed(1)}%`);
            console.log(`   Revenue per Customer: ${revenuePerCustomer.toFixed(6)} ETH`);
            console.log(`   Monthly Revenue (USD): $${monthlyRevenueUSD.toLocaleString()}`);
            console.log(`   Annual Revenue (Est): $${annualRevenueUSD.toLocaleString()}`);
            console.log(`   Estimated Valuation: $${estimatedValuation.toLocaleString()}`);
            console.log(`   Revenue Multiple: 10x`);
            
            console.log('\n🎯 INVESTMENT RECOMMENDATION:');
            
            let score = 0;
            let reasons = [];
            
            // Scoring factors
            if (health >= 80) { score += 3; reasons.push('High business health score'); }
            if (metrics.total_customers > 100) { score += 2; reasons.push('Large customer base'); }
            if (metrics.success_rate_percent > 95) { score += 2; reasons.push('High reliability'); }
            if (retentionRate > 20) { score += 2; reasons.push('Good customer retention'); }
            if (customers.power_customers > 5) { score += 1; reasons.push('Strong power user base'); }
            
            // Risk factors
            if (retentionRate < 10) { score -= 2; reasons.push('⚠️ Poor customer retention'); }
            if (metrics.success_rate_percent < 90) { score -= 2; reasons.push('⚠️ Reliability concerns'); }
            if (metrics.total_customers < 50) { score -= 1; reasons.push('⚠️ Small customer base'); }
            
            if (score >= 7) {
                console.log('   🟢 STRONG BUY - Excellent fundamentals');
            } else if (score >= 4) {
                console.log('   🟡 MODERATE BUY - Good opportunity with monitoring');
            } else if (score >= 1) {
                console.log('   🟠 HOLD - Mixed signals, needs improvement');
            } else {
                console.log('   🔴 AVOID - Significant risks identified');
            }
            
            console.log('\n📋 ANALYSIS FACTORS:');
            reasons.forEach(reason => {
                console.log(`   • ${reason}`);
            });
            
            console.log('\n💼 PORTFOLIO ALLOCATION SUGGESTION:');
            if (score >= 7) {
                console.log('   Suggested allocation: 5-10% of DeFi portfolio');
            } else if (score >= 4) {
                console.log('   Suggested allocation: 2-5% of DeFi portfolio');
            } else {
                console.log('   Suggested allocation: <2% or avoid');
            }
        }
        
        console.log('\n🎊 INVESTOR ANALYSIS COMPLETE!');
        console.log('\n🎯 WHAT THIS SYSTEM PROVIDES INVESTORS:');
        console.log('   ✅ Individual business analysis per smart contract');
        console.log('   ✅ Customer acquisition and retention metrics');
        console.log('   ✅ Revenue and financial performance tracking');
        console.log('   ✅ Product feature usage and adoption analysis');
        console.log('   ✅ Competitive positioning and market share');
        console.log('   ✅ Risk assessment and business health scoring');
        console.log('   ✅ Automated valuation and investment recommendations');
        console.log('   ✅ Portfolio allocation suggestions');
        
        console.log('\n💎 INVESTMENT VALUE:');
        console.log('   • Data-driven investment decisions');
        console.log('   • Comprehensive due diligence per protocol');
        console.log('   • Risk management and portfolio optimization');
        console.log('   • Early identification of high-growth opportunities');
        console.log('   • Professional-grade business intelligence');
        
    } catch (error) {
        console.error('❌ Demo Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

demonstrateInvestorAnalysis();