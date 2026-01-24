#!/usr/bin/env node

/**
 * Report Manager Utility
 * Manage and view organized smart contract analysis reports
 */

import { ReportGenerator } from './src/services/ReportGenerator.js';
import fs from 'fs';
import path from 'path';

class ReportManager {
  constructor() {
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * List all analyzed contracts
   */
  listContracts() {
    console.log('📊 Smart Contract Analysis Reports\n');
    console.log('=====================================\n');
    
    const contracts = this.reportGenerator.listAllContracts();
    
    if (contracts.length === 0) {
      console.log('No contracts analyzed yet. Run analysis first:\n');
      console.log('  npm run analyze\n');
      return;
    }

    contracts.forEach((contract, index) => {
      console.log(`${index + 1}. ${contract.contract}`);
      console.log(`   Total Reports: ${contract.totalReports}`);
      console.log(`   Chains:`);
      
      contract.chains.forEach(chain => {
        console.log(`     - ${chain.chain}: ${chain.reportCount} reports`);
      });
      
      console.log('');
    });
  }

  /**
   * Show reports for a specific contract
   */
  showContractReports(contractName, chain = null) {
    console.log(`📋 Reports for ${contractName}${chain ? ` on ${chain}` : ''}\n`);
    console.log('='.repeat(50) + '\n');
    
    const reports = this.reportGenerator.getContractReports(contractName, chain);
    
    if (reports.length === 0) {
      console.log(`No reports found for ${contractName}${chain ? ` on ${chain}` : ''}\n`);
      return;
    }

    reports.forEach((report, index) => {
      const date = new Date(report.timestamp).toLocaleString();
      const fileType = path.extname(report.file).slice(1).toUpperCase();
      
      console.log(`${index + 1}. ${fileType} Report - ${date}`);
      console.log(`   File: ${report.file}`);
      console.log(`   Path: ${report.path}`);
      console.log(`   Chain: ${report.chain}`);
      console.log('');
    });
  }

  /**
   * Show folder structure
   */
  showFolderStructure() {
    console.log('📁 Report Folder Structure\n');
    console.log('==========================\n');
    
    const baseDir = './reports';
    
    if (!fs.existsSync(baseDir)) {
      console.log('No reports directory found.\n');
      return;
    }

    this._printDirectoryTree(baseDir, '', true);
  }

  /**
   * Print directory tree structure
   * @private
   */
  _printDirectoryTree(dir, prefix = '', isLast = true) {
    const name = path.basename(dir);
    const connector = isLast ? '└── ' : '├── ';
    
    if (name !== 'reports') {
      console.log(prefix + connector + name);
    }
    
    try {
      const items = fs.readdirSync(dir);
      const directories = items.filter(item => {
        const itemPath = path.join(dir, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      const files = items.filter(item => {
        const itemPath = path.join(dir, item);
        return fs.statSync(itemPath).isFile();
      });

      // Show directories first
      directories.forEach((item, index) => {
        const isLastDir = index === directories.length - 1 && files.length === 0;
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        this._printDirectoryTree(path.join(dir, item), newPrefix, isLastDir);
      });

      // Show files
      files.forEach((item, index) => {
        const isLastFile = index === files.length - 1;
        const fileConnector = isLastFile ? '└── ' : '├── ';
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        
        // Add file type icon
        let icon = '📄';
        if (item.endsWith('.json')) icon = '📊';
        if (item.endsWith('.md')) icon = '📝';
        if (item.endsWith('.csv')) icon = '📈';
        if (item === 'README.md') icon = '📋';
        
        console.log(newPrefix + fileConnector + icon + ' ' + item);
      });
    } catch (error) {
      console.log(prefix + '    [Error reading directory]');
    }
  }

  /**
   * Clean old reports (keep only latest N reports per contract)
   */
  cleanOldReports(keepCount = 5) {
    console.log(`🧹 Cleaning old reports (keeping latest ${keepCount} per contract)\n`);
    
    const contracts = this.reportGenerator.listAllContracts();
    let totalCleaned = 0;
    
    contracts.forEach(contract => {
      contract.chains.forEach(chainInfo => {
        const reports = this.reportGenerator.getContractReports(contract.contract, chainInfo.chain);
        
        if (reports.length > keepCount) {
          // Sort by timestamp (newest first) and remove old ones
          const sortedReports = reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const toDelete = sortedReports.slice(keepCount);
          
          toDelete.forEach(report => {
            try {
              fs.unlinkSync(report.path);
              console.log(`   Deleted: ${report.file}`);
              totalCleaned++;
            } catch (error) {
              console.warn(`   Failed to delete ${report.file}: ${error.message}`);
            }
          });
        }
      });
    });
    
    console.log(`\n✅ Cleaned ${totalCleaned} old report files\n`);
  }

  /**
   * Export contract summary
   */
  exportSummary(outputPath = './contract-analysis-summary.json') {
    console.log('📤 Exporting contract analysis summary...\n');
    
    const contracts = this.reportGenerator.listAllContracts();
    const summary = {
      generatedAt: new Date().toISOString(),
      totalContracts: contracts.length,
      totalReports: contracts.reduce((sum, c) => sum + c.totalReports, 0),
      contracts: contracts.map(contract => ({
        name: contract.contract,
        totalReports: contract.totalReports,
        chains: contract.chains,
        latestReports: contract.chains.map(chain => {
          const reports = this.reportGenerator.getContractReports(contract.contract, chain.chain);
          const latest = reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
          return {
            chain: chain.chain,
            latestReport: latest ? {
              timestamp: latest.timestamp,
              file: latest.file,
              path: latest.path
            } : null
          };
        })
      }))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary exported to: ${outputPath}\n`);
  }
}

// CLI Interface
const manager = new ReportManager();
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'list':
  case 'ls':
    manager.listContracts();
    break;
    
  case 'show':
    const contractName = args[1];
    const chain = args[2];
    if (!contractName) {
      console.log('Usage: node report-manager.js show <contract-name> [chain]');
      process.exit(1);
    }
    manager.showContractReports(contractName, chain);
    break;
    
  case 'tree':
  case 'structure':
    manager.showFolderStructure();
    break;
    
  case 'clean':
    const keepCount = parseInt(args[1]) || 5;
    manager.cleanOldReports(keepCount);
    break;
    
  case 'summary':
    const outputPath = args[1] || './contract-analysis-summary.json';
    manager.exportSummary(outputPath);
    break;
    
  case 'help':
  case '--help':
  case '-h':
  default:
    console.log(`
📊 Report Manager - Smart Contract Analysis Reports

Usage:
  node report-manager.js <command> [options]

Commands:
  list, ls                     List all analyzed contracts
  show <contract> [chain]      Show reports for specific contract
  tree, structure              Show folder structure
  clean [keep-count]           Clean old reports (default: keep 5)
  summary [output-file]        Export analysis summary
  help                         Show this help

Examples:
  node report-manager.js list
  node report-manager.js show usdt lisk
  node report-manager.js tree
  node report-manager.js clean 3
  node report-manager.js summary ./my-summary.json
`);
    break;
}