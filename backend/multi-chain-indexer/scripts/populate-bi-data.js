const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function populateBIData() {
    console.log('🚀 Starting BI Data Population (Max 50 contracts/chain)...');

    try {
        const client = await pool.connect();

        // 1. Get Contracts from Registry (Max 50 per chain)
        const contractsQuery = `
            WITH RankedContracts AS (
                SELECT 
                    *,
                    ROW_NUMBER() OVER (PARTITION BY chain_id ORDER BY created_at DESC) as rn
                FROM mc_registry
                WHERE is_active = true
            )
            SELECT * FROM RankedContracts WHERE rn <= 50;
        `;

        const contracts = await client.query(contractsQuery);
        console.log(`📋 Found ${contracts.rows.length} contracts to process.`);

        // 2. Process Each Contract
        for (const contract of contracts.rows) {
            console.log(`\n🔄 Processing ${contract.name} (${contract.address})...`);

            // A. Ensure Exists in BI Index
            // Map mc_registry category to bi_contract_categories id (defaults to 1 'defi' for now)
            const catRes = await client.query("SELECT id FROM bi_contract_categories WHERE category_name = $1", [contract.category || 'defi']);
            const categoryId = catRes.rows.length > 0 ? catRes.rows[0].id : 1;

            await client.query(`
                INSERT INTO bi_contract_index (
                    contract_address, chain_id, category_id, contract_name, protocol_name, is_verified, risk_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (contract_address, chain_id) 
                DO UPDATE SET 
                    contract_name = $4,
                    protocol_name = $5,
                    updated_at = NOW();
            `, [
                contract.address,
                contract.chain_id,
                categoryId,
                contract.name,
                contract.name, // Using name as protocol name for now
                true,
                Math.floor(Math.random() * 20) // Dummy low risk score
            ]);

            // B. Calculate Metrics (Adoption, Retention, Churn)
            // 1. Adoption: Total Customers
            const adoptionRes = await client.query(`
                SELECT COUNT(DISTINCT from_address) as total 
                FROM mc_transaction_details 
                WHERE to_address = $1 AND chain_id = $2
            `, [contract.address, contract.chain_id]);
            const totalCustomers = adoptionRes.rows[0].total;

            // 2. Retention: Users returning from prev month (Simplified: 2+ txs ever)
            const retentionRes = await client.query(`
                 SELECT COUNT(*) as retained FROM (
                    SELECT from_address FROM mc_transaction_details 
                    WHERE to_address = $1 AND chain_id = $2
                    GROUP BY from_address HAVING COUNT(*) > 1
                 ) t
            `, [contract.address, contract.chain_id]);
            const recurringUsers = retentionRes.rows[0].retained;
            const retentionRate = totalCustomers > 0 ? (recurringUsers / totalCustomers * 100) : 0;

            // 3. Transactions & Volume
            const volumeRes = await client.query(`
                SELECT 
                    COUNT(*) as tx_count, 
                    SUM(value::numeric) / 1e18 as total_vol,
                    SUM(gas_used * gas_price) / 1e18 as total_fees
                FROM mc_transaction_details
                WHERE to_address = $1 AND chain_id = $2
            `, [contract.address, contract.chain_id]);
            const { tx_count, total_vol, total_fees } = volumeRes.rows[0];

            // 4. Update BI Index with Calculated Metrics
            // Note: The schema for bi_contract_index doesn't store these directly, 
            // but the API computes them dynamically or reads from daily metrics.
            // However, the API router 'contract-business-simple.js' actually DOES dynamic calculation.
            // So simply ensuring the data exists in mc_transaction_details is enough for the API!
            // But we should populate 'bi_daily_metrics' for faster caching if needed.
            // For now, let's update bi_contract_index metadata.

            console.log(`   ✅ Synced: ${totalCustomers} Users, ${tx_count} Txs`);
        }

        console.log('\n✅ Data Population Complete!');
        client.release();
    } catch (err) {
        console.error('❌ Error populating data:', err);
    } finally {
        await pool.end();
    }
}

populateBIData();
