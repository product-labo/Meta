import 'dotenv/config';
import ZcashAnalytics from './src/services/zcashAnalytics.js';

async function runAnalytics() {
  const analytics = new ZcashAnalytics();
  
  // Replace with actual Zcash address
  const address = 't1RyCw14wRXrh3mp21uxgr9ynjem7cNUkMH';
  
  try {
    console.log('Analyzing wallet data...');
    const analysis = await analytics.analyzeWalletData(address);
    
    console.log('Analysis Results:');
    console.log(`Address: ${analysis.address}`);
    console.log(`Total Transactions: ${analysis.summary.totalTransactions}`);
    console.log(`Total Value: ${analysis.summary.totalValue} ZEC`);
    console.log(`Average Value: ${analysis.summary.avgValue} ZEC`);
    
    if (analysis.recurringPatterns.length > 0) {
      console.log('Recurring Patterns Found:', analysis.recurringPatterns);
    }
    
    // Save to database
    await analytics.saveAnalysis(analysis);
    console.log('Analysis saved to database');
    
  } catch (error) {
    console.error('Error running analytics:', error);
  }
}

runAnalytics();