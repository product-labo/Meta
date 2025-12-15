#!/usr/bin/env node

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import axios from 'axios';

dotenv.config();

class UltimateAllInOneIndexer extends EventEmitter {
  constructor() {
    super();
    
    // Chain configurations with multiple RPCs
    this.chains = {
      1: { name: 'Ethereum', rpcs: [process.env.ETH_RPC_URL, 'https://ethereum-rpc.publicnode.com', 'https://rpc.ankr.com/eth'], explorer: 'https://api.etherscan.io/api', apiKey: process.env.ETHERSCAN_API_KEY },
      137: { name: 'Polygon', rpcs: [process.env.POLYGON_RPC_URL, 'https://polygon-bor-rpc.publicnode.com', 'https://rpc.ankr.com/polygon'], explorer: 'https://api.polygonscan.com/api', apiKey: process.env.POLYGONSCAN_API_KEY },
      56: { name: 'BSC', rpcs: [process.env.BSC_RPC_URL, 'https://bsc-rpc.publicnode.com', 'https://rpc.ankr.com/bsc'], explorer: 'https://api.bscscan.com/api', apiKey: process.env.BSCSCAN_API_KEY },
      42161: { name: 'Arbitrum', rpcs: [process.env.ARBITRUM_RPC_URL, 'https://arbitrum-one-rpc.publicnode.com', 'https://rpc.ankr.com/arbitrum'], explorer: 'https://api.arbiscan.io/api', apiKey: process.env.ARBISCAN_API_KEY },
      10: { name: 'Optimism', rpcs: [process.env.OPTIMISM_RPC_URL, 'https://optimism-rpc.publicnode.com', 'https://rpc.ankr.com/optimism'], explorer: 'https://api-optimistic.etherscan.io/api', apiKey: process.env.OPTIMISM_API_KEY },
      8453: { name: 'Base', rpcs: [process.env.BASE_RPC_URL, 'https://base-rpc.publicnode.com', 'https://rpc.ankr.com/base'], explorer: 'https://api.basescan.org/api', apiKey: process.env.BASESCAN_API_KEY },
      4202: { name: 'Lisk Sepolia', rpcs: [process.env.LISK_SEPOLIA_RPC_URL, 'https://rpc.sepolia-api.lisk.com', 'https://lisk-sepolia.drpc.org'] },
      1135: { name: 'Lisk Mainnet', rpcs: [process.env.LISK_MAINNET_RPC_URL, 'https://rpc.api.lisk.com', 'https://lisk.drpc.org'] },
      11155111: { name: 'Sepolia', rpcs: [process.env.SEPOLIA_RPC_URL, 'https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.ankr.com/eth_sepolia'] }
    };

    this.providers = new Map();
    this.signatureCache = new Map();
    this.contractCache = new Map();
    this.proxyCache = new Map();
    
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
      abiFetched: 0,
      errors: 0
    };
  }

  // Auto-detect which chain the contract exists on
  async detectContractChain(address) {
    console.log(`🔍 Auto-detecting chain for contract: ${address}`);
    
    const promises = Object.entries(this.chains).map(async ([chainId, config]) => {
      try {
        const provider = await this.getProvider(parseInt(chainId));
        const code = await Promise.race([
          provider.getCode(address),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        if (code !== '0x') {
          return { chainId: parseInt(chainId), name: config.name, codeSize: code.length };
        }
      } catch (error) {
        // Chain check failed, continue
      }
      return null;
    });

    const results = await Promise.allSettled(promises);
    const validChains = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);

    if (validChains.length === 0) {
      throw new Error(`Contract ${address} not found on any supported chain`);
    }

    // Return the chain with the largest code (most likely the main deployment)
    const bestChain = validChains.reduce((best, current) => 
      current.codeSize > best.codeSize ? current : best
    );

    console.log(`✅ Contract found on ${bestChain.name} (Chain ${bestChain.chainId})`);
    this.stats.chainsDetected++;
    return bestChain.chainId;
  }

  // Get provider with failover
  async getProvider(chainId) {
    if (this.providers.has(chainId)) {
      return this.providers.get(chainId);
    }

    const config = this.chains[chainId];
    if (!config) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const rpcs = config.rpcs.filter(rpc => rpc && rpc !== 'undefined');
    
    for (const rpc of rpcs) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc);
        await provider.getBlockNumber(); // Test connection
        this.providers.set(chainId, provider);
        console.log(`✅ Connected to ${config.name} via ${rpc.substring(0, 50)}...`);
        return provider;
      } catch (error) {
        console.warn(`❌ Failed to connect to ${rpc}: ${error.message}`);
      }
    }

    throw new Error(`All RPC endpoints failed for chain ${chainId}`);
  }

  // Auto-fetch contract ABI from explorer
  async getContractABI(chainId, address) {
    const cacheKey = `${chainId}-${address}`;
    if (this.contractCache.has(cacheKey)) {
      return this.contractCache.get(cacheKey);
    }

    const config = this.chains[chainId];
    
    // Try explorer API first
    if (config.explorer && config.apiKey) {
      try {
        const url = `${config.explorer}?module=contract&action=getabi&address=${address}&apikey=${config.apiKey}`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data.status === '1') {
          const abi = JSON.parse(response.data.result);
          this.contractCache.set(cacheKey, abi);
          this.stats.abiFetched++;
          console.log(`📋 Fetched verified ABI from ${config.name} explorer`);
          return abi;
        }
      } catch (error) {
        console.warn(`⚠️ Explorer ABI fetch failed: ${error.message}`);
      }
    }

    // Fallback to auto-detected ABI based on contract analysis
    const abi = await this.detectContractType(chainId, address);
    this.contractCache.set(cacheKey, abi);
    return abi;
  }

  // Detect contract type and return appropriate ABI
  async detectContractType(chainId, address) {
    const provider = await this.getProvider(chainId);
    
    // Test common function signatures
    const tests = [
      { sig: '0x70a08231', type: 'ERC20', func: 'balanceOf(address)' },
      { sig: '0x18160ddd', type: 'ERC20', func: 'totalSupply()' },
      { sig: '0x6352211e', type: 'ERC721', func: 'ownerOf(uint256)' },
      { sig: '0x01ffc9a7', type: 'ERC165', func: 'supportsInterface(bytes4)' },
      { sig: '0x095ea7b3', type: 'ERC20', func: 'approve(address,uint256)' }
    ];

    const detectedTypes = new Set();
    
    for (const test of tests) {
      try {
        await provider.call({ to: address, data: test.sig + '0'.repeat(56) });
        detectedTypes.add(test.type);
      } catch (error) {
        // Function doesn't exist
      }
    }

    console.log(`🔬 Detected contract types: ${Array.from(detectedTypes).join(', ') || 'Unknown'}`);

    // Return comprehensive ABI based on detected types
    if (detectedTypes.has('ERC721')) {
      return this.getERC721ABI();
    } else if (detectedTypes.has('ERC20')) {
      return this.getERC20ABI();
    } else {
      return this.getGenericABI();
    }
  }

  getERC20ABI() {
    return [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function transferFrom(address from, address to, uint256 amount) returns (bool)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ];
  }

  getERC721ABI() {
    return [
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
      "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
      "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
      "function balanceOf(address owner) view returns (uint256)",
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function transferFrom(address from, address to, uint256 tokenId)",
      "function approve(address to, uint256 tokenId)",
      "function setApprovalForAll(address operator, bool approved)",
      "function getApproved(uint256 tokenId) view returns (address)",
      "function isApprovedForAll(address owner, address operator) view returns (bool)",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function tokenURI(uint256 tokenId) view returns (string)"
    ];
  }

  getGenericABI() {
    return [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)"
    ];
  }

  // Resolve proxy contracts
  async resolveProxy(chainId, address) {
    const cacheKey = `${chainId}-${address}`;
    if (this.proxyCache.has(cacheKey)) {
      return this.proxyCache.get(cacheKey);
    }

    const provider = await this.getProvider(chainId);
    
    try {
      // Try implementation() call (EIP-1967)
      const result = await provider.call({
        to: address,
        data: '0x5c60da1b' // implementation()
      });
      
      if (result && result !== '0x' && result.length >= 66) {
        const implementation = '0x' + result.slice(-40);
        if (implementation !== '0x0000000000000000000000000000000000000000') {
          console.log(`🔗 Proxy resolved: ${address} -> ${implementation}`);
          this.proxyCache.set(cacheKey, implementation);
          return implementation;
        }
      }
    } catch (error) {
      // Not a proxy or different pattern
    }

    this.proxyCache.set(cacheKey, address);
    return address;
  }

  // Main indexing function - handles everything automatically
  async indexContract(address, startBlock = 'latest', options = {}) {
    try {
      console.log(`\n🚀 Starting ultimate indexing for: ${address}`);
      
      // Step 1: Auto-detect chain
      const chainId = await this.detectContractChain(address);
      const provider = await this.getProvider(chainId);
      
      // Step 2: Resolve proxy if it's a proxy contract
      const implementationAddress = await this.resolveProxy(chainId, address);
      
      // Step 3: Auto-fetch ABI
      const abi = await this.getContractABI(chainId, implementationAddress);
      const contract = new ethers.Contract(address, abi, provider);
      
      // Step 4: Get contract info
      const [currentBlock, code] = await Promise.all([
        provider.getBlockNumber(),
        provider.getCode(address)
      ]);

      console.log(`📊 Chain: ${this.chains[chainId].name} (${chainId})`);
      console.log(`📊 Current Block: ${currentBlock}`);
      console.log(`📊 Contract Size: ${Math.floor(code.length / 2)} bytes`);
      
      // Step 5: Determine block range
      const fromBlock = startBlock === 'latest' ? Math.max(0, currentBlock - 1000) : startBlock;
      const toBlock = currentBlock;
      
      console.log(`📊 Indexing blocks: ${fromBlock} to ${toBlock}`);
      
      // Step 6: Index events and transactions
      const result = await this.processContract(chainId, address, contract, provider, fromBlock, toBlock);
      
      this.stats.totalContracts++;
      
      console.log(`✅ Indexing complete!`);
      console.log(`   Events: ${result.events}`);
      console.log(`   Transactions: ${result.transactions}`);
      
      return {
        chainId,
        chainName: this.chains[chainId].name,
        address,
        implementationAddress,
        ...result
      };
      
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Indexing failed: ${error.message}`);
      throw error;
    }
  }

  async processContract(chainId, address, contract, provider, fromBlock, toBlock) {
    // Get all events
    const logs = await provider.getLogs({
      address: address,
      fromBlock: fromBlock,
      toBlock: toBlock
    });

    console.log(`📝 Found ${logs.length} events`);

    // Group by transaction
    const txGroups = new Map();
    for (const log of logs) {
      if (!txGroups.has(log.transactionHash)) {
        txGroups.set(log.transactionHash, []);
      }
      txGroups.get(log.transactionHash).push(log);
    }

    let eventCount = 0;
    let txCount = 0;

    // Process each transaction
    for (const [txHash, txLogs] of txGroups) {
      try {
        const [tx, receipt] = await Promise.all([
          provider.getTransaction(txHash),
          provider.getTransactionReceipt(txHash)
        ]);

        // Save transaction
        await this.saveTransaction(chainId, address, tx, receipt);
        txCount++;

        // Save events
        for (const log of txLogs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            await this.saveEvent(chainId, address, log, parsedLog);
            eventCount++;
          } catch (error) {
            // Save raw event if parsing fails
            await this.saveRawEvent(chainId, address, log);
            eventCount++;
          }
        }

      } catch (error) {
        console.warn(`⚠️ Failed to process tx ${txHash}: ${error.message}`);
      }
    }

    this.stats.totalEvents += eventCount;
    this.stats.totalTransactions += txCount;

    return { events: eventCount, transactions: txCount };
  }

  async saveTransaction(chainId, contractAddress, tx, receipt) {
    const functionSelector = tx.data?.substring(0, 10) || null;
    
    await this.pool.query(`
      INSERT INTO ultimate_transactions (
        chain_id, contract_address, transaction_hash, block_number,
        from_address, to_address, value_eth, gas_used, gas_price,
        function_selector, transaction_status, raw_input, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (chain_id, transaction_hash) DO NOTHING
    `, [
      chainId, contractAddress, tx.hash, receipt.blockNumber,
      tx.from, tx.to, ethers.formatEther(tx.value || 0),
      receipt.gasUsed.toString(), tx.gasPrice?.toString(),
      functionSelector, receipt.status, tx.data
    ]);
  }

  async saveEvent(chainId, contractAddress, log, parsedLog) {
    await this.pool.query(`
      INSERT INTO ultimate_events (
        chain_id, contract_address, transaction_hash, block_number,
        event_name, decoded_params, raw_topics, raw_data, log_index, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (chain_id, transaction_hash, log_index) DO NOTHING
    `, [
      chainId, contractAddress, log.transactionHash, log.blockNumber,
      parsedLog.name, JSON.stringify(parsedLog.args), log.topics,
      log.data, log.logIndex
    ]);
  }

  async saveRawEvent(chainId, contractAddress, log) {
    await this.pool.query(`
      INSERT INTO ultimate_events (
        chain_id, contract_address, transaction_hash, block_number,
        event_name, decoded_params, raw_topics, raw_data, log_index, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (chain_id, transaction_hash, log_index) DO NOTHING
    `, [
      chainId, contractAddress, log.transactionHash, log.blockNumber,
      'UnknownEvent', null, log.topics, log.data, log.logIndex
    ]);
  }

  async initDatabase() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ultimate_transactions (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42),
        value_eth DECIMAL(36,18) DEFAULT 0,
        gas_used BIGINT,
        gas_price BIGINT,
        function_selector VARCHAR(10),
        transaction_status INTEGER,
        raw_input TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash)
      );
      
      CREATE TABLE IF NOT EXISTS ultimate_events (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        decoded_params JSONB,
        raw_topics TEXT[],
        raw_data TEXT,
        log_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash, log_index)
      );
      
      CREATE INDEX IF NOT EXISTS idx_ultimate_tx_contract ON ultimate_transactions(contract_address);
      CREATE INDEX IF NOT EXISTS idx_ultimate_tx_block ON ultimate_transactions(block_number);
      CREATE INDEX IF NOT EXISTS idx_ultimate_events_contract ON ultimate_events(contract_address);
      CREATE INDEX IF NOT EXISTS idx_ultimate_events_name ON ultimate_events(event_name);
    `);
    
    console.log('✅ Ultimate database initialized');
  }

  getStats() {
    return {
      ...this.stats,
      supportedChains: Object.keys(this.chains).length,
      activeProviders: this.providers.size,
      cachedContracts: this.contractCache.size,
      cachedProxies: this.proxyCache.size
    };
  }
}

// CLI Usage
async function main() {
  const indexer = new UltimateAllInOneIndexer();
  await indexer.initDatabase();
  
  const address = process.argv[2];
  const startBlock = process.argv[3] || 'latest';
  
  if (!address) {
    console.log('🚀 Ultimate All-in-One Smart Contract Indexer');
    console.log('==============================================');
    console.log('');
    console.log('Usage: node ultimate-all-in-one-indexer.js <contract_address> [start_block]');
    console.log('');
    console.log('Examples:');
    console.log('  node ultimate-all-in-one-indexer.js 0xA0b86a33E6441b8C4505E2c8c5B2E8b5C5B5B5B5');
    console.log('  node ultimate-all-in-one-indexer.js 0xdAC17F958D2ee523a2206206994597C13D831ec7 18000000');
    console.log('');
    console.log('✨ Features:');
    console.log('  • Auto-detects blockchain (9+ chains supported)');
    console.log('  • Auto-fetches contract ABI from explorers');
    console.log('  • Auto-detects contract type (ERC20, ERC721, etc.)');
    console.log('  • Resolves proxy contracts automatically');
    console.log('  • Indexes events and transactions');
    console.log('  • Multi-RPC failover for reliability');
    console.log('');
    process.exit(1);
  }
  
  try {
    const result = await indexer.indexContract(address, startBlock);
    
    console.log('\n🎉 Ultimate Indexing Results:');
    console.log('============================');
    console.log(`Chain: ${result.chainName} (${result.chainId})`);
    console.log(`Contract: ${result.address}`);
    if (result.implementationAddress !== result.address) {
      console.log(`Implementation: ${result.implementationAddress}`);
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

export default UltimateAllInOneIndexer;
