const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'boardling',
});

const mockProjects = [
    { name: "Uniswap VX3", description: "DEX Protocol on Ethereum", category: "DeFi", chain: "ethereum", status: "active", growth_score: 94, contract_address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", metrics: { retention_rate: 89.2, adoption_rate: 15.5, churn_rate: 2.1, total_users: 234000, gas_consumed: 450.5, fees_generated: 1200000, new_users_7d: 1500, returning_users_7d: 8500 } },
    { name: "Lisk Lending", description: "Lending protocol on Lisk", category: "DeFi", chain: "lisk", status: "active", growth_score: 88, contract_address: "0x3e8...lisk", metrics: { retention_rate: 75.0, adoption_rate: 12.0, churn_rate: 5.5, total_users: 45000, gas_consumed: 120.2, fees_generated: 45000, new_users_7d: 300, returning_users_7d: 1200 } },
    { name: "StarkNet ID", description: "Identity provider for Starknet", category: "Identity", chain: "starknet", status: "active", growth_score: 91, contract_address: "0x05f...stark", metrics: { retention_rate: 92.0, adoption_rate: 22.0, churn_rate: 1.0, total_users: 120000, gas_consumed: 80.5, fees_generated: 25000, new_users_7d: 800, returning_users_7d: 5000 } },
    { name: "Aave V3", description: "Liquidity protocol", category: "DeFi", chain: "ethereum", status: "active", growth_score: 97, contract_address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", metrics: { retention_rate: 94.5, adoption_rate: 18.2, churn_rate: 1.5, total_users: 500000, gas_consumed: 1200.0, fees_generated: 3500000, new_users_7d: 2500, returning_users_7d: 15000 } },
    { name: "Orbiter Finance", description: "Cross-rollup bridge", category: "Bridge", chain: "starknet", status: "active", growth_score: 85, contract_address: "0x012...bridge", metrics: { retention_rate: 65.0, adoption_rate: 30.0, churn_rate: 8.0, total_users: 80000, gas_consumed: 200.0, fees_generated: 50000, new_users_7d: 5000, returning_users_7d: 2000 } },
    { name: "Lisk Dex", description: "Decentralized Exchange", category: "DeFi", chain: "lisk", status: "active", growth_score: 72, contract_address: "0xLiskDex...", metrics: { retention_rate: 55.0, adoption_rate: 8.0, churn_rate: 12.0, total_users: 15000, gas_consumed: 45.0, fees_generated: 1200, new_users_7d: 100, returning_users_7d: 400 } },
    { name: "ZCash Privacy", description: "Privacy preserving transactions", category: "Privacy", chain: "zcash", status: "active", growth_score: 65, contract_address: "zs1...", metrics: { retention_rate: 80.0, adoption_rate: 5.0, churn_rate: 2.0, total_users: 25000, gas_consumed: 10.0, fees_generated: 500, new_users_7d: 50, returning_users_7d: 800 } },
    { name: "OpenSea Seaport", description: "NFT Marketplace", category: "NFT", chain: "ethereum", status: "active", growth_score: 89, contract_address: "0x00000000006c3852cbEf3e08E8dF289169EdE581", metrics: { retention_rate: 78.0, adoption_rate: 40.0, churn_rate: 15.0, total_users: 1200000, gas_consumed: 5000.0, fees_generated: 8000000, new_users_7d: 10000, returning_users_7d: 50000 } },
    { name: "Argent X", description: "Starknet Wallet", category: "Wallet", chain: "starknet", status: "active", growth_score: 92, contract_address: "0xArgent...", metrics: { retention_rate: 88.0, adoption_rate: 25.0, churn_rate: 3.0, total_users: 300000, gas_consumed: 150.0, fees_generated: 0, new_users_7d: 2000, returning_users_7d: 10000 } },
    { name: "Chainlink", description: "Decentralized Oracle Network", category: "Infrastructure", chain: "ethereum", status: "active", growth_score: 95, contract_address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", metrics: { retention_rate: 98.0, adoption_rate: 10.0, churn_rate: 0.5, total_users: 50000, gas_consumed: 800.0, fees_generated: 400000, new_users_7d: 200, returning_users_7d: 20000 } },
    { name: "Lisk NFT Market", description: "Digital collectibles", category: "NFT", chain: "lisk", status: "active", growth_score: 45, contract_address: "0xLiskNFT...", metrics: { retention_rate: 40.0, adoption_rate: 5.0, churn_rate: 20.0, total_users: 5000, gas_consumed: 15.0, fees_generated: 200, new_users_7d: 20, returning_users_7d: 100 } },
    { name: "StarkGate", description: "Starknet Bridge", category: "Bridge", chain: "starknet", status: "active", growth_score: 78, contract_address: "0xStarkGate...", metrics: { retention_rate: 60.0, adoption_rate: 15.0, churn_rate: 10.0, total_users: 60000, gas_consumed: 180.0, fees_generated: 15000, new_users_7d: 1000, returning_users_7d: 3000 } }
];

async function seed() {
    try {
        const userRes = await pool.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.error("No users found. Create a user first.");
            process.exit(1);
        }
        const userId = userRes.rows[0].id;

        console.log(`Seeding projects for User ID: ${userId}...`);

        for (const p of mockProjects) {
            // Insert Project
            const projectRes = await pool.query(
                `INSERT INTO projects (user_id, name, description, category, chain, status, growth_score, contract_address, revenue_7d, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                 ON CONFLICT DO NOTHING
                 RETURNING id`,
                [userId, p.name, p.description, p.category, p.chain, p.status, p.growth_score, p.contract_address, p.metrics.fees_generated / 52] // Approx weekly revenue
            );

            // If project inserted (result has ID), or if explicit fetch needed
            let projectId = projectRes.rows[0]?.id;

            if (!projectId) {
                // If conflict, fetch existing
                const existing = await pool.query('SELECT id FROM projects WHERE name = $1', [p.name]);
                projectId = existing.rows[0]?.id;
            }

            if (projectId) {
                await pool.query(
                    `INSERT INTO project_metrics (project_id, retention_rate, adoption_rate, activation_rate, churn_rate, total_users, gas_consumed, fees_generated, new_users_7d, returning_users_7d)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (project_id) DO UPDATE SET
                        retention_rate = EXCLUDED.retention_rate,
                        adoption_rate = EXCLUDED.adoption_rate,
                        total_users = EXCLUDED.total_users,
                        fees_generated = EXCLUDED.fees_generated,
                        new_users_7d = EXCLUDED.new_users_7d`,
                    [projectId, p.metrics.retention_rate, p.metrics.adoption_rate,
                        p.metrics.adoption_rate * 0.8, // Activation approx
                        p.metrics.churn_rate, p.metrics.total_users, p.metrics.gas_consumed, p.metrics.fees_generated, p.metrics.new_users_7d, p.metrics.returning_users_7d]
                );
            }
        }
        console.log("Seeding complete!");
    } catch (e) {
        console.error("Seeding failed:", e);
    } finally {
        pool.end();
    }
}

seed();
