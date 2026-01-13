#!/usr/bin/env node

/**
 * Simple Test for Trending Service
 * Tests the trending functionality without a full server
 */

import { TrendingService } from './src/services/trending-service-fixed.js';

// Database configuration
const dbConfig = {
    user: 'david_user',
    password: 'Davidsoyaya@1015',
    host: 'localhost',
    port: 5432,
    database: 'david'
};

async function testTrendingService() {
    console.log('🧪 Testing Trending Service...\n');
    
    const trendingService = new TrendingService(dbConfig);
    
    try {
        // Test 1: Get trending projects
        console.log('📈 Test 1: Getting trending projects...');
        const trending = await trendingService.getTrendingProjects({
            limit: 5,
            timePeriod: '30d'
        });
        
        console.log(`✅ Found ${trending.trending_projects.length} trending projects`);
        if (trending.trending_projects.length > 0) {
            const top = trending.trending_projects[0];
            console.log(`   Top project: ${top.business_name} (Score: ${top.ranking_score.toFixed(1)})`);
        }
        
        // Test 2: Get failing projects
        console.log('\n📉 Test 2: Getting failing projects...');
        const failing = await trendingService.getFailingProjects({
            limit: 3,
            timePeriod: '30d'
        });
        
        console.log(`✅ Found ${failing.failing_projects.length} failing projects`);
        if (failing.failing_projects.length > 0) {
            const worst = failing.failing_projects[0];
            console.log(`   Highest risk: ${worst.business_name} (Risk: ${worst.risk_score})`);
        }
        
        // Test 3: Analyze trends for a specific project
        if (trending.trending_projects.length > 0) {
            const projectAddress = trending.trending_projects[0].contract_address;
            console.log(`\n🔍 Test 3: Analyzing trends for ${projectAddress}...`);
            
            const analysis = await trendingService.analyzeTrends(projectAddress, '30d');
            console.log(`✅ Trend analysis complete:`);
            console.log(`   Direction: ${analysis.trend_direction}`);
            console.log(`   Growth Score: ${analysis.growth_score}`);
            console.log(`   Risk Level: ${analysis.risk_level}`);
        }
        
        // Test 4: Get category rankings
        console.log('\n🏷️ Test 4: Getting DeFi category rankings...');
        const defiRankings = await trendingService.getCategoryRankings('DeFi', {
            limit: 3,
            timePeriod: '30d'
        });
        
        console.log(`✅ Found ${defiRankings.trending_projects.length} DeFi projects`);
        
        // Test 5: Calculate growth score
        console.log('\n📊 Test 5: Testing growth score calculation...');
        const testMetrics = {
            total_customers: 150,
            total_transactions: 2500,
            total_revenue_eth: 5.5,
            success_rate: 85,
            customer_retention_rate_percent: 70
        };
        
        const growthScore = trendingService.calculateGrowthScore(testMetrics);
        console.log(`✅ Growth score calculated: ${growthScore}`);
        
        console.log('\n🎉 All trending service tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await trendingService.close();
    }
}

// Run the tests
testTrendingService().catch(console.error);