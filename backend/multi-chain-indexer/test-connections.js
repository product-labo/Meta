#!/usr/bin/env node

const { Pool } = require('pg');
const { ethers } = require('ethers');
const { RpcProvider } = require('starknet');
require('dotenv').config();

class ConnectionTester {
    constructor() {
        this.results = {
            database: false,
            rpcConnections: {},
            dataFetch: {},
            errors: []
        };
    }

    async testDatabase() {
        console.log('🔍 Testing Database Connection...');
        try {
            const pool = new Pool({
                user: process.env.DB_USER || 'postgres',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'multichain_indexer',
                password: process.env.DB_PASS || 'password',
                port: process.env.DB_PORT || 5432,
                connectionTimeoutMillis: 5000
            });

            // Test basic connection
            const client = await pool.connect();
            await client.query('SELECT 1');
            
            // Test required tables exist
            const tables = await client.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name LIKE 'mc_%'
            `);
            
            console.log(`✅ Database: Connected (${tables.rowCount} tables found)`);
            
            // Test chains table
            const chains = await client.query('SELECT id, name, rpc_urls FROM mc_chains WHERE is_active = true');
            console.log(`📊 Active chains: ${chains.rowCount}`);
            
            client.release();
            await pool.end();
            
            this.results.database = true;
            return chains.rows;
            
        } catch (error) {
            console.error('❌ Database:', error.message);
            this.results.errors.push(`Database: ${error.message}`);
            return [];
        }
    }

    async testRpcConnection(chainId, name, rpcUrl) {
        try {
            const isStarknet = name.toLowerCase().includes('starknet');
            
            if (isStarknet) {
                const provider = new RpcProvider({ nodeUrl: rpcUrl });
                const block = await Promise.race([
                    provider.getBlock('latest'),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);
                
                console.log(`✅ ${name}: Block ${block.block_number} (Starknet)`);
                this.results.rpcConnections[chainId] = true;
                return { provider, block, type: 'starknet' };
                
            } else {
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                const [network, blockNumber] = await Promise.race([
                    Promise.all([provider.getNetwork(), provider.getBlockNumber()]),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);
                
                console.log(`✅ ${name}: Block ${blockNumber} (Chain ID: ${network.chainId})`);
                this.results.rpcConnections[chainId] = true;
                return { provider, blockNumber, network, type: 'evm' };
            }
            
        } catch (error) {
            console.error(`❌ ${name}: ${error.message}`);
            this.results.errors.push(`${name} RPC: ${error.message}`);
            this.results.rpcConnections[chainId] = false;
            return null;
        }
    }

    async testDataFetch(chainId, name, providerInfo) {
        if (!providerInfo) return false;
        
        console.log(`🔍 Testing data fetch for ${name}...`);
        
        try {
            if (providerInfo.type === 'starknet') {
                // Test Starknet data fetching
                const block = await providerInfo.provider.getBlock('latest');
                const txCount = block.transactions?.length || 0;
                
                console.log(`📦 ${name}: ${txCount} transactions in latest block`);
                this.results.dataFetch[chainId] = true;
                return true;
                
            } else {
                // Test EVM data fetching
                const block = await providerInfo.provider.getBlock('latest', true);
                const txCount = block.transactions?.length || 0;
                
                // Test balance fetch
                const balance = await providerInfo.provider.getBalance('0x0000000000000000000000000000000000000000');
                
                console.log(`📦 ${name}: ${txCount} transactions, balance query works`);
                this.results.dataFetch[chainId] = true;
                return true;
            }
            
        } catch (error) {
            console.error(`❌ ${name} data fetch: ${error.message}`);
            this.results.errors.push(`${name} data fetch: ${error.message}`);
            this.results.dataFetch[chainId] = false;
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Connection Tests...\n');
        
        // Test database first
        const chains = await this.testDatabase();
        
        if (!this.results.database) {
            console.log('\n❌ Database connection failed. Cannot proceed with RPC tests.');
            return this.results;
        }
        
        console.log('\n🌐 Testing RPC Connections...');
        
        // Test each chain's RPC connections
        const rpcTests = [];
        for (const chain of chains) {
            if (!chain.rpc_urls || chain.rpc_urls.length === 0) {
                console.warn(`⚠️ ${chain.name}: No RPC URLs configured`);
                continue;
            }
            
            // Test first RPC URL for each chain
            const rpcUrl = chain.rpc_urls[0];
            rpcTests.push(
                this.testRpcConnection(chain.id, chain.name, rpcUrl)
                    .then(providerInfo => ({ chain, providerInfo }))
            );
        }
        
        const rpcResults = await Promise.all(rpcTests);
        
        console.log('\n📊 Testing Data Fetching...');
        
        // Test data fetching for successful RPC connections
        const dataTests = rpcResults
            .filter(result => result.providerInfo)
            .map(({ chain, providerInfo }) => 
                this.testDataFetch(chain.id, chain.name, providerInfo)
            );
        
        await Promise.all(dataTests);
        
        return this.results;
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📋 TEST SUMMARY');
        console.log('='.repeat(50));
        
        console.log(`Database: ${this.results.database ? '✅ PASS' : '❌ FAIL'}`);
        
        const rpcPassed = Object.values(this.results.rpcConnections).filter(Boolean).length;
        const rpcTotal = Object.keys(this.results.rpcConnections).length;
        console.log(`RPC Connections: ${rpcPassed}/${rpcTotal} ${rpcPassed === rpcTotal ? '✅ PASS' : '⚠️ PARTIAL'}`);
        
        const dataPassed = Object.values(this.results.dataFetch).filter(Boolean).length;
        const dataTotal = Object.keys(this.results.dataFetch).length;
        console.log(`Data Fetching: ${dataPassed}/${dataTotal} ${dataPassed === dataTotal ? '✅ PASS' : '⚠️ PARTIAL'}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach(error => console.log(`   • ${error}`));
        }
        
        const allPassed = this.results.database && 
                         rpcPassed > 0 && 
                         dataPassed > 0 && 
                         this.results.errors.length === 0;
        
        console.log('\n' + '='.repeat(50));
        console.log(`OVERALL: ${allPassed ? '✅ READY TO RUN' : '❌ ISSUES FOUND'}`);
        console.log('='.repeat(50));
        
        return allPassed;
    }
}

async function main() {
    const tester = new ConnectionTester();
    
    try {
        await tester.runAllTests();
        const success = tester.printSummary();
        
        if (success) {
            console.log('\n🚀 All tests passed! You can safely run the indexer.');
            process.exit(0);
        } else {
            console.log('\n⚠️ Some tests failed. Fix issues before running the indexer.');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Test runner failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ConnectionTester;
