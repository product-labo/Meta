const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const result = dotenv.config({ path: path.join(__dirname, '../.env') });
if (result.error) console.error('Env error', result.error);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : undefined
});

const REAL_CONTRACTS = [
    {
        name: 'Wrapped Ether (WETH)',
        chain: 'ethereum',
        contract_address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        description: 'Wrapped Ether contract.',
        category: 'defi'
    },
    {
        name: 'Tether USD (USDT)',
        chain: 'ethereum',
        contract_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        description: 'Tether USD Stablecoin.',
        category: 'defi'
    },
    {
        name: 'Uniswap V2 Router',
        chain: 'ethereum',
        contract_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        description: 'Uniswap V2 Router 02',
        category: 'defi'
    },
    {
        name: 'OpenSea Seaport',
        chain: 'ethereum',
        contract_address: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
        description: 'OpenSea NFT Marketplace',
        category: 'nft'
    },
    {
        name: 'Tether USD (Polygon)',
        chain: 'polygon',
        contract_address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        description: 'USDT on Polygon PoS',
        category: 'defi'
    },
    {
        name: 'USDC (Optimism)',
        chain: 'optimism',
        contract_address: '0x0b2C639c533813f4Aa9D7837CAf992c963882261',
        description: 'Native USDC on Optimism',
        category: 'defi'
    },
    {
        name: 'USDC (Base)',
        chain: 'base',
        contract_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        description: 'Native USDC on Base',
        category: 'defi'
    }
];

async function seed() {
    console.log('Seeding Real Contracts...');
    const client = await pool.connect();
    try {
        for (const c of REAL_CONTRACTS) {
            console.log(`Inserting ${c.name}...`);
            // Insert into Projects
            const projectId = uuidv4();
            await client.query(`
                INSERT INTO projects (id, name, description, category, chain, contract_address, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'active')
                ON CONFLICT DO NOTHING
            `, [projectId, c.name, c.description, c.category, c.chain, c.contract_address]);

            // Map Chain Name to ID
            const CHAIN_IDS = {
                'ethereum': 1,
                'polygon': 137,
                'optimism': 10,
                'base': 8453,
                'bsc': 56,
                'lisk': 1135,
                'arbitrum': 42161
            };
            const chainId = CHAIN_IDS[c.chain.toLowerCase()] || 1;

            // Upsert into mc_registry (Linked by address mainly)
            await client.query(`
                INSERT INTO mc_registry (chain_id, address, name, is_active)
                VALUES ($1, $2, $3, true)
                ON CONFLICT (chain_id, address) 
                DO UPDATE SET is_active = true
            `, [chainId, c.contract_address, c.name]);
        }
        console.log('✅ Real Contracts Seeded.');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
