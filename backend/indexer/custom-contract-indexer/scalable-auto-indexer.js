#!/usr/bin/env node

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { RpcProvider } from 'starknet';
import { Pool } from 'pg';
import axios from 'axios';
import cron from 'node-cron';

dotenv.config();

class ScalableAutoIndexer {
  constructor() {
    this.discoveredChains = new Map();
    this.providers = new Map();
    this.contracts = new Map();
    
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });

    // Auto-discover chains from environment
    this.autoDiscoverChains();
  }

  // Auto-discover all chains from environment variables
  autoDiscoverChains() {
    console.log('🔍 Auto-discovering chains from environment...');
    
    const envVars = process.env;
    let chainCount = 0;

    // Scan for RPC URLs in environment
    for (const [key, value] of Object.entries(envVars)) {
      if (key.includes('RPC') && value && value.startsWith('http')) {
        const chainInfo = this.identifyChainFromEnvKey(key, value);
        if (chainInfo) {
          this.discoveredChains.set(chainInfo.id, chainInfo);
          chainCount++;
          console.log(`✅ Discovered: ${chainInfo.name} (${chainInfo.type})`);
        }
      }
    }

    console.log(`🎯 Auto-discovered ${chainCount} chains from environment`);
    return chainCount;
  }

  // Identify chain from environment variable key
  identifyChainFromEnvKey(envKey, rpcUrl) {
    const key = envKey.toLowerCase();
    
    // EVM Chain patterns
    const evmChains = {
      'eth': { id: 1, name: 'Ethereum', type: 'evm', explorer: 'https://api.etherscan.io/api' },
      'polygon': { id: 137, name: 'Polygon', type: 'evm', explorer: 'https://api.polygonscan.com/api' },
      'bsc': { id: 56, name: 'BSC', type: 'evm', explorer: 'https://api.bscscan.com/api' },
      'arbitrum': { id: 42161, name: 'Arbitrum', type: 'evm', explorer: 'https://api.arbiscan.io/api' },
      'optimism': { id: 10, name: 'Optimism', type: 'evm', explorer: 'https://api-optimistic.etherscan.io/api' },
      'base': { id: 8453, name: 'Base', type: 'evm', explorer: 'https://api.basescan.org/api' },
      'lisk': { id: key.includes('sepolia') ? 4202 : 1135, name: key.includes('sepolia') ? 'Lisk Sepolia' : 'Lisk', type: 'evm' },
      'sepolia': { id: 11155111, name: 'Sepolia', type: 'evm' },
      'avalanche': { id: 43114, name: 'Avalanche', type: 'evm' },
      'fantom': { id: 250, name: 'Fantom', type: 'evm' },
      'celo': { id: 42220, name: 'Celo', type: 'evm' }
    };

    // Starknet patterns
    if (key.includes('starknet')) {
      return {
        id: key.includes('sepolia') ? 'SN_SEPOLIA' : 'SN_MAIN',
        name: key.includes('sepolia') ? 'Starknet Sepolia' : 'Starknet Mainnet',
        type: 'starknet',
        rpc: rpcUrl,
        envKey
      };
    }

    // Match EVM chains
    for (const [pattern, chainInfo] of Object.entries(evmChains)) {
      if (key.includes(pattern)) {
        return {
          ...chainInfo,
          rpc: rpcUrl,
          envKey
        };
      }
    }

    // Generic EVM detection
    if (key.includes('rpc') && !key.includes('starknet')) {
      const chainName = key.replace(/_?rpc_?url?/gi, '').replace(/_/g, ' ');
      return {
        id: `custom_${Date.now()}`,
        name: chainName.charAt(0).toUpperCase() + chainName.slice(1),
        type: 'evm',
        rpc: rpcUrl,
        envKey
      };
    }

    return null;
  }

  // Test and validate discovered chains
  async validateDiscoveredChains() {
    console.log('🧪 Validating discovered chains...');
    
    const validChains = new Map();
    
    for (const [chainId, chainInfo] of this.discoveredChains) {
      try {
        if (chainInfo.type === 'evm') {
          const provider = new ethers.JsonRpcProvider(chainInfo.rpc);
          const network = await provider.getNetwork();
          const blockNumber = await provider.getBlockNumber();
          
          chainInfo.networkId = Number(network.chainId);
          chainInfo.currentBlock = blockNumber;
          chainInfo.validated = true;
          
          console.log(`✅ ${chainInfo.name}: Chain ${chainInfo.networkId}, Block ${blockNumber}`);
          
        } else if (chainInfo.type === 'starknet') {
          const provider = new RpcProvider({ nodeUrl: chainInfo.rpc });
          const chainId = await provider.getChainId();
          const blockNumber = await provider.getBlockNumber();
          
          chainInfo.networkId = chainId;
          chainInfo.currentBlock = blockNumber;
          chainInfo.validated = true;
          
          console.log(`✅ ${chainInfo.name}: Chain ${chainId}, Block ${blockNumber}`);
        }
        
        validChains.set(chainId, chainInfo);
        this.providers.set(chainId, chainInfo);
        
      } catch (error) {
        console.warn(`⚠️ ${chainInfo.name}: Validation failed - ${error.message}`);
        chainInfo.validated = false;
      }
    }
    
    this.discoveredChains = validChains;
    console.log(`✅ Validated ${validChains.size} working chains`);
    
    return validChains.size;
  }

  // Auto-detect contract chain across all discovered chains
  async autoDetectContractChain(address) {
    console.log(`🔍 Auto-detecting chain for: ${address}`);
    console.log(`🌐 Scanning ${this.discoveredChains.size} discovered chains...`);
    
    const isStarknetAddress = address.length > 42;
    
    for (const [chainId, chainInfo] of this.discoveredChains) {
      if (!chainInfo.validated) continue;
      
      try {
        if (chainInfo.type === 'evm' && !isStarknetAddress) {
          const provider = new ethers.JsonRpcProvider(chainInfo.rpc);
          const code = await Promise.race([
            provider.getCode(address),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          
          if (code !== '0x') {
            console.log(`✅ Contract found on ${chainInfo.name}`);
            return chainInfo;
          }
          
        } else if (chainInfo.type === 'starknet' && isStarknetAddress) {
          const provider = new RpcProvider({ nodeUrl: chainInfo.rpc });
          const classHash = await Promise.race([
            provider.getClassHashAt(address),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          
          if (classHash && classHash !== '0x0') {
            console.log(`✅ Contract found on ${chainInfo.name}`);
            return chainInfo;
          }
        }
        
      } catch (error) {
        // Continue to next chain
      }
    }
    
    throw new Error(`Contract ${address} not found on any of ${this.discoveredChains.size} discovered chains`);
  }

  // Add contract with auto-detection
  async addContract(address) {
    try {
      console.log(`📝 Adding contract with auto-detection: ${address}`);
      
      // Auto-detect which chain the contract is on
      const chainInfo = await this.autoDetectContractChain(address);
      
      // Store contract info
      this.contracts.set(address, {
        address: address.toLowerCase(),
        chainId: chainInfo.id,
        chainName: chainInfo.name,
        chainType: chainInfo.type,
        rpc: chainInfo.rpc,
        addedAt: new Date(),
        lastIndexedBlock: 0
      });
      
      // Save to database
      await this.saveContractToDatabase(address, chainInfo);
      
      console.log(`✅ Added ${address} on ${chainInfo.name} (${chainInfo.type})`);
      return chainInfo;
      
    } catch (error) {
      console.error(`❌ Failed to add contract ${address}: ${error.message}`);
      throw error;
    }
  }

  // Save contract to database
  async saveContractToDatabase(address, chainInfo) {
    await this.pool.query(`
      INSERT INTO scalable_monitored_contracts (
        contract_address, chain_id, chain_name, chain_type, 
        rpc_url, network_id, added_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (contract_address) DO UPDATE SET
        chain_id = $2,
        chain_name = $3,
        chain_type = $4,
        rpc_url = $5,
        network_id = $6,
        updated_at = NOW()
    `, [
      address.toLowerCase(),
      chainInfo.id,
      chainInfo.name,
      chainInfo.type,
      chainInfo.rpc,
      chainInfo.networkId
    ]);
  }

  // Index contract using appropriate indexer
  async indexContract(address, startBlock = 'latest') {
    const contract = this.contracts.get(address);
    if (!contract) {
      throw new Error(`Contract ${address} not found in monitoring list`);
    }

    console.log(`🔄 Indexing ${address} on ${contract.chainName}...`);
    
    try {
      let result;
      
      if (contract.chainType === 'evm') {
        result = await this.indexEVMContract(contract, startBlock);
      } else if (contract.chainType === 'starknet') {
        result = await this.indexStarknetContract(contract, startBlock);
      }
      
      // Update last indexed block
      contract.lastIndexedBlock = result.currentBlock || startBlock;
      
      return result;
      
    } catch (error) {
      console.error(`❌ Indexing failed for ${address}: ${error.message}`);
      throw error;
    }
  }

  // Simplified EVM indexing
  async indexEVMContract(contract, startBlock) {
    const provider = new ethers.JsonRpcProvider(contract.rpc);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = startBlock === 'latest' ? Math.max(0, currentBlock - 1000) : startBlock;
    
    const logs = await provider.getLogs({
      address: contract.address,
      fromBlock,
      toBlock: currentBlock
    });
    
    // Save transactions and events (simplified)
    let txCount = 0, eventCount = 0;
    
    for (const log of logs) {
      await this.saveTransaction(contract, log, 'evm');
      eventCount++;
    }
    
    console.log(`📊 EVM: ${eventCount} events, ${txCount} transactions`);
    
    return {
      chainId: contract.chainId,
      chainName: contract.chainName,
      type: 'evm',
      events: eventCount,
      transactions: txCount,
      currentBlock
    };
  }

  // Simplified Starknet indexing
  async indexStarknetContract(contract, startBlock) {
    const provider = new RpcProvider({ nodeUrl: contract.rpc });
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = startBlock === 'latest' ? Math.max(0, currentBlock - 100) : startBlock;
    
    let eventCount = 0, txCount = 0;
    
    // Simplified Starknet processing
    for (let blockNum = fromBlock; blockNum <= Math.min(fromBlock + 100, currentBlock); blockNum++) {
      try {
        const block = await provider.getBlockWithTxs(blockNum);
        
        for (const tx of block.transactions) {
          if (tx.contract_address === contract.address) {
            await this.saveTransaction(contract, tx, 'starknet');
            txCount++;
          }
        }
      } catch (error) {
        // Continue processing
      }
    }
    
    console.log(`📊 Starknet: ${eventCount} events, ${txCount} transactions`);
    
    return {
      chainId: contract.chainId,
      chainName: contract.chainName,
      type: 'starknet',
      events: eventCount,
      transactions: txCount,
      currentBlock
    };
  }

  // Save transaction to database
  async saveTransaction(contract, txData, chainType) {
    await this.pool.query(`
      INSERT INTO scalable_transactions (
        chain_id, chain_name, chain_type, contract_address,
        transaction_hash, block_number, raw_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (chain_id, transaction_hash) DO NOTHING
    `, [
      contract.chainId,
      contract.chainName,
      chainType,
      contract.address,
      txData.transactionHash || txData.transaction_hash || 'unknown',
      txData.blockNumber || 0,
      JSON.stringify(txData)
    ]);
  }

  // Initialize scalable database
  async initScalableDatabase() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scalable_monitored_contracts (
        id SERIAL PRIMARY KEY,
        contract_address VARCHAR(66) NOT NULL UNIQUE,
        chain_id VARCHAR(50) NOT NULL,
        chain_name VARCHAR(100),
        chain_type VARCHAR(20),
        rpc_url TEXT,
        network_id VARCHAR(50),
        last_indexed_block BIGINT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        added_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS scalable_transactions (
        id SERIAL PRIMARY KEY,
        chain_id VARCHAR(50) NOT NULL,
        chain_name VARCHAR(100),
        chain_type VARCHAR(20),
        contract_address VARCHAR(66) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT,
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash)
      );
      
      CREATE TABLE IF NOT EXISTS discovered_chains (
        id SERIAL PRIMARY KEY,
        chain_id VARCHAR(50) NOT NULL UNIQUE,
        chain_name VARCHAR(100),
        chain_type VARCHAR(20),
        rpc_url TEXT,
        network_id VARCHAR(50),
        env_key VARCHAR(100),
        is_validated BOOLEAN DEFAULT false,
        current_block BIGINT,
        discovered_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Scalable database initialized');
  }

  // Save discovered chains to database
  async saveDiscoveredChains() {
    for (const [chainId, chainInfo] of this.discoveredChains) {
      await this.pool.query(`
        INSERT INTO discovered_chains (
          chain_id, chain_name, chain_type, rpc_url, 
          network_id, env_key, is_validated, current_block
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (chain_id) DO UPDATE SET
          chain_name = $2,
          rpc_url = $4,
          network_id = $5,
          is_validated = $7,
          current_block = $8,
          discovered_at = NOW()
      `, [
        chainId,
        chainInfo.name,
        chainInfo.type,
        chainInfo.rpc,
        chainInfo.networkId?.toString(),
        chainInfo.envKey,
        chainInfo.validated || false,
        chainInfo.currentBlock || 0
      ]);
    }
  }

  // Get system statistics
  async getSystemStats() {
    const [chains, contracts, transactions] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as count FROM discovered_chains WHERE is_validated = true'),
      this.pool.query('SELECT COUNT(*) as count FROM scalable_monitored_contracts WHERE is_active = true'),
      this.pool.query('SELECT COUNT(*) as count FROM scalable_transactions WHERE created_at >= CURRENT_DATE')
    ]);

    return {
      discoveredChains: this.discoveredChains.size,
      validatedChains: chains.rows[0].count,
      monitoredContracts: contracts.rows[0].count,
      todayTransactions: transactions.rows[0].count,
      supportedChainTypes: ['EVM', 'Starknet']
    };
  }
}

// CLI Usage
async function main() {
  const indexer = new ScalableAutoIndexer();
  
  await indexer.initScalableDatabase();
  await indexer.validateDiscoveredChains();
  await indexer.saveDiscoveredChains();

  const command = process.argv[2];
  const address = process.argv[3];

  switch (command) {
    case 'discover':
      console.log('🔍 Re-discovering chains...');
      indexer.autoDiscoverChains();
      await indexer.validateDiscoveredChains();
      await indexer.saveDiscoveredChains();
      break;

    case 'add':
      if (!address) {
        console.log('Usage: node scalable-auto-indexer.js add <contract_address>');
        process.exit(1);
      }
      await indexer.addContract(address);
      break;

    case 'index':
      if (!address) {
        console.log('Usage: node scalable-auto-indexer.js index <contract_address>');
        process.exit(1);
      }
      const result = await indexer.indexContract(address);
      console.log('📊 Indexing Result:', result);
      break;

    case 'stats':
      const stats = await indexer.getSystemStats();
      console.log('\n📊 System Statistics:');
      console.log(JSON.stringify(stats, null, 2));
      break;

    default:
      console.log('🚀 Scalable Auto-Discovery Indexer');
      console.log('==================================');
      console.log('');
      console.log('✨ Auto-discovered chains from environment:');
      for (const [id, info] of indexer.discoveredChains) {
        console.log(`   ${info.name} (${info.type}) - ${info.validated ? '✅' : '❌'}`);
      }
      console.log('');
      console.log('Commands:');
      console.log('  discover        - Re-scan environment for new RPCs');
      console.log('  add <address>   - Add contract (auto-detects chain)');
      console.log('  index <address> - Index specific contract');
      console.log('  stats          - Show system statistics');
      console.log('');
      console.log('🎯 Just add RPC URLs to .env and restart to scale!');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ScalableAutoIndexer;
