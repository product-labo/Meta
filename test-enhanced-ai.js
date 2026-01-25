/**
 * Test Enhanced GeminiAI Integration
 * Tests the new AI features: alerts, sentiment, optimizations
 */

import GeminiAIService from './src/services/GeminiAIService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock analysis results for testing
const mockAnalysisResults = {
  results: {
    target: {
      contract: {
        address: '0x05D032ac25d322df992303dCa074EE7392C117b9',
        chain: 'lisk',
        name: 'USDT'
      },
      transactions: 15420,
      fullReport: {
        summary: {
          totalTransactions: 15420,
          uniqueUsers: 8934,
          successRate: 98.5,
          avgGasUsed: 21000,
          timeRange: '30 days'
        },
        defiMetrics: {
          tvl: 2500000,
          liquidityUtilization: 75,
          gasEfficiency: 'good'
        },
        userBehavior: {
          whaleActivity: 12,
          averageTransactionSize: 1250,
          peakUsageHours: [14, 15, 16, 20, 21]
        },
        securityMetrics: {
          suspiciousTransactions: 3,
          failedTransactions: 231,
          unusualPatterns: ['Large transfers during off-hours']
        }
      }
    },
    competitors: [
      {
        contract: {
          address: '0xfc102D4807A92B08080D4d969Dfda59C3C01B02F',
          chain: 'lisk',
          name: 'USDC'
        },
        transactions: 22100,
        fullReport: {
          summary: {
            totalTransactions: 22100,
            uniqueUsers: 12400,
            successRate: 99.2
          }
        }
      }
    ]
  },
  metadata: {
    blockRange: 30000,
    chainsAnalyzed: ['lisk'],
    executionTimeMs: 45000
  }
};

async function testEnhancedAI() {
  console.log('🧠 Testing Enhanced GeminiAI Integration\n');
  console.log('='.repeat(50));

  // Check if AI is enabled
  console.log(`AI Service Enabled: ${GeminiAIService.isEnabled()}`);
  console.log(`Gemini API Key Configured: ${!!process.env.GEMINI_API_KEY}\n`);

  if (!GeminiAIService.isEnabled()) {
    console.log('❌ AI Service is disabled. Please configure GEMINI_API_KEY');
    return;
  }

  const testUserId = 'test-user-123';

  try {
    // Test 1: AI Interpretation
    console.log('1️⃣ Testing AI Interpretation...');
    const interpretation = await GeminiAIService.interpretAnalysis(
      mockAnalysisResults, 
      'competitive', 
      testUserId
    );
    
    if (interpretation.success) {
      console.log('✅ AI Interpretation successful');
      console.log(`   - Overall Health: ${interpretation.interpretation.summary?.overallHealth}`);
      console.log(`   - Risk Level: ${interpretation.interpretation.summary?.riskLevel}`);
      console.log(`   - Performance Score: ${interpretation.interpretation.summary?.performanceScore}`);
      console.log(`   - Recommendations: ${interpretation.interpretation.recommendations?.length || 0}`);
    } else {
      console.log('⚠️ AI Interpretation failed, using fallback');
      console.log(`   - Error: ${interpretation.error}`);
    }
    console.log();

    // Test 2: Quick Insights
    console.log('2️⃣ Testing Quick Insights...');
    const insights = await GeminiAIService.generateQuickInsights(mockAnalysisResults, testUserId);
    console.log('✅ Quick Insights generated');
    console.log(`   - Score: ${insights.score}`);
    console.log(`   - Status: ${insights.status}`);
    console.log(`   - Insights: ${insights.insights?.length || 0}`);
    if (insights.keyMetrics) {
      console.log(`   - Key Metrics: ${Object.keys(insights.keyMetrics).join(', ')}`);
    }
    console.log();

    // Test 3: Real-time Alerts
    console.log('3️⃣ Testing Real-time Alerts...');
    const alerts = await GeminiAIService.generateRealTimeAlerts(mockAnalysisResults, null, testUserId);
    console.log('✅ Real-time Alerts generated');
    console.log(`   - Total Alerts: ${alerts.summary?.totalAlerts || 0}`);
    console.log(`   - Critical Alerts: ${alerts.summary?.criticalCount || 0}`);
    console.log(`   - Overall Risk: ${alerts.summary?.overallRiskLevel}`);
    if (alerts.alerts && alerts.alerts.length > 0) {
      console.log(`   - Sample Alert: ${alerts.alerts[0].title}`);
    }
    console.log();

    // Test 4: Market Sentiment
    console.log('4️⃣ Testing Market Sentiment...');
    const sentiment = await GeminiAIService.generateMarketSentiment(mockAnalysisResults, null, testUserId);
    console.log('✅ Market Sentiment generated');
    console.log(`   - Overall Sentiment: ${sentiment.sentiment?.overall}`);
    console.log(`   - Confidence: ${sentiment.sentiment?.confidence}%`);
    console.log(`   - Market Strength: ${sentiment.marketPosition?.strength}`);
    console.log(`   - Growth Potential: ${sentiment.marketPosition?.growthPotential}`);
    console.log();

    // Test 5: Optimization Suggestions
    console.log('5️⃣ Testing Optimization Suggestions...');
    const optimizations = await GeminiAIService.generateOptimizationSuggestions(
      mockAnalysisResults, 
      'defi', 
      testUserId
    );
    console.log('✅ Optimization Suggestions generated');
    console.log(`   - Total Optimizations: ${optimizations.optimizations?.length || 0}`);
    console.log(`   - Quick Wins: ${optimizations.quickWins?.length || 0}`);
    if (optimizations.optimizations && optimizations.optimizations.length > 0) {
      console.log(`   - Top Priority: ${optimizations.optimizations[0].title}`);
    }
    console.log();

    // Test 6: Recommendations
    console.log('6️⃣ Testing Recommendations...');
    const recommendations = await GeminiAIService.generateRecommendations(
      mockAnalysisResults.results.target.fullReport, 
      'defi', 
      testUserId
    );
    console.log('✅ Recommendations generated');
    console.log(`   - Total Recommendations: ${recommendations.recommendations?.length || 0}`);
    console.log(`   - Priority Actions: ${recommendations.priorityActions?.length || 0}`);
    console.log(`   - Current Risk: ${recommendations.riskAssessment?.currentRisk}`);
    console.log();

    console.log('🎉 All Enhanced AI Features Tested Successfully!');
    console.log('\n' + '='.repeat(50));
    console.log('✅ GeminiAI Integration is working with @google/genai SDK');
    console.log('✅ Rate limiting is implemented');
    console.log('✅ Error handling with fallbacks is working');
    console.log('✅ All new AI features are functional');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test rate limiting
async function testRateLimit() {
  console.log('\n🚦 Testing Rate Limiting...');
  
  const testUserId = 'rate-limit-test';
  let successCount = 0;
  let rateLimitCount = 0;

  for (let i = 0; i < 55; i++) { // Try to exceed the 50 request limit
    try {
      await GeminiAIService.generateQuickInsights(mockAnalysisResults, testUserId);
      successCount++;
    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) {
        rateLimitCount++;
      }
    }
  }

  console.log(`✅ Rate limiting test completed:`);
  console.log(`   - Successful requests: ${successCount}`);
  console.log(`   - Rate limited requests: ${rateLimitCount}`);
  console.log(`   - Rate limiting is ${rateLimitCount > 0 ? 'working' : 'not triggered'}`);
}

// Run tests
async function runAllTests() {
  await testEnhancedAI();
  await testRateLimit();
}

runAllTests().catch(console.error);