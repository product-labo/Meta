#!/usr/bin/env node

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import axios from 'axios';
import { RpcProvider, Contract, CallData, num } from 'starknet';

dotenv.config();

class UltimateStarknetIndexer extends EventEmitter {
  constructor() {
    super();
    
    // Chain configurations with EVM and Starknet support
    this.chains = {
      // EVM Chains
      1: { name: 'Ethereum', type: 'evm', rpcs: [process.env.ETH_RPC_URL, 'https://ethereum-rpc.publicnode.com'], explorer: 'https://api.etherscan.io/api', apiKey: process.env.ETHERSCAN_API_KEY },
      137: { name: 'Polygon', type: 'evm', rpcs: [process.env.POLYGON_RPC_URL, 'https://polygon-bor-rpc.publicnode.com'], explorer: 'https://api.polygonscan.com/api', apiKey: process.env.POLYGONSCAN_API_KEY },
      42161: { name: 'Arbitrum', type: 'evm', rpcs: [process.env.ARBITRUM_RPC_URL, 'https://arbitrum-one-rpc.publicnode.com'], explorer: 'https://api.arbiscan.io/api', apiKey: process.env.ARBISCAN_API_KEY },
      4202: { name: 'Lisk Sepolia', type: 'evm', rpcs: [process.env.LISK_SEPOLIA_RPC_URL, 'https://rpc.sepolia-api.lisk.com'] },
      
      // Starknet Chains
      'SN_MAIN': { name: 'Starknet Mainnet', type: 'starknet', rpcs: [process.env.STARKNET_RPC_URL, 'https://starknet-mainnet.public.blastapi.io'], explorer: 'https://voyager.online' },
      'SN_SEPOLIA': { name: 'Starknet Sepolia', type: 'starknet', rpcs: [process.env.STARKNET_SEPOLIA_RPC_URL, 'https://starknet-sepolia.public.blastapi.io'], explorer: 'https://sepolia.voyager.online' }
    };

    this.providers = new Map();
    this.starknetProviders = new Map();
    this.contractCache = new Map();
    
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      max: 20,
    });

    this.stats = {
      totalContracts: 0,
      totalTransactions: 0,
      totalEvents: 0,
      chainsDetected: 0,
      evmContracts: 0,
      starknetContracts: 0,
      errors: 0
    };
  }

  // Auto-detect chain type and network for any contract
  async detectContractChain(address) {
    console.log(`🔍 Auto-detecting chain for contract: ${address}`);
    
    // Check if it's a Starknet address (starts with 0x and is 64+ chars or has specific pattern)
    if (this.isStarknetAddress(address)) {
      return await this.detectStarknetChain(address);
    } else {
      return await this.detectEVMChain(address);
    }
  }

  isStarknetAddress(address) {
    // Starknet addresses are typically longer or have specific patterns
    return address.length > 42 || address.startsWith('0x0') && address.length >= 60;
  }

  async detectStarknetChain(address) {
    console.log(`🔍 Checking Starknet networks for: ${address}`);
    
    const starknetChains = Object.entries(this.chains).filter(([_, config]) => config.type === 'starknet');
    
    for (const [chainId, config] of starknetChains) {
      try {
        const provider = await this.getStarknetProvider(chainId);
        
        // Try to get contract class hash (indicates contract exists)
        const classHash = await provider.getClassHashAt(address);
        
        if (classHash && classHash !== '0x0') {
          console.log(`✅ Starknet contract found on ${config.name}`);
          this.stats.starknetContracts++;
          return { chainId, type: 'starknet' };
        }
      } catch (error) {
        // Contract not found on this network
      }
    }
    
    throw new Error(`Starknet contract ${address} not found on any supported network`);
  }

  async detectEVMChain(address) {
    console.log(`🔍 Checking EVM networks for: ${address}`);
    
    const evmChains = Object.entries(this.chains).filter(([_, config]) => config.type === 'evm');
    
    const promises = evmChains.map(async ([chainId, config]) => {
      try {
        const provider = await this.getEVMProvider(parseInt(chainId));
        const code = await Promise.race([
          provider.getCode(address),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        if (code !== '0x') {
          return { chainId: parseInt(chainId), name: config.name, type: 'evm', codeSize: code.length };
        }
      } catch (error) {
        // Chain check failed
      }
      return null;
    });

    const results = await Promise.allSettled(promises);
    const validChains = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);

    if (validChains.length === 0) {
      throw new Error(`EVM contract ${address} not found on any supported chain`);
    }

    const bestChain = validChains.reduce((best, current) => 
      current.codeSize > best.codeSize ? current : best
    );

    console.log(`✅ EVM contract found on ${bestChain.name} (Chain ${bestChain.chainId})`);
    this.stats.evmContracts++;
    return bestChain;
  }

  // Get EVM provider with failover
  async getEVMProvider(chainId) {
    if (this.providers.has(chainId)) {
      return this.providers.get(chainId);
    }

    const config = this.chains[chainId];
    const rpcs = config.rpcs.filter(rpc => rpc && rpc !== 'undefined');
    
    for (const rpc of rpcs) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc);
        await provider.getBlockNumber();
        this.providers.set(chainId, provider);
        console.log(`✅ Connected to ${config.name} via ${rpc.substring(0, 50)}...`);
        return provider;
      } catch (error) {
        console.warn(`❌ Failed to connect to ${rpc}: ${error.message}`);
      }
    }

    throw new Error(`All EVM RPC endpoints failed for chain ${chainId}`);
  }

  // Get Starknet provider with failover
  async getStarknetProvider(chainId) {
    if (this.starknetProviders.has(chainId)) {
      return this.starknetProviders.get(chainId);
    }

    const config = this.chains[chainId];
    const rpcs = config.rpcs.filter(rpc => rpc && rpc !== 'undefined');
    
    for (const rpc of rpcs) {
      try {
        const provider = new RpcProvider({ nodeUrl: rpc });
        await provider.getChainId(); // Test connection
        this.starknetProviders.set(chainId, provider);
        console.log(`✅ Connected to ${config.name} via ${rpc.substring(0, 50)}...`);
        return provider;
      } catch (error) {
        console.warn(`❌ Failed to connect to Starknet RPC ${rpc}: ${error.message}`);
      }
    }

    throw new Error(`All Starknet RPC endpoints failed for chain ${chainId}`);
  }

  // Main indexing function - handles both EVM and Starknet
  async indexContract(address, startBlock = 'latest') {
    try {
      console.log(`\n🚀 Starting ultimate indexing for: ${address}`);
      
      // Step 1: Auto-detect chain and type
      const chainInfo = await this.detectContractChain(address);
      
      if (chainInfo.type === 'starknet') {
        return await this.indexStarknetContract(chainInfo.chainId, address, startBlock);
      } else {
        return await this.indexEVMContract(chainInfo.chainId, address, startBlock);
      }
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Indexing failed: ${error.message}`);
      throw error;
    }
  }

  // Index Starknet contract
  async indexStarknetContract(chainId, address, startBlock) {
    console.log(`🔷 Indexing Starknet contract on ${this.chains[chainId].name}`);
    
    const provider = await this.getStarknetProvider(chainId);
    
    // Get contract class and ABI
    const classHash = await provider.getClassHashAt(address);
    const contractClass = await provider.getClass(classHash);
    
    console.log(`📋 Contract class hash: ${classHash}`);
    
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = startBlock === 'latest' ? Math.max(0, currentBlock - 1000) : startBlock;
    
    console.log(`📊 Starknet blocks: ${fromBlock} to ${currentBlock}`);
    
    // Get events (Starknet events are in transaction receipts)
    let eventCount = 0;
    let txCount = 0;
    
    for (let blockNum = fromBlock; blockNum <= currentBlock; blockNum += 100) {
      const endBlock = Math.min(blockNum + 99, currentBlock);
      
      try {
        const block = await provider.getBlockWithTxs(blockNum);
        
        for (const tx of block.transactions) {
          // Check if transaction involves our contract
          if (tx.contract_address === address || 
              (tx.calldata && tx.calldata.includes(address.replace('0x', '')))) {
            
            const receipt = await provider.getTransactionReceipt(tx.transaction_hash);
            
            // Save Starknet transaction
            await this.saveStarknetTransaction(chainId, address, tx, receipt, blockNum);
            txCount++;
            
            // Process events from receipt
            if (receipt.events) {
              for (const event of receipt.events) {
                if (event.from_address === address) {
                  await this.saveStarknetEvent(chainId, address, tx.transaction_hash, event, blockNum);
                  eventCount++;
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to process Starknet block ${blockNum}: ${error.message}`);
      }
    }
    
    this.stats.totalEvents += eventCount;
    this.stats.totalTransactions += txCount;
    this.stats.totalContracts++;
    
    return {
      chainId,
      chainName: this.chains[chainId].name,
      type: 'starknet',
      address,
      classHash,
      events: eventCount,
      transactions: txCount
    };
  }

  // Index EVM contract (existing logic)
  async indexEVMContract(chainId, address, startBlock) {
    console.log(`🔶 Indexing EVM contract on ${this.chains[chainId].name}`);
    
    const provider = await this.getEVMProvider(chainId);
    
    // Auto-fetch ABI
    const abi = await this.getEVMContractABI(chainId, address);
    const contract = new ethers.Contract(address, abi, provider);
    
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = startBlock === 'latest' ? Math.max(0, currentBlock - 1000) : startBlock;
    
    console.log(`📊 EVM blocks: ${fromBlock} to ${currentBlock}`);
    
    // Get events
    const logs = await provider.getLogs({
      address: address,
      fromBlock: fromBlock,
      toBlock: currentBlock
    });

    console.log(`📝 Found ${logs.length} EVM events`);

    // Process events and transactions
    const txGroups = new Map();
    for (const log of logs) {
      if (!txGroups.has(log.transactionHash)) {
        txGroups.set(log.transactionHash, []);
      }
      txGroups.get(log.transactionHash).push(log);
    }

    let eventCount = 0;
    let txCount = 0;

    for (const [txHash, txLogs] of txGroups) {
      try {
        const [tx, receipt] = await Promise.all([
          provider.getTransaction(txHash),
          provider.getTransactionReceipt(txHash)
        ]);

        await this.saveEVMTransaction(chainId, address, tx, receipt);
        txCount++;

        for (const log of txLogs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            await this.saveEVMEvent(chainId, address, log, parsedLog);
            eventCount++;
          } catch (error) {
            await this.saveRawEvent(chainId, address, log);
            eventCount++;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to process EVM tx ${txHash}: ${error.message}`);
      }
    }

    this.stats.totalEvents += eventCount;
    this.stats.totalTransactions += txCount;
    this.stats.totalContracts++;

    return {
      chainId,
      chainName: this.chains[chainId].name,
      type: 'evm',
      address,
      events: eventCount,
      transactions: txCount
    };
  }

  async getEVMContractABI(chainId, address) {
    const config = this.chains[chainId];
    
    if (config.explorer && config.apiKey) {
      try {
        const url = `${config.explorer}?module=contract&action=getabi&address=${address}&apikey=${config.apiKey}`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data.status === '1') {
          return JSON.parse(response.data.result);
        }
      } catch (error) {
        console.warn(`⚠️ Explorer ABI fetch failed: ${error.message}`);
      }
    }

    // Fallback to generic ERC20 ABI
    return [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)"
    ];
  }

  // Save Starknet transaction
  async saveStarknetTransaction(chainId, contractAddress, tx, receipt, blockNumber) {
    await this.pool.query(`
      INSERT INTO ultimate_transactions (
        chain_id, contract_address, transaction_hash, block_number,
        from_address, to_address, transaction_status, raw_input, 
        chain_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (chain_id, transaction_hash) DO NOTHING
    `, [
      chainId, contractAddress, tx.transaction_hash, blockNumber,
      tx.sender_address || tx.contract_address, tx.contract_address,
      receipt.execution_status === 'SUCCEEDED' ? 1 : 0,
      JSON.stringify(tx.calldata), 'starknet'
    ]);
  }

  // Save Starknet event
  async saveStarknetEvent(chainId, contractAddress, txHash, event, blockNumber) {
    await this.pool.query(`
      INSERT INTO ultimate_events (
        chain_id, contract_address, transaction_hash, block_number,
        event_name, decoded_params, raw_data, chain_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (chain_id, transaction_hash, log_index) DO NOTHING
    `, [
      chainId, contractAddress, txHash, blockNumber,
      'StarknetEvent', JSON.stringify(event.data),
      JSON.stringify(event.keys), 'starknet'
    ]);
  }

  // Save EVM transaction
  async saveEVMTransaction(chainId, contractAddress, tx, receipt) {
    await this.pool.query(`
      INSERT INTO ultimate_transactions (
        chain_id, contract_address, transaction_hash, block_number,
        from_address, to_address, value_eth, gas_used, gas_price,
        function_selector, transaction_status, raw_input, chain_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (chain_id, transaction_hash) DO NOTHING
    `, [
      chainId, contractAddress, tx.hash, receipt.blockNumber,
      tx.from, tx.to, ethers.formatEther(tx.value || 0),
      receipt.gasUsed.toString(), tx.gasPrice?.toString(),
      tx.data?.substring(0, 10), receipt.status, tx.data, 'evm'
    ]);
  }

  // Save EVM event
  async saveEVMEvent(chainId, contractAddress, log, parsedLog) {
    await this.pool.query(`
      INSERT INTO ultimate_events (
        chain_id, contract_address, transaction_hash, block_number,
        event_name, decoded_params, raw_topics, raw_data, log_index, chain_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (chain_id, transaction_hash, log_index) DO NOTHING
    `, [
      chainId, contractAddress, log.transactionHash, log.blockNumber,
      parsedLog.name, JSON.stringify(parsedLog.args), log.topics,
      log.data, log.logIndex, 'evm'
    ]);
  }

  async saveRawEvent(chainId, contractAddress, log) {
    await this.pool.query(`
      INSERT INTO ultimate_events (
        chain_id, contract_address, transaction_hash, block_number,
        event_name, raw_topics, raw_data, log_index, chain_type, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (chain_id, transaction_hash, log_index) DO NOTHING
    `, [
      chainId, contractAddress, log.transactionHash, log.blockNumber,
      'UnknownEvent', log.topics, log.data, log.logIndex, 'evm'
    ]);
  }

  async initDatabase() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ultimate_transactions (
        id SERIAL PRIMARY KEY,
        chain_id VARCHAR(20) NOT NULL,
        contract_address VARCHAR(66) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        from_address VARCHAR(66),
        to_address VARCHAR(66),
        value_eth DECIMAL(36,18) DEFAULT 0,
        gas_used BIGINT,
        gas_price BIGINT,
        function_selector VARCHAR(10),
        transaction_status INTEGER,
        raw_input TEXT,
        chain_type VARCHAR(20) DEFAULT 'evm',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash)
      );
      
      CREATE TABLE IF NOT EXISTS ultimate_events (
        id SERIAL PRIMARY KEY,
        chain_id VARCHAR(20) NOT NULL,
        contract_address VARCHAR(66) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        decoded_params JSONB,
        raw_topics TEXT[],
        raw_data TEXT,
        log_index INTEGER DEFAULT 0,
        chain_type VARCHAR(20) DEFAULT 'evm',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash, log_index)
      );
      
      CREATE INDEX IF NOT EXISTS idx_ultimate_tx_contract ON ultimate_transactions(contract_address);
      CREATE INDEX IF NOT EXISTS idx_ultimate_tx_chain_type ON ultimate_transactions(chain_type);
      CREATE INDEX IF NOT EXISTS idx_ultimate_events_contract ON ultimate_events(contract_address);
      CREATE INDEX IF NOT EXISTS idx_ultimate_events_chain_type ON ultimate_events(chain_type);
    `);
    
    console.log('✅ Ultimate database with Starknet support initialized');
  }

  getStats() {
    return {
      ...this.stats,
      supportedChains: Object.keys(this.chains).length,
      evmProviders: this.providers.size,
      starknetProviders: this.starknetProviders.size
    };
  }
}

// CLI Usage
async function main() {
  const indexer = new UltimateStarknetIndexer();
  await indexer.initDatabase();
  
  const address = process.argv[2];
  const startBlock = process.argv[3] || 'latest';
  
  if (!address) {
    console.log('🚀 Ultimate Multi-Chain Indexer (EVM + Starknet)');
    console.log('================================================');
    console.log('');
    console.log('Usage: node ultimate-starknet-indexer.js <contract_address> [start_block]');
    console.log('');
    console.log('Examples:');
    console.log('  # EVM Contract');
    console.log('  node ultimate-starknet-indexer.js 0xdAC17F958D2ee523a2206206994597C13D831ec7');
    console.log('');
    console.log('  # Starknet Contract');
    console.log('  node ultimate-starknet-indexer.js 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7');
    console.log('');
    console.log('✨ Features:');
    console.log('  • Auto-detects EVM vs Starknet contracts');
    console.log('  • Supports 9+ EVM chains + Starknet networks');
    console.log('  • Auto-fetches ABIs and contract metadata');
    console.log('  • Multi-RPC failover for reliability');
    console.log('');
    process.exit(1);
  }
  
  try {
    const result = await indexer.indexContract(address, startBlock);
    
    console.log('\n🎉 Ultimate Indexing Results:');
    console.log('============================');
    console.log(`Chain: ${result.chainName} (${result.chainId})`);
    console.log(`Type: ${result.type.toUpperCase()}`);
    console.log(`Contract: ${result.address}`);
    if (result.classHash) {
      console.log(`Class Hash: ${result.classHash}`);
    }
    console.log(`Events Indexed: ${result.events}`);
    console.log(`Transactions Indexed: ${result.transactions}`);
    
    console.log('\n📊 Overall Stats:');
    console.log(JSON.stringify(indexer.getStats(), null, 2));
    
  } catch (error) {
    console.error('❌ Ultimate indexing failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default UltimateStarknetIndexer;
