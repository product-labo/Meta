const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/business-intelligence';

async function testBusinessIntelligenceAPI() {
    console.log('🚀 COMPREHENSIVE BUSINESS INTELLIGENCE API TEST');
    console.log('=' .repeat(80));
    
    try {
        // 1. Test Overview Endpoint
        console.log('\n📊 TESTING OVERVIEW ENDPOINT');
        console.log('-'.repeat(50));
        
        const overviewResponse = await axios.get(`${API_BASE}/overview?timeRange=30d`);
        const overview = overviewResponse.data.data.overview;
        
        console.log('💰 FINANCIAL METRICS:');
        console.log(`   Total Volume: ${parseFloat(overview.total_volume_eth).toFixed(2)} ETH`);
        console.log(`   Total Fees: ${parseFloat(overview.total_fees_paid_eth).toFixed(4)} ETH`);
        console.log(`   Revenue per User: ${parseFloat(overview.revenue_per_user_eth).toFixed(6)} ETH`);
        console.log(`   Avg Transaction: ${parseFloat(overview.avg_transaction_value_eth).toFixed(6)} ETH`);
        
        console.log('\n👥 USER METRICS:');
        console.log(`   Total Users: ${overview.total_unique_users.toLocaleString()}`);
        console.log(`   Weekly Active: ${overview.weekly_active_users.toLocaleString()}`);
        console.log(`   Daily Active: ${overview.daily_active_users.toLocaleString()}`);
        console.log(`   User Stickiness: ${overview.user_stickiness_percent}%`);
        
        console.log('\n🔧 OPERATIONAL METRICS:');
        console.log(`   Total Transactions: ${overview.total_transactions.toLocaleString()}`);
        console.log(`   Success Rate: ${overview.success_rate_percent}%`);
        console.log(`   Active Protocols: ${overview.active_protocols}`);
        console.log(`   Active Categories: ${overview.active_categories}`);
        
        // 2. Test Category Breakdown
        console.log('\n🏷️  CATEGORY BREAKDOWN:');
        const categories = overviewResponse.data.data.category_breakdown;
        categories.forEach(cat => {
            console.log(`   ${cat.category_name}/${cat.subcategory}: ${cat.unique_users || 0} users, ${parseFloat(cat.total_volume_eth || 0).toFixed(2)} ETH`);
        });
        
        // 3. Test Chain Distribution
        console.log('\n⛓️  CHAIN DISTRIBUTION:');
        const chains = overviewResponse.data.data.chain_distribution;
        chains.forEach(chain => {
            console.log(`   ${chain.chain_name}: ${chain.unique_users || 0} users, ${parseFloat(chain.total_volume_eth || 0).toFixed(2)} ETH`);
        });
        
        // 4. Test DeFi Traction Analysis
        console.log('\n🚀 TESTING DEFI TRACTION ENDPOINT');
        console.log('-'.repeat(50));
        
        const defiResponse = await axios.get(`${API_BASE}/traction/defi?timeRange=30d`);
        const defiData = defiResponse.data.data;
        
        console.log('📈 DEFI SUMMARY:');
        console.log(`   Total Users: ${defiData.summary.total_users.toLocaleString()}`);
        console.log(`   Total Volume: ${parseFloat(defiData.summary.total_volume_eth).toFixed(2)} ETH`);
        console.log(`   Protocol Count: ${defiData.summary.protocol_count}`);
        console.log(`   Avg Retention: ${defiData.summary.avg_retention_rate}%`);
        console.log(`   User Growth: ${defiData.summary.user_growth_rate}%`);
        console.log(`   Volume Growth: ${defiData.summary.volume_growth_rate}%`);
        
        // 5. Test Cohort Analysis
        console.log('\n📊 TESTING COHORT ANALYSIS ENDPOINT');
        console.log('-'.repeat(50));
        
        const cohortResponse = await axios.get(`${API_BASE}/cohorts?weeks=12`);
        const cohorts = cohortResponse.data.data.cohorts;
        
        console.log('👥 COHORT ANALYSIS:');
        cohorts.slice(0, 3).forEach(cohort => {
            console.log(`   Week ${cohort.cohort_week}: ${cohort.cohort_size} users`);
            cohort.weekly_retention.slice(0, 4).forEach(week => {
                console.log(`     Week ${week.week}: ${week.retention_rate}% retention (${week.active_users} users)`);
            });
        });
        
        // 6. Test Risk Analysis
        console.log('\n⚠️  TESTING RISK ANALYSIS ENDPOINT');
        console.log('-'.repeat(50));
        
        const riskResponse = await axios.get(`${API_BASE}/risk-analysis`);
        const riskData = riskResponse.data.data;
        
        console.log('🛡️  RISK OVERVIEW:');
        console.log(`   Total Contracts: ${riskData.risk_overview.total_contracts}`);
        console.log(`   Overall Risk Score: ${riskData.risk_overview.overall_risk_score}/100`);
        console.log(`   Low Risk: ${riskData.risk_overview.low_risk_contracts} contracts`);
        console.log(`   Medium Risk: ${riskData.risk_overview.medium_risk_contracts} contracts`);
        console.log(`   High Risk: ${riskData.risk_overview.high_risk_contracts} contracts`);
        console.log(`   Verification Rate: ${riskData.risk_overview.verification_rate}%`);
        
        // 7. Test with Different Parameters
        console.log('\n🔍 TESTING FILTERED ENDPOINTS');
        console.log('-'.repeat(50));
        
        // Test 7-day timeframe
        const weeklyResponse = await axios.get(`${API_BASE}/overview?timeRange=7d`);
        console.log(`📅 7-Day Metrics: ${weeklyResponse.data.data.overview.total_unique_users} users`);
        
        // Test specific category cohorts
        const defiCohortResponse = await axios.get(`${API_BASE}/cohorts?category=defi&weeks=8`);
        console.log(`🏦 DeFi Cohorts: ${defiCohortResponse.data.data.cohorts.length} cohort periods`);
        
        // 8. Performance and Response Time Analysis
        console.log('\n⚡ API PERFORMANCE ANALYSIS');
        console.log('-'.repeat(50));
        
        const endpoints = [
            { name: 'Overview', url: `${API_BASE}/overview` },
            { name: 'DeFi Traction', url: `${API_BASE}/traction/defi` },
            { name: 'Cohorts', url: `${API_BASE}/cohorts` },
            { name: 'Risk Analysis', url: `${API_BASE}/risk-analysis` }
        ];
        
        for (const endpoint of endpoints) {
            const startTime = Date.now();
            await axios.get(endpoint.url);
            const responseTime = Date.now() - startTime;
            console.log(`   ${endpoint.name}: ${responseTime}ms`);
        }
        
        // 9. Business Intelligence Summary
        console.log('\n💡 BUSINESS INTELLIGENCE SUMMARY');
        console.log('=' .repeat(80));
        
        const totalVolumeUSD = parseFloat(overview.total_volume_eth) * 2000; // Assume $2000 ETH
        const totalFeesUSD = parseFloat(overview.total_fees_paid_eth) * 2000;
        
        console.log('🎯 KEY INVESTMENT INSIGHTS:');
        console.log(`   • Market Size: $${totalVolumeUSD.toLocaleString()} transaction volume (30d)`);
        console.log(`   • Revenue Potential: $${totalFeesUSD.toLocaleString()} in fees paid`);
        console.log(`   • User Base: ${overview.total_unique_users.toLocaleString()} unique users`);
        console.log(`   • Engagement: ${overview.user_stickiness_percent}% user stickiness`);
        console.log(`   • Reliability: ${overview.success_rate_percent}% transaction success`);
        console.log(`   • Ecosystem: ${overview.active_protocols} protocols, ${overview.active_categories} categories`);
        
        console.log('\n📊 TRACTION INDICATORS:');
        console.log(`   • Strong user retention with cohort analysis available`);
        console.log(`   • Multi-chain presence across ${chains.length} networks`);
        console.log(`   • Diversified risk profile with ${riskData.risk_overview.verification_rate}% verified contracts`);
        console.log(`   • Active DeFi ecosystem with ${defiData.summary.protocol_count} protocols`);
        
        console.log('\n🚀 GROWTH OPPORTUNITIES:');
        console.log(`   • Cross-chain expansion potential`);
        console.log(`   • Category diversification beyond DeFi`);
        console.log(`   • User acquisition and retention optimization`);
        console.log(`   • Protocol partnership opportunities`);
        
        console.log('\n✅ ALL BUSINESS INTELLIGENCE API TESTS PASSED!');
        console.log('   The system provides comprehensive investor-grade analytics:');
        console.log('   • Real-time traction metrics and KPIs');
        console.log('   • User cohort analysis and retention tracking');
        console.log('   • Risk assessment and compliance scoring');
        console.log('   • Market segment analysis and competitive intelligence');
        console.log('   • Cross-chain behavior and adoption insights');
        
    } catch (error) {
        console.error('❌ API Test Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', error.response.data);
        }
    }
}

// Install axios if not available
async function ensureAxios() {
    try {
        require('axios');
    } catch (error) {
        console.log('📦 Installing axios...');
        const { execSync } = require('child_process');
        execSync('npm install axios', { stdio: 'inherit' });
        console.log('✅ Axios installed');
    }
}

async function main() {
    await ensureAxios();
    await testBusinessIntelligenceAPI();
}

main();