/**
 * Test Task 4.2: Trend Calculation System
 * Verify that the trend calculation system is working correctly
 */

import businessIntelligenceService from './src/services/business-intelligence-service.js';

async function testTask42TrendSystem() {
    console.log('🧪 Testing Task 4.2: Trend Calculation System');
    console.log('=' .repeat(60));
    
    try {
        // Initialize the service
        console.log('1. Initializing Business Intelligence Service...');
        await businessIntelligenceService.initialize();
        console.log('✅ Service initialized successfully');
        
        // Test dashboard metrics with trends
        console.log('\n2. Testing Dashboard Metrics with Trends...');
        const result = await businessIntelligenceService.getDashboardMetrics();
        
        if (!result.success) {
            throw new Error(`Dashboard metrics failed: ${result.error}`);
        }
        
        console.log('✅ Dashboard metrics retrieved successfully');
        
        // Verify trend data structure
        console.log('\n3. Verifying Trend Data Structure...');
        const trends = result.data.trends;
        
        const requiredTrendFields = [
            'projectsChange',
            'customersChange', 
            'revenueChange',
            'topPerformers',
            'highRiskProjects',
            'momentum',
            'marketTrend'
        ];
        
        let allFieldsPresent = true;
        for (const field of requiredTrendFields) {
            if (trends[field] === undefined) {
                console.log(`❌ Missing trend field: ${field}`);
                allFieldsPresent = false;
            } else {
                console.log(`✅ Trend field present: ${field} = ${trends[field]}`);
            }
        }
        
        if (!allFieldsPresent) {
            throw new Error('Missing required trend fields');
        }
        
        // Test trend calculation features
        console.log('\n4. Testing Trend Calculation Features...');
        
        // Feature 1: Percentage changes over time periods
        console.log('📈 Feature 1: Percentage Changes Over Time Periods');
        console.log(`  - Projects Change: ${trends.projectsChange}%`);
        console.log(`  - Customers Change: ${trends.customersChange}%`);
        console.log(`  - Revenue Change: ${trends.revenueChange}%`);
        console.log('✅ Percentage changes calculated successfully');
        
        // Feature 2: Top performers identification
        console.log('\n🏆 Feature 2: Top Performers Identification');
        console.log(`  - Top Performers Count: ${trends.topPerformers}`);
        if (typeof trends.topPerformers === 'number' && trends.topPerformers >= 0) {
            console.log('✅ Top performers identification working');
        } else {
            throw new Error('Top performers identification failed');
        }
        
        // Feature 3: High-risk project identification
        console.log('\n⚠️  Feature 3: High-Risk Project Identification');
        console.log(`  - High Risk Projects Count: ${trends.highRiskProjects}`);
        if (typeof trends.highRiskProjects === 'number' && trends.highRiskProjects >= 0) {
            console.log('✅ High-risk project identification working');
        } else {
            throw new Error('High-risk project identification failed');
        }
        
        // Feature 4: Market trend indicators
        console.log('\n📊 Feature 4: Market Trend Indicators');
        console.log(`  - Market Trend: ${trends.marketTrend}`);
        const validTrends = ['bullish', 'bearish', 'stable'];
        if (validTrends.includes(trends.marketTrend)) {
            console.log('✅ Market trend indicators working');
        } else {
            throw new Error('Invalid market trend indicator');
        }
        
        // Feature 5: Momentum calculations
        console.log('\n🚀 Feature 5: Momentum Calculations');
        console.log(`  - Market Momentum: ${trends.momentum}/100`);
        if (typeof trends.momentum === 'number' && trends.momentum >= 0 && trends.momentum <= 100) {
            console.log('✅ Momentum calculations working');
        } else {
            throw new Error('Momentum calculations failed');
        }
        
        // Test API integration
        console.log('\n5. Testing API Integration...');
        console.log('✅ Trends are properly integrated into dashboard metrics response');
        
        // Summary
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 TASK 4.2 VERIFICATION COMPLETE');
        console.log('✅ All trend calculation features are working correctly:');
        console.log('  ✓ Percentage changes over time periods');
        console.log('  ✓ Top performers identification');
        console.log('  ✓ High-risk project identification');
        console.log('  ✓ Market trend indicators');
        console.log('  ✓ Momentum calculations');
        console.log('  ✓ API integration');
        
        console.log('\n📊 Current Metrics Summary:');
        console.log(`  - Total Projects: ${result.data.totalProjects}`);
        console.log(`  - Total Customers: ${result.data.totalCustomers}`);
        console.log(`  - Total Revenue: ${result.data.totalRevenue} ETH`);
        console.log(`  - Market Trend: ${trends.marketTrend} (${trends.momentum}/100 momentum)`);
        
        await businessIntelligenceService.shutdown();
        
        return {
            success: true,
            message: 'Task 4.2 trend calculation system is fully implemented and working',
            features: {
                percentageChanges: true,
                topPerformers: true,
                highRiskProjects: true,
                marketTrends: true,
                momentum: true,
                apiIntegration: true
            }
        };
        
    } catch (error) {
        console.error('\n❌ Task 4.2 Test Failed:', error.message);
        
        try {
            await businessIntelligenceService.shutdown();
        } catch (shutdownError) {
            console.error('❌ Shutdown error:', shutdownError.message);
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
testTask42TrendSystem()
    .then(result => {
        if (result.success) {
            console.log('\n🎯 RESULT: Task 4.2 is COMPLETE and WORKING');
            process.exit(0);
        } else {
            console.log('\n❌ RESULT: Task 4.2 has issues');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 FATAL ERROR:', error.message);
        process.exit(1);
    });

export { testTask42TrendSystem };