#!/usr/bin/env node

require('dotenv').config();

const REQUIRED_ENV = {
    // Database
    'DB_HOST': process.env.DB_HOST || 'localhost',
    'DB_PORT': process.env.DB_PORT || '5432',
    'DB_NAME': process.env.DB_NAME || 'multichain_indexer',
    'DB_USER': process.env.DB_USER || 'postgres',
    'DB_PASS': process.env.DB_PASS || 'password',
    
    // RPC URLs (from .env file)
    'ETHEREUM_RPC': process.env.ETHEREUM_RPC,
    'STARKNET_RPC_PRIMARY': process.env.STARKNET_RPC_PRIMARY,
    'POLYGON_RPC': process.env.POLYGON_RPC,
    'BSC_RPC': process.env.BSC_RPC,
    'ARBITRUM_RPC': process.env.ARBITRUM_RPC,
    'OPTIMISM_RPC': process.env.OPTIMISM_RPC
};

console.log('🔍 Environment Check\n');

let missing = 0;
let warnings = 0;

for (const [key, value] of Object.entries(REQUIRED_ENV)) {
    if (!value) {
        if (key.includes('RPC')) {
            console.log(`⚠️  ${key}: Not set (optional)`);
            warnings++;
        } else {
            console.log(`❌ ${key}: Missing (required)`);
            missing++;
        }
    } else {
        console.log(`✅ ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    }
}

console.log('\n' + '='.repeat(40));
if (missing > 0) {
    console.log(`❌ ${missing} required variables missing`);
    console.log('⚠️  Fix these before running tests');
    process.exit(1);
} else {
    console.log('✅ All required environment variables set');
    if (warnings > 0) {
        console.log(`⚠️  ${warnings} optional RPC URLs not configured`);
    }
    process.exit(0);
}
