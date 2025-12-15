#!/usr/bin/env node

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { Pool } from 'pg';
import axios from 'axios';

dotenv.config();

class SmartIndexer {
  constructor() {
    this.providers = new Map();
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });
  }

  // Auto-detect chain from contract address
  async detectChain(address) {
    const chains = {
      1: process.env.ETH_RPC_URL,
      137: process.env.POLYGON_RPC_URL,
      4202: process.env.LISK_RPC_URL,
      11155111: process.env.SEPOLIA_RPC_URL,
      42161: process.env.ARBITRUM_RPC_URL,
      10: process.env.OPTIMISM_RPC_URL
    };

    for (const [chainId, rpcUrl] of Object.entries(chains)) {
      if (!rpcUrl) continue;
      
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const code = await provider.getCode(address);
        
        if (code !== '0x') {
          console.log(`✅ Contract found on chain ${chainId}`);
          this.providers.set(parseInt(chainId), provider);
          return parseInt(chainId);
        }
      } catch (error) {
        console.warn(`Chain ${chainId} check failed: ${error.message}`);
      }
    }
    
    throw new Error(`Contract ${address} not found on any configured chain`);
  }

  // Get contract ABI from explorer APIs
  async getContractABI(chainId, address) {
    const apis = {
      1: `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`,
      137: `https://api.polygonscan.com/api?module=contract&action=getabi&address=${address}&apikey=${process.env.POLYGONSCAN_API_KEY}`,
      42161: `https://api.arbiscan.io/api?module=contract&action=getabi&address=${address}&apikey=${process.env.ARBISCAN_API_KEY}`
    };

    const apiUrl = apis[chainId];
    if (!apiUrl) {
      return this.getGenericABI(); // Fallback to generic ERC20/721 ABI
    }

    try {
      const response = await axios.get(apiUrl);
      if (response.data.status === '1') {
        return JSON.parse(response.data.result);
      }
    } catch (error) {
      console.warn(`ABI fetch failed: ${error.message}`);
    }

    return this.getGenericABI();
  }

  getGenericABI() {
    return [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function name() view returns (string)",
      "function symbol() view returns (string)"
    ];
  }

  // Index contract with auto-detection
  async indexContract(address, startBlock = 'latest') {
    console.log(`🔍 Analyzing contract: ${address}`);
    
    // Auto-detect chain
    const chainId = await this.detectChain(address);
    const provider = this.providers.get(chainId);
    
    // Get ABI
    const abi = await this.getContractABI(chainId, address);
    const contract = new ethers.Contract(address, abi, provider);
    
    // Get contract info
    const [currentBlock, code] = await Promise.all([
      provider.getBlockNumber(),
      provider.getCode(address)
    ]);

    console.log(`📊 Chain: ${chainId}, Current Block: ${currentBlock}`);
    
    // Determine start block
    const fromBlock = startBlock === 'latest' ? Math.max(0, currentBlock - 1000) : startBlock;
    
    // Get events
    const filter = {
      address: address,
      fromBlock: fromBlock,
      toBlock: currentBlock
    };
    
    const logs = await provider.getLogs(filter);
    console.log(`📝 Found ${logs.length} events`);

    // Process events
    for (const log of logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        await this.saveEvent(chainId, address, log, parsedLog);
      } catch (error) {
        console.warn(`Failed to parse log: ${error.message}`);
      }
    }

    // Get recent transactions
    await this.getRecentTransactions(chainId, address, provider, fromBlock, currentBlock);
    
    return {
      chainId,
      address,
      eventsFound: logs.length,
      currentBlock
    };
  }

  async getRecentTransactions(chainId, address, provider, fromBlock, toBlock) {
    // This is a simplified approach - in production you'd use event logs to find tx hashes
    console.log(`🔄 Scanning transactions from block ${fromBlock} to ${toBlock}`);
    
    const batchSize = 100;
    let txCount = 0;
    
    for (let blockNum = fromBlock; blockNum <= toBlock; blockNum += batchSize) {
      const endBlock = Math.min(blockNum + batchSize - 1, toBlock);
      
      try {
        const logs = await provider.getLogs({
          address: address,
          fromBlock: blockNum,
          toBlock: endBlock
        });
        
        const txHashes = [...new Set(logs.map(log => log.transactionHash))];
        
        for (const txHash of txHashes) {
          const tx = await provider.getTransaction(txHash);
          const receipt = await provider.getTransactionReceipt(txHash);
          
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            await this.saveTransaction(chainId, address, tx, receipt);
            txCount++;
          }
        }
      } catch (error) {
        console.warn(`Block range ${blockNum}-${endBlock} failed: ${error.message}`);
      }
    }
    
    console.log(`💾 Saved ${txCount} transactions`);
  }

  async saveEvent(chainId, contractAddress, log, parsedLog) {
    await this.pool.query(`
      INSERT INTO contract_events (
        chain_id, contract_address, transaction_hash, block_number,
        event_name, decoded_params, raw_data, log_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (chain_id, transaction_hash, log_index) DO NOTHING
    `, [
      chainId, contractAddress, log.transactionHash, log.blockNumber,
      parsedLog.name, JSON.stringify(parsedLog.args), log.data, log.logIndex
    ]);
  }

  async saveTransaction(chainId, contractAddress, tx, receipt) {
    const functionSelector = tx.data?.substring(0, 10) || null;
    
    await this.pool.query(`
      INSERT INTO contract_transactions (
        chain_id, contract_address, transaction_hash, block_number,
        from_address, to_address, value_eth, gas_used, function_selector,
        transaction_status, raw_input
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (chain_id, transaction_hash) DO NOTHING
    `, [
      chainId, contractAddress, tx.hash, receipt.blockNumber,
      tx.from, tx.to, ethers.formatEther(tx.value || 0),
      receipt.gasUsed.toString(), functionSelector,
      receipt.status, tx.data
    ]);
  }

  async initDatabase() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS contract_events (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        decoded_params JSONB,
        raw_data TEXT,
        log_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash, log_index)
      );
      
      CREATE TABLE IF NOT EXISTS contract_transactions (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42),
        value_eth DECIMAL(36,18) DEFAULT 0,
        gas_used BIGINT,
        function_selector VARCHAR(10),
        transaction_status INTEGER,
        raw_input TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash)
      );
    `);
    
    console.log('✅ Database initialized');
  }
}

// CLI Usage
async function main() {
  const indexer = new SmartIndexer();
  await indexer.initDatabase();
  
  const address = process.argv[2];
  const startBlock = process.argv[3] || 'latest';
  
  if (!address) {
    console.log('Usage: node smart-indexer.js <contract_address> [start_block]');
    console.log('Example: node smart-indexer.js 0xAFa60A2E2691958c3e7956A6D68D2eCF746FEa54');
    process.exit(1);
  }
  
  try {
    const result = await indexer.indexContract(address, startBlock);
    console.log('\n✅ Indexing complete:', result);
  } catch (error) {
    console.error('❌ Indexing failed:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default SmartIndexer;
