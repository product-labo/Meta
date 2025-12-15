const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const { ethers } = require('ethers');

// Explicitly load .env and check result
const envPath = path.join(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
} else {
    console.log('✅ .env loaded from', envPath);
}

// Config Debug
console.log('DB Config:', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    // hide password
});

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'boardling',
    password: process.env.DB_PASS || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: 10000,
    ssl: process.env.DB_SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : undefined
});

async function main() {
    console.log('🚀 Starting Traffic Simulation (v2)...');

    try {
        console.log('   Connecting to DB...');
        const client = await pool.connect();
        console.log('   ✅ Connected!');

        try {
            const now = await client.query('SELECT NOW()');
            console.log('   Timestamp:', now.rows[0].now);

            // 1. Get Projects
            const projects = await client.query('SELECT * FROM projects');
            console.log(`Found ${projects.rows.length} projects to simulate.`);

            // 2. Ensure Categories exist (Skipped as managed by 019 migration or irrelevant)
            // await client.query('INSERT INTO bi_contract_categories ...');

            // 3. Simulate Data for each project
            for (const project of projects.rows) {
                console.log(`Generating data for ${project.name}...`);

                const contractAddress = project.contract_address || ethers.Wallet.createRandom().address;
                const chainId = 1;
                const cycleId = 1;

                // Update Registry
                await client.query(`
                    INSERT INTO mc_registry (chain_id, address, name, is_active)
                    VALUES ($1, $2, $3, true)
                    ON CONFLICT (chain_id, address) DO NOTHING
                `, [chainId, contractAddress, project.name]);

                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);

                let totalGas = BigInt(0);
                const userSet = new Set();

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const txCount = Math.floor(Math.random() * 45) + 5;
                    for (let i = 0; i < txCount; i++) {
                        const txHash = ethers.hexlify(ethers.randomBytes(32));
                        const fromAddr = ethers.Wallet.createRandom().address;
                        userSet.add(fromAddr);
                        const gasUsed = BigInt(Math.floor(Math.random() * 100000) + 21000);
                        const gasPrice = ethers.parseUnits((Math.random() * 50 + 10).toFixed(2), 'gwei');

                        totalGas += gasUsed;

                        await client.query(`
                            INSERT INTO mc_transaction_details (
                                cycle_id, chain_id, tx_hash, block_number, tx_index,
                                from_address, to_address, value, gas_price, gas_limit, gas_used,
                                status, nonce, input_data, captured_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                            ON CONFLICT (tx_hash) DO NOTHING
                        `, [cycleId, chainId, txHash, 1000 + i, i, fromAddr, contractAddress, '0', gasPrice.toString(), '500000', gasUsed.toString(), 1, i, '0x', d]);
                    }
                }

                console.log(`   > Injected transactions for ${project.name}`);

                // Update Metrics directly
                await client.query(`
                    INSERT INTO project_metrics (project_id, total_users, gas_consumed, fees_generated, retention_rate, churn_rate)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (project_id) DO UPDATE SET
                    total_users = $2,
                    gas_consumed = $3,
                    fees_generated = $4,
                    retention_rate = $5,
                    churn_rate = $6
                `, [
                    project.id,
                    userSet.size,
                    totalGas.toString(), // Store as string if type is DECIMAL or TEXT
                    (Number(totalGas) * 0.000000001).toFixed(4),
                    (Math.random() * 100).toFixed(2),
                    (Math.random() * 20).toFixed(2)
                ]);
            }
            console.log('✅ Simulation Complete.');
        } finally {
            client.release();
        }

    } catch (e) {
        console.error('Simulation Failed:', e);
    } finally {
        await pool.end();
    }
}

main();
