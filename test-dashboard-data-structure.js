#!/usr/bin/env node

/**
 * Test dashboard data structure from onboarding API
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testDashboardDataStructure() {
  console.log('🧪 Testing dashboard data structure...');
  
  try {
    // You'll need to replace this with a real JWT token from a logged-in user
    const JWT_TOKEN = 'your-jwt-token-here';
    
    if (JWT_TOKEN === 'your-jwt-token-here') {
      console.log('⚠️  Please set a real JWT token in the test script');
      console.log('   You can get one by logging in and checking the browser dev tools');
      return;
    }
    
    const response = await fetch('http://localhost:5000/api/onboarding/default-contract', {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 API Response Structure:');
    console.log('- Has contract:', !!data.contract);
    console.log('- Has metrics:', !!data.metrics);
    console.log('- Has fullResults:', !!data.fullResults);
    console.log('- Has indexingStatus:', !!data.indexingStatus);
    console.log('- Has analysisHistory:', !!data.analysisHistory);
    console.log('- Has analysisError:', !!data.analysisError);
    
    if (data.fullResults) {
      console.log('\n📋 Full Results Structure:');
      console.log('- Has fullReport:', !!data.fullResults.fullReport);
      console.log('- Has contract info:', !!data.fullResults.contract);
      console.log('- Has chain info:', !!data.fullResults.chain);
      console.log('- Has transactions count:', data.fullResults.transactions || 0);
      
      if (data.fullResults.fullReport) {
        const report = data.fullResults.fullReport;
        console.log('\n📈 Full Report Contents:');
        console.log('- Has summary:', !!report.summary);
        console.log('- Has defiMetrics:', !!report.defiMetrics);
        console.log('- Has userBehavior:', !!report.userBehavior);
        console.log('- Has gasAnalysis:', !!report.gasAnalysis);
        console.log('- Has users array:', !!report.users);
        console.log('- Has transactions array:', !!report.transactions);
        console.log('- Has events array:', !!report.events);
        console.log('- Has recommendations:', !!report.recommendations);
        console.log('- Has alerts:', !!report.alerts);
        
        if (report.summary) {
          console.log('\n📊 Summary Metrics:');
          console.log('- Total Transactions:', report.summary.totalTransactions);
          console.log('- Unique Users:', report.summary.uniqueUsers);
          console.log('- Total Value:', report.summary.totalValue);
          console.log('- Success Rate:', report.summary.successRate);
        }
        
        if (report.defiMetrics) {
          console.log('\n💰 DeFi Metrics:');
          console.log('- TVL:', report.defiMetrics.tvl);
          console.log('- DAU:', report.defiMetrics.dau);
          console.log('- Transaction Volume:', report.defiMetrics.transactionVolume24h);
          console.log('- Protocol Revenue:', report.defiMetrics.protocolRevenue);
        }
        
        if (report.userBehavior) {
          console.log('\n👥 User Behavior Metrics:');
          console.log('- Loyalty Score:', report.userBehavior.loyaltyScore);
          console.log('- Bot Activity:', report.userBehavior.botActivity);
          console.log('- Whale Ratio:', report.userBehavior.whaleRatio);
          console.log('- Cross Chain Users:', report.userBehavior.crossChainUsers);
        }
        
        console.log('\n✅ SUCCESS: Full comprehensive metrics are available!');
      } else {
        console.log('❌ No fullReport found in fullResults');
      }
    } else {
      console.log('❌ No fullResults found in API response');
      console.log('Analysis Error:', data.analysisError);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardDataStructure().catch(console.error);