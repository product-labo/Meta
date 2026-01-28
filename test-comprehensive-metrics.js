#!/usr/bin/env node

/**
 * Test comprehensive metrics generation and display
 */

import dotenv from 'dotenv';
import { AnalyticsEngine } from './src/index.js';

dotenv.config();

async function testComprehensiveMetrics() {
  console.log('🧪 Testing comprehensive metrics generation...');
  
  try {
    const engine = new AnalyticsEngine({
      maxRequestsPerSecond: 5,
      failoverTimeout: 15000,
      maxRetries: 1
    });
    
    console.log('✅ AnalyticsEngine created successfully');
    
    // Test with Lisk contract (known to work)
    console.log('🔍 Testing Lisk analysis for comprehensive metrics...');
    const results = await engine.analyzeContract(
      '0x05D032ac25d322df992303dCa074EE7392C117b9', // Known working Lisk contract
      'lisk',
      'Test Contract',
      500 // Smaller block range for faster test
    );
    
    console.log('📊 Analysis Results Summary:');
    console.log('- Contract:', results.contract);
    console.log('- Chain:', results.chain);
    console.log('- Transactions:', results.transactions);
    console.log('- Has Full Report:', !!results.fullReport);
    
    if (results.fullReport) {
      const report = results.fullReport;
      
      console.log('\n📋 DeFi Metrics Available:');
      const defiMetrics = report.defiMetrics || {};
      console.log('- TVL:', defiMetrics.tvl);
      console.log('- DAU:', defiMetrics.dau);
      console.log('- MAU:', defiMetrics.mau);
      console.log('- Transaction Volume:', defiMetrics.transactionVolume24h);
      console.log('- Protocol Revenue:', defiMetrics.protocolRevenue);
      console.log('- Gas Efficiency:', defiMetrics.gasEfficiency);
      console.log('- Active Pools:', defiMetrics.activePoolsCount);
      console.log('- Cross-Chain Volume:', defiMetrics.crossChainVolume);
      
      console.log('\n👥 User Behavior Metrics Available:');
      const userBehavior = report.userBehavior || {};
      console.log('- Loyalty Score:', userBehavior.loyaltyScore);
      console.log('- Bot Activity:', userBehavior.botActivity);
      console.log('- Whale Ratio:', userBehavior.whaleRatio);
      console.log('- Risk Tolerance:', userBehavior.riskToleranceLevel);
      console.log('- Cross-Chain Users:', userBehavior.crossChainUsers);
      console.log('- MEV Exposure:', userBehavior.mevExposure);
      console.log('- Arbitrage Opportunities:', userBehavior.arbitrageOpportunities);
      
      console.log('\n⛽ Gas Analysis Available:');
      const gasAnalysis = report.gasAnalysis || {};
      console.log('- Average Gas Price:', gasAnalysis.averageGasPrice);
      console.log('- Average Gas Used:', gasAnalysis.averageGasUsed);
      console.log('- Gas Efficiency Score:', gasAnalysis.gasEfficiencyScore);
      console.log('- Failed Transactions:', gasAnalysis.failedTransactions);
      
      console.log('\n📈 Additional Data Available:');
      console.log('- Users Count:', report.users?.length || 0);
      console.log('- Events Count:', report.events?.length || 0);
      console.log('- Recommendations Count:', report.recommendations?.length || 0);
      console.log('- Alerts Count:', report.alerts?.length || 0);
      
      // Count total metrics available
      let totalMetrics = 0;
      
      // Count DeFi metrics
      if (defiMetrics) {
        totalMetrics += Object.keys(defiMetrics).length;
      }
      
      // Count user behavior metrics
      if (userBehavior) {
        totalMetrics += Object.keys(userBehavior).length;
        if (userBehavior.userClassifications) {
          totalMetrics += Object.keys(userBehavior.userClassifications).length;
        }
      }
      
      // Count gas analysis metrics
      if (gasAnalysis) {
        totalMetrics += Object.keys(gasAnalysis).length;
      }
      
      console.log(`\n🎯 TOTAL METRICS GENERATED: ${totalMetrics}`);
      
      if (totalMetrics >= 40) {
        console.log('✅ SUCCESS: Comprehensive metrics are being generated!');
      } else {
        console.log('⚠️  WARNING: Some metrics may be missing');
      }
      
    } else {
      console.log('❌ FAILED: No full report generated');
      console.log('Error:', results.metrics?.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run with timeout
const timeout = setTimeout(() => {
  console.log('⏰ Test timeout - taking too long');
  process.exit(1);
}, 45000); // 45 second timeout

testComprehensiveMetrics()
  .then(() => {
    clearTimeout(timeout);
    console.log('\n🎉 Comprehensive metrics test completed');
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(timeout);
    console.error('💥 Test error:', error);
    process.exit(1);
  });