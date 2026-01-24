/**
 * Multi-Chain Smart Contract Analytics Platform
 * Main Entry Point
 */

import { DeFiMetricsCalculator } from './services/DeFiMetricsCalculator.js';
import { UserBehaviorAnalyzer } from './services/UserBehaviorAnalyzer.js';
import { SmartContractFetcher } from './services/SmartContractFetcher.js';
import { ChainNormalizer } from './services/ChainNormalizer.js';
import { ReportGenerator } from './services/ReportGenerator.js';

export class AnalyticsEngine {
  constructor(config = {}) {
    this.config = config;
    this.fetcher = new SmartContractFetcher({
      maxRequestsPerSecond: 5, // Slower rate
      failoverTimeout: 30000,  // 30 second timeout
      maxRetries: 2,
      ...config
    });
    this.normalizer = new ChainNormalizer();
    this.defiCalculator = new DeFiMetricsCalculator();
    this.behaviorAnalyzer = new UserBehaviorAnalyzer();
    this.reportGenerator = new ReportGenerator();
  }

  async analyzeContract(contractAddress, chain = 'ethereum', contractName = null) {
    console.log(`📊 Analyzing ${contractAddress} on ${chain}...`);
    
    try {
      // Get block range configuration from environment or use default
      const blockRange = parseInt(process.env.ANALYSIS_BLOCK_RANGE) || 1000;
      
      // Fetch contract data - configurable block range for comprehensive analysis
      const currentBlock = await this.fetcher.getCurrentBlockNumber(chain);
      const fromBlock = Math.max(0, currentBlock - blockRange);
      const toBlock = currentBlock;
      
      console.log(`   Fetching transactions from block ${fromBlock} to ${toBlock} (${toBlock - fromBlock + 1} blocks)...`);
      
      const transactions = await this.fetcher.fetchTransactions(
        contractAddress, 
        fromBlock, 
        toBlock, 
        chain
      );
      
      console.log(`   Found ${transactions.length} transactions`);
      
      // Normalize data
      const normalizedTxs = this.normalizer.normalizeTransactions(transactions, chain);
      console.log(`   Normalized ${normalizedTxs.length} transactions`);
      
      // Calculate basic metrics (simplified for now)
      const basicMetrics = {
        totalTransactions: normalizedTxs.length,
        uniqueUsers: new Set(normalizedTxs.map(tx => tx.from_address)).size,
        totalValue: normalizedTxs.reduce((sum, tx) => sum + parseFloat(tx.value_eth || 0), 0),
        avgGasUsed: normalizedTxs.length > 0 ? 
          normalizedTxs.reduce((sum, tx) => sum + parseInt(tx.gas_used || 0), 0) / normalizedTxs.length : 0
      };
      
      // Extract users for basic analysis
      const users = this.extractUsers(normalizedTxs);
      console.log(`   Extracted ${users.length} unique users`);

      // Create comprehensive report
      const report = {
        metadata: {
          contractAddress,
          contractName: contractName || this._extractContractName(contractAddress),
          contractChain: chain,
          generatedAt: new Date().toISOString(),
          blockRange: { from: fromBlock, to: toBlock }
        },
        summary: {
          totalTransactions: normalizedTxs.length,
          uniqueUsers: users.length,
          totalValue: basicMetrics.totalValue,
          avgGasUsed: basicMetrics.avgGasUsed
        },
        analytics: {
          metrics: basicMetrics,
          behavior: { 
            userCount: users.length, 
            avgTransactionsPerUser: users.length > 0 ? normalizedTxs.length / users.length : 0 
          },
          transactions: normalizedTxs.slice(0, 10), // Sample transactions
          users: users.slice(0, 5) // Sample users
        }
      };

      // Generate organized reports
      const contractInfo = {
        contractAddress,
        contractName: contractName || this._extractContractName(contractAddress),
        contractChain: chain
      };

      const exportResults = this.reportGenerator.exportAllFormats(report, contractInfo);
      
      console.log(`   📁 Reports generated:`);
      if (exportResults.json.success) console.log(`      JSON: ${exportResults.json.path}`);
      if (exportResults.csv.success) console.log(`      CSV: ${exportResults.csv.path}`);
      if (exportResults.markdown.success) console.log(`      Markdown: ${exportResults.markdown.path}`);
      
      return {
        contract: contractAddress,
        chain,
        metrics: basicMetrics,
        behavior: { userCount: users.length, avgTransactionsPerUser: users.length > 0 ? normalizedTxs.length / users.length : 0 },
        transactions: normalizedTxs.length,
        blockRange: { from: fromBlock, to: toBlock },
        users: users.slice(0, 5), // Show first 5 users as sample
        reportPaths: exportResults
      };
    } catch (error) {
      console.error(`   Error during analysis: ${error.message}`);
      
      // Return basic info even if analysis fails
      return {
        contract: contractAddress,
        chain,
        metrics: { error: error.message },
        behavior: null,
        transactions: 0,
        blockRange: null
      };
    }
  }

  extractUsers(transactions) {
    const userMap = new Map();
    
    transactions.forEach(tx => {
      if (!userMap.has(tx.from)) {
        userMap.set(tx.from, {
          address: tx.from,
          transactionCount: 0,
          totalVolume: 0n,
          firstSeen: tx.timestamp,
          lastSeen: tx.timestamp
        });
      }
      
      const user = userMap.get(tx.from);
      user.transactionCount++;
      user.totalVolume += BigInt(tx.value || 0);
      user.lastSeen = Math.max(user.lastSeen, tx.timestamp);
    });
    
    return Array.from(userMap.values());
  }

  /**
   * Extract contract name from address for folder naming
   * @private
   */
  _extractContractName(address) {
    if (!address) return 'unknown-contract';
    
    // Use first 8 and last 4 characters for readability
    if (address.length >= 12) {
      return `${address.slice(0, 8)}...${address.slice(-4)}`;
    }
    
    return address;
  }

  /**
   * Get all reports for a contract
   * @param {string} contractName - Contract name or address
   * @param {string} chain - Blockchain network (optional)
   * @returns {Array} List of reports
   */
  getContractReports(contractName, chain = null) {
    return this.reportGenerator.getContractReports(contractName, chain);
  }

  /**
   * List all analyzed contracts
   * @returns {Array} List of contracts with report counts
   */
  listAllContracts() {
    return this.reportGenerator.listAllContracts();
  }
}

export default AnalyticsEngine;
