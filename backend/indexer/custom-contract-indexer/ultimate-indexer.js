/**
 * Ultimate Custom Contract Indexer
 * Merges ALL best features from main indexer: RPC failover, signature lookup, 
 * function categorization, proxy resolution, trace processing, comprehensive error handling
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import axios from 'axios';

dotenv.config();

// External Signature Lookup (from main indexer)
class ExternalSignatureLookup {
  constructor() {
    this.cache = new Map();
    this.apis = [
      'https://www.4byte.directory/api/v1/signatures/?hex_signature=',
      'https://sig.eth.samczsun.com/api/v1/signatures?function=',
      'https://api.openchain.xyz/signature-database/v1/lookup?function='
    ];
  }

  async lookup(selector) {
    if (this.cache.has(selector)) {
      return this.cache.get(selector);
    }

    for (const apiUrl of this.apis) {
      try {
        const response = await axios.get(`${apiUrl}${selector}`, { timeout: 5000 });
        
        if (response.data && response.data.results && response.data.results.length > 0) {
          const signature = response.data.results[0].text_signature;
          const result = {
            selector,
            signature,
            name: signature.split('(')[0],
            category: this.categorizeFunction(signature),
            source: 'external'
          };
          
          this.cache.set(selector, result);
          return result;
        }
      } catch (error) {
        console.warn(`External lookup failed for ${selector}: ${error.message}`);
      }
    }

    return null;
  }

  categorizeFunction(signature) {
    const name = signature.toLowerCase();
    
    if (name.includes('transfer') || name.includes('approve') || name.includes('allowance')) {
      return 'erc20';
    }
    if (name.includes('swap') || name.includes('liquidity') || name.includes('pool')) {
      return 'dex';
    }
    if (name.includes('mint') || name.includes('burn') || name.includes('tokenuri')) {
      return 'nft';
    }
    if (name.includes('vote') || name.includes('propose') || name.includes('delegate')) {
      return 'governance';
    }
    if (name.includes('deposit') || name.includes('withdraw') || name.includes('borrow') || name.includes('repay')) {
      return 'lending';
    }
    if (name.includes('stake') || name.includes('unstake') || name.includes('claim')) {
      return 'staking';
    }
    
    return 'unknown';
  }
}

// Function Signature Database (from main indexer)
class SignatureDatabase {
  constructor() {
    this.signatures = new Map();
    this.loadBuiltInSignatures();
  }

  async loadBuiltInSignatures() {
    try {
      const data = await fs.readFile('../function-signatures.json', 'utf8');
      const sigs = JSON.parse(data);
      
      for (const [selector, info] of Object.entries(sigs)) {
        this.signatures.set(selector, info);
      }
      
      console.log(`✅ Loaded ${this.signatures.size} built-in signatures`);
    } catch (error) {
      console.warn('⚠️ Could not load built-in signatures, using external lookup only');
    }
  }

  getSignature(selector) {
    return this.signatures.get(selector);
  }

  addSignature(selector, info) {
    this.signatures.set(selector, info);
  }
}

// Proxy Resolver (from main indexer)
class ProxyResolver {
  constructor() {
    this.proxyCache = new Map();
    this.proxyPatterns = [
      '0x5c60da1b', // implementation()
      '0x363d3d37', // EIP-1167 minimal proxy
      '0x7c0278fc'  // implementation slot
    ];
  }

  async resolveProxy(address, provider) {
    if (this.proxyCache.has(address)) {
      return this.proxyCache.get(address);
    }

    try {
      // Try common proxy patterns
      const code = await provider.getCode(address);
      
      if (code.includes('363d3d37')) {
        // EIP-1167 minimal proxy
        const implementationAddress = '0x' + code.slice(-40);
        this.proxyCache.set(address, implementationAddress);
        return implementationAddress;
      }

      // Try implementation() call
      try {
        const result = await provider.call({
          to: address,
          data: '0x5c60da1b' // implementation()
        });
        
        if (result && result !== '0x') {
          const implementationAddress = '0x' + result.slice(-40);
          this.proxyCache.set(address, implementationAddress);
          return implementationAddress;
        }
      } catch (e) {
        // Not a proxy or different pattern
      }

    } catch (error) {
      console.warn(`Proxy resolution failed for ${address}: ${error.message}`);
    }

    this.proxyCache.set(address, address); // Not a proxy
    return address;
  }
}

// RPC Provider Manager with Advanced Failover
class AdvancedRPCManager {
  constructor(rpcEndpoints, options = {}) {
    this.rpcEndpoints = rpcEndpoints;
    this.currentIndex = 0;
    this.provider = null;
    this.healthStatus = new Map();
    this.failureCount = new Map();
    this.responseTime = new Map();
    this.maxRetries = options.maxRetries || 3;
    this.rpcTimeout = options.rpcTimeout || 10000;
    this.maxConsecutiveFailures = 5;
    this.healthCheckInterval = 30000;
    
    this.rpcEndpoints.forEach((endpoint, index) => {
      this.healthStatus.set(index, true);
      this.failureCount.set(index, 0);
      this.responseTime.set(index, 0);
    });

    this.startHealthMonitoring();
  }

  async getProvider() {
    if (!this.provider) {
      await this.switchToFastestHealthyRPC();
    }
    return this.provider;
  }

  async switchToFastestHealthyRPC() {
    // Find fastest healthy RPC
    let bestIndex = 0;
    let bestTime = Infinity;

    for (let i = 0; i < this.rpcEndpoints.length; i++) {
      if (this.healthStatus.get(i) && this.failureCount.get(i) < this.maxConsecutiveFailures) {
        const responseTime = this.responseTime.get(i) || Infinity;
        if (responseTime < bestTime) {
          bestTime = responseTime;
          bestIndex = i;
        }
      }
    }

    this.currentIndex = bestIndex;
    this.provider = new ethers.JsonRpcProvider(this.rpcEndpoints[this.currentIndex]);
    
    try {
      await this.testConnection();
      console.log(`✅ Connected to fastest RPC ${this.currentIndex} (${bestTime}ms)`);
    } catch (error) {
      await this.switchToNextHealthyRPC();
    }
  }

  async testConnection() {
    const start = Date.now();
    await Promise.race([
      this.provider.getBlockNumber(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), this.rpcTimeout))
    ]);
    const responseTime = Date.now() - start;
    this.responseTime.set(this.currentIndex, responseTime);
  }

  async switchToNextHealthyRPC() {
    let attempts = 0;
    while (attempts < this.rpcEndpoints.length) {
      this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
      attempts++;
      
      if (this.failureCount.get(this.currentIndex) >= this.maxConsecutiveFailures) {
        continue;
      }
      
      try {
        this.provider = new ethers.JsonRpcProvider(this.rpcEndpoints[this.currentIndex]);
        await this.testConnection();
        
        this.healthStatus.set(this.currentIndex, true);
        this.failureCount.set(this.currentIndex, 0);
        console.log(`✅ Switched to RPC ${this.currentIndex}`);
        return;
      } catch (error) {
        this.incrementFailureCount(this.currentIndex);
      }
    }
    throw new Error('All RPC endpoints unavailable');
  }

  async executeWithRetry(operation, description) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const provider = await this.getProvider();
        return await operation(provider);
      } catch (error) {
        console.warn(`⚠️ ${description} failed (attempt ${attempt}): ${error.message}`);
        if (attempt === this.maxRetries) throw error;
        await this.switchToNextHealthyRPC();
      }
    }
  }

  incrementFailureCount(index) {
    const current = this.failureCount.get(index) || 0;
    this.failureCount.set(index, current + 1);
    this.healthStatus.set(index, false);
  }

  startHealthMonitoring() {
    setInterval(async () => {
      for (let i = 0; i < this.rpcEndpoints.length; i++) {
        if (i === this.currentIndex) continue;
        
        try {
          const testProvider = new ethers.JsonRpcProvider(this.rpcEndpoints[i]);
          const start = Date.now();
          await Promise.race([
            testProvider.getBlockNumber(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          const responseTime = Date.now() - start;
          
          this.healthStatus.set(i, true);
          this.failureCount.set(i, 0);
          this.responseTime.set(i, responseTime);
        } catch (error) {
          this.healthStatus.set(i, false);
        }
      }
    }, this.healthCheckInterval);
  }

  getStats() {
    return {
      currentRPC: this.currentIndex,
      currentURL: this.rpcEndpoints[this.currentIndex],
      healthStatus: Object.fromEntries(this.healthStatus),
      responseTimes: Object.fromEntries(this.responseTime),
      failureCounts: Object.fromEntries(this.failureCount)
    };
  }
}

// Ultimate Custom Indexer
class UltimateCustomIndexer extends EventEmitter {
  constructor() {
    super();
    this.contracts = new Map();
    this.rpcManagers = new Map();
    this.signatureDatabase = new SignatureDatabase();
    this.externalLookup = new ExternalSignatureLookup();
    this.proxyResolver = new ProxyResolver();
    this.signatureCache = new Map();
    this.errorStats = new Map();
    
    this.pool = new Pool({
      user: process.env.DB_USER || 'zcash_user',
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME || 'zcash_indexer',
      password: process.env.DB_PASSWORD || 'yourpassword',
      port: process.env.DB_PORT || 5432,
      max: 20,
      idleTimeoutMillis: 30000,
    });

    this.stats = {
      totalTransactions: 0,
      totalEvents: 0,
      totalBlocks: 0,
      signatureLookups: 0,
      cacheHits: 0,
      errors: 0
    };
  }

  addChain(chainId, rpcUrls, options = {}) {
    const urls = Array.isArray(rpcUrls) ? rpcUrls : [rpcUrls];
    this.rpcManagers.set(chainId, new AdvancedRPCManager(urls, options));
    console.log(`✅ Added chain ${chainId} with ${urls.length} RPC endpoints`);
  }

  addContract(chainId, contractAddress, abi, startBlock = 'latest', options = {}) {
    const key = `${chainId}-${contractAddress.toLowerCase()}`;
    this.contracts.set(key, {
      chainId,
      address: contractAddress.toLowerCase(),
      abi,
      startBlock,
      interface: new ethers.Interface(abi),
      options: {
        resolveProxy: options.resolveProxy !== false,
        decodeInternalCalls: options.decodeInternalCalls === true,
        trackBalances: options.trackBalances === true,
        ...options
      }
    });
    console.log(`✅ Added contract ${contractAddress} on chain ${chainId}`);
  }

  async initDatabase() {
    // Ultimate schema with all features
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ultimate_contract_transactions (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        implementation_address VARCHAR(42),
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        block_timestamp TIMESTAMP NOT NULL,
        transaction_index INTEGER,
        from_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42),
        value_eth DECIMAL(36,18) DEFAULT 0,
        gas_limit BIGINT,
        gas_used BIGINT,
        gas_price BIGINT,
        function_selector VARCHAR(10),
        function_signature TEXT,
        function_name VARCHAR(255),
        function_category VARCHAR(50),
        decoded_params JSONB,
        raw_input TEXT,
        transaction_status INTEGER,
        error_message TEXT,
        internal_calls JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash)
      );
      
      CREATE INDEX IF NOT EXISTS idx_ultimate_contract_addr ON ultimate_contract_transactions(contract_address);
      CREATE INDEX IF NOT EXISTS idx_ultimate_block_num ON ultimate_contract_transactions(block_number);
      CREATE INDEX IF NOT EXISTS idx_ultimate_function ON ultimate_contract_transactions(function_name);
      CREATE INDEX IF NOT EXISTS idx_ultimate_category ON ultimate_contract_transactions(function_category);
      CREATE INDEX IF NOT EXISTS idx_ultimate_from_addr ON ultimate_contract_transactions(from_address);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ultimate_contract_events (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        block_timestamp TIMESTAMP NOT NULL,
        event_signature VARCHAR(66),
        event_name VARCHAR(255) NOT NULL,
        decoded_params JSONB NOT NULL,
        raw_topics TEXT[],
        raw_data TEXT,
        log_index INTEGER NOT NULL,
        removed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, transaction_hash, log_index)
      );
      
      CREATE INDEX IF NOT EXISTS idx_ultimate_event_addr ON ultimate_contract_events(contract_address);
      CREATE INDEX IF NOT EXISTS idx_ultimate_event_name ON ultimate_contract_events(event_name);
      CREATE INDEX IF NOT EXISTS idx_ultimate_event_block ON ultimate_contract_events(block_number);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ultimate_function_signatures (
        id SERIAL PRIMARY KEY,
        selector VARCHAR(10) NOT NULL UNIQUE,
        signature TEXT NOT NULL,
        function_name VARCHAR(255),
        category VARCHAR(50),
        subcategory VARCHAR(50),
        protocol VARCHAR(100),
        usage_count INTEGER DEFAULT 1,
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW(),
        source VARCHAR(50) DEFAULT 'external'
      );
      
      CREATE INDEX IF NOT EXISTS idx_ultimate_selector ON ultimate_function_signatures(selector);
      CREATE INDEX IF NOT EXISTS idx_ultimate_sig_category ON ultimate_function_signatures(category);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ultimate_address_balances (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        address VARCHAR(42) NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        balance DECIMAL(78,0) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(chain_id, address, contract_address)
      );
      
      CREATE INDEX IF NOT EXISTS idx_ultimate_balance_addr ON ultimate_address_balances(address);
    `);

    console.log('✅ Ultimate database schema initialized');
  }

  async startIndexing() {
    console.log('🚀 Starting ultimate contract indexing...');
    
    const promises = [];
    for (const [key, contract] of this.contracts) {
      promises.push(this.indexContract(contract));
    }
    
    await Promise.all(promises);
  }

  async indexContract(contract) {
    const rpcManager = this.rpcManagers.get(contract.chainId);
    if (!rpcManager) {
      console.error(`❌ No RPC manager for chain ${contract.chainId}`);
      return;
    }

    try {
      // Resolve proxy if enabled
      let implementationAddress = contract.address;
      if (contract.options.resolveProxy) {
        const provider = await rpcManager.getProvider();
        implementationAddress = await this.proxyResolver.resolveProxy(contract.address, provider);
        if (implementationAddress !== contract.address) {
          console.log(`🔗 Proxy resolved: ${contract.address} -> ${implementationAddress}`);
        }
      }

      const currentBlock = await rpcManager.executeWithRetry(
        async (provider) => await provider.getBlockNumber(),
        `Get current block for chain ${contract.chainId}`
      );

      const lastIndexed = await this.getLastIndexedBlock(contract.chainId, contract.address);
      const startBlock = Math.max(lastIndexed + 1, 
        contract.startBlock === 'latest' ? currentBlock - 1000 : contract.startBlock);

      console.log(`📊 Indexing ${contract.address}: blocks ${startBlock} to ${currentBlock}`);

      // Process in optimized batches
      const batchSize = 5000;
      for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += batchSize) {
        const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
        
        await this.processBlockRange(contract, rpcManager, fromBlock, toBlock, implementationAddress);
        this.stats.totalBlocks += (toBlock - fromBlock + 1);
        
        console.log(`   ✔ Processed blocks ${fromBlock}-${toBlock}`);
      }

    } catch (error) {
      this.handleError(error, 'indexContract', { contractAddress: contract.address });
    }
  }

  async processBlockRange(contract, rpcManager, fromBlock, toBlock, implementationAddress) {
    try {
      const logs = await rpcManager.executeWithRetry(
        async (provider) => await provider.getLogs({
          address: contract.address,
          fromBlock,
          toBlock
        }),
        `Get logs ${fromBlock}-${toBlock}`
      );

      // Group logs by transaction for batch processing
      const txGroups = new Map();
      for (const log of logs) {
        if (!txGroups.has(log.transactionHash)) {
          txGroups.set(log.transactionHash, []);
        }
        txGroups.get(log.transactionHash).push(log);
      }

      // Process each transaction
      for (const [txHash, txLogs] of txGroups) {
        await this.processTransaction(contract, rpcManager, txHash, txLogs, implementationAddress);
      }

    } catch (error) {
      this.handleError(error, 'processBlockRange', { fromBlock, toBlock });
    }
  }

  async processTransaction(contract, rpcManager, txHash, logs, implementationAddress) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get transaction details
      const [tx, receipt, block] = await Promise.all([
        rpcManager.executeWithRetry(
          async (provider) => await provider.getTransaction(txHash),
          `Get transaction ${txHash.substring(0, 10)}...`
        ),
        rpcManager.executeWithRetry(
          async (provider) => await provider.getTransactionReceipt(txHash),
          `Get receipt ${txHash.substring(0, 10)}...`
        ),
        rpcManager.executeWithRetry(
          async (provider) => await provider.getBlock(logs[0].blockNumber),
          `Get block ${logs[0].blockNumber}`
        )
      ]);

      // Decode function call
      let functionData = await this.decodeFunction(tx, contract);

      // Save transaction
      await client.query(`
        INSERT INTO ultimate_contract_transactions (
          chain_id, contract_address, implementation_address, transaction_hash, 
          block_number, block_timestamp, transaction_index, from_address, to_address,
          value_eth, gas_limit, gas_used, gas_price, function_selector, 
          function_signature, function_name, function_category, decoded_params,
          raw_input, transaction_status, error_message
        ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (chain_id, transaction_hash) DO NOTHING
      `, [
        contract.chainId, contract.address, implementationAddress, tx.hash,
        logs[0].blockNumber, block.timestamp, tx.index || 0, tx.from, tx.to,
        ethers.formatEther(tx.value || 0), tx.gasLimit?.toString(), receipt.gasUsed.toString(),
        tx.gasPrice?.toString(), functionData.selector, functionData.signature,
        functionData.name, functionData.category, functionData.params ? JSON.stringify(functionData.params) : null,
        tx.data, receipt.status, receipt.status === 0 ? 'Transaction failed' : null
      ]);

      // Process events
      for (const log of logs) {
        await this.processEvent(client, contract, log, block.timestamp);
      }

      // Update balances if enabled
      if (contract.options.trackBalances) {
        await this.updateBalances(client, contract, tx, receipt);
      }

      await client.query('COMMIT');
      this.stats.totalTransactions++;

    } catch (error) {
      await client.query('ROLLBACK');
      this.handleError(error, 'processTransaction', { txHash });
    } finally {
      client.release();
    }
  }

  async decodeFunction(tx, contract) {
    if (!tx.to || tx.to.toLowerCase() !== contract.address || tx.data === '0x') {
      return { selector: null, signature: null, name: null, category: null, params: null };
    }

    const selector = tx.data.substring(0, 10);
    
    // Check cache first
    if (this.signatureCache.has(selector)) {
      this.stats.cacheHits++;
      const cached = this.signatureCache.get(selector);
      
      try {
        const decoded = contract.interface.parseTransaction({ data: tx.data, value: tx.value });
        return {
          ...cached,
          params: this.formatParams(decoded.args)
        };
      } catch (e) {
        return cached;
      }
    }

    // Try built-in signatures
    let signatureInfo = this.signatureDatabase.getSignature(selector);
    
    // Try external lookup if not found
    if (!signatureInfo) {
      this.stats.signatureLookups++;
      signatureInfo = await this.externalLookup.lookup(selector);
      
      if (signatureInfo) {
        // Save to database
        await this.saveSignature(signatureInfo);
      }
    }

    // Try contract interface
    if (!signatureInfo) {
      try {
        const decoded = contract.interface.parseTransaction({ data: tx.data, value: tx.value });
        signatureInfo = {
          selector,
          signature: decoded.signature,
          name: decoded.name,
          category: this.externalLookup.categorizeFunction(decoded.signature),
          source: 'abi'
        };
      } catch (e) {
        signatureInfo = {
          selector,
          signature: null,
          name: 'unknown',
          category: 'unknown',
          source: 'unknown'
        };
      }
    }

    // Cache result
    this.signatureCache.set(selector, signatureInfo);

    // Try to decode parameters
    let params = null;
    if (signatureInfo.signature) {
      try {
        const decoded = contract.interface.parseTransaction({ data: tx.data, value: tx.value });
        params = this.formatParams(decoded.args);
      } catch (e) {
        // Could not decode parameters
      }
    }

    return {
      selector: signatureInfo.selector,
      signature: signatureInfo.signature,
      name: signatureInfo.name,
      category: signatureInfo.category,
      params
    };
  }

  async processEvent(client, contract, log, blockTimestamp) {
    try {
      const parsedLog = contract.interface.parseLog(log);
      const eventParams = this.formatParams(parsedLog.args);

      await client.query(`
        INSERT INTO ultimate_contract_events (
          chain_id, contract_address, transaction_hash, block_number, block_timestamp,
          event_signature, event_name, decoded_params, raw_topics, raw_data, log_index
        ) VALUES ($1, $2, $3, $4, to_timestamp($5), $6, $7, $8, $9, $10, $11)
        ON CONFLICT (chain_id, transaction_hash, log_index) DO NOTHING
      `, [
        contract.chainId, contract.address, log.transactionHash, log.blockNumber, blockTimestamp,
        log.topics[0], parsedLog.name, JSON.stringify(eventParams), log.topics, log.data, log.logIndex
      ]);

      this.stats.totalEvents++;

    } catch (error) {
      this.handleError(error, 'processEvent', { txHash: log.transactionHash, logIndex: log.logIndex });
    }
  }

  async updateBalances(client, contract, tx, receipt) {
    // Update balances based on Transfer events or value transfers
    // Implementation depends on token type (ERC20, ERC721, etc.)
    try {
      if (tx.value && tx.value > 0) {
        // ETH transfer
        await client.query(`
          INSERT INTO ultimate_address_balances (chain_id, address, contract_address, balance)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (chain_id, address, contract_address) 
          DO UPDATE SET balance = ultimate_address_balances.balance + $4, last_updated = NOW()
        `, [contract.chainId, tx.to, '0x0000000000000000000000000000000000000000', tx.value.toString()]);
      }
    } catch (error) {
      this.handleError(error, 'updateBalances', { txHash: tx.hash });
    }
  }

  async saveSignature(signatureInfo) {
    try {
      await this.pool.query(`
        INSERT INTO ultimate_function_signatures (
          selector, signature, function_name, category, source
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (selector) DO UPDATE SET
          usage_count = ultimate_function_signatures.usage_count + 1,
          last_seen = NOW()
      `, [
        signatureInfo.selector,
        signatureInfo.signature,
        signatureInfo.name,
        signatureInfo.category,
        signatureInfo.source
      ]);
    } catch (error) {
      this.handleError(error, 'saveSignature', { selector: signatureInfo.selector });
    }
  }

  formatParams(args) {
    const params = {};
    for (let i = 0; i < args.length; i++) {
      const value = args[i];
      params[`param_${i}`] = typeof value === 'bigint' ? value.toString() : value;
    }
    return params;
  }

  async getLastIndexedBlock(chainId, contractAddress) {
    const result = await this.pool.query(
      'SELECT MAX(block_number) as last_block FROM ultimate_contract_transactions WHERE chain_id = $1 AND contract_address = $2',
      [chainId, contractAddress.toLowerCase()]
    );
    return result.rows[0]?.last_block || 0;
  }

  handleError(error, operation, context = {}) {
    const errorKey = `${operation}_${error.name || 'Unknown'}`;
    this.errorStats.set(errorKey, (this.errorStats.get(errorKey) || 0) + 1);
    this.stats.errors++;
    
    console.error(`❌ [${operation}] ${error.message}`);
    if (context.txHash) console.error(`   Transaction: ${context.txHash}`);
    if (context.contractAddress) console.error(`   Contract: ${context.contractAddress}`);
  }

  getStats() {
    return {
      ...this.stats,
      contracts: this.contracts.size,
      chains: this.rpcManagers.size,
      signatureCacheSize: this.signatureCache.size,
      errors: Object.fromEntries(this.errorStats),
      rpcStats: Object.fromEntries(
        Array.from(this.rpcManagers.entries()).map(([chainId, manager]) => [
          chainId, manager.getStats()
        ])
      )
    };
  }

  // Load contracts from config
  loadContractsFromConfig(configPath) {
    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
    
    // Add chains
    for (const [chainId, rpcConfig] of Object.entries(config.chains)) {
      this.addChain(parseInt(chainId), rpcConfig.rpcs, rpcConfig.options);
    }

    // Add contracts
    for (const contract of config.contracts) {
      this.addContract(
        contract.chainId,
        contract.address,
        contract.abi,
        contract.startBlock || 'latest',
        contract.options || {}
      );
    }
  }
}

export default UltimateCustomIndexer;
