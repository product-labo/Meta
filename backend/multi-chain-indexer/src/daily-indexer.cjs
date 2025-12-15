const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const { ethers } = require('ethers');

// Load Env
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'boardling',
    password: process.env.DB_PASS || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: 20000,
    ssl: process.env.DB_SSL_ENABLED === 'true' ? { rejectUnauthorized: false } : undefined
});

// Load Indexer Env specifically for RPCs
const indexerEnvPath = path.join(__dirname, '../.env');
dotenv.config({ path: indexerEnvPath });

// RPC Configuration (Mapped from Env)
const RPCS = {
    1: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
    10: process.env.OPTIMISM_RPC || 'https://optimism-rpc.publicnode.com',
    56: process.env.BSC_RPC || 'https://bsc-rpc.publicnode.com',
    137: process.env.POLYGON_RPC || 'https://polygon-bor-rpc.publicnode.com',
    8453: process.env.BASE_RPC || 'https://base-rpc.publicnode.com',
    1135: process.env.LISK_MAINNET_RPC || 'https://rpc.api.lisk.com',
    42161: process.env.ARBITRUM_RPC || 'https://arbitrum-one-rpc.publicnode.com',
    43114: process.env.AVALANCHE_RPC || 'https://avalanche-c-chain-rpc.publicnode.com',
    250: process.env.FANTOM_RPC || 'https://fantom-rpc.publicnode.com',
    100: process.env.GNOSIS_RPC || 'https://gnosis-rpc.publicnode.com',
    42220: process.env.CELO_RPC || 'https://celo-rpc.publicnode.com',
    1284: process.env.MOONBEAM_RPC || 'https://moonbeam-rpc.publicnode.com',
    1285: process.env.MOONRIVER_RPC || 'https://moonriver-rpc.publicnode.com',
    25: process.env.CRONOS_RPC || 'https://cronos-evm-rpc.publicnode.com'
};

async function main() {
    console.log('🚀 Starting Daily Indexer Job...');
    const client = await pool.connect();

    try {
        // 1. Get Active Contracts from Registry
        const registry = await client.query('SELECT * FROM mc_registry WHERE is_active = true');
        console.log(`Found ${registry.rows.length} contracts to index.`);

        for (const contract of registry.rows) {
            console.log(`Processing ${contract.name} (${contract.address})...`);

            const rpcUrl = RPCS[contract.chain_id];
            if (!rpcUrl) {
                console.log(`   ⚠️ No RPC for chain ${contract.chain_id}, skipping.`);
                continue;
            }

            const provider = new ethers.JsonRpcProvider(rpcUrl);

            // Get Current Block
            let currentBlock;
            try {
                currentBlock = await provider.getBlockNumber();
            } catch (e) {
                console.log(`   ❌ RPC Access Failed: ${e.message}`);
                continue;
            }

            // Define 24h range (~7200 blocks)
            const fromBlock = currentBlock - 7200;
            console.log(`   Fetching logs from ${fromBlock} to ${currentBlock}...`);

            // Chunking loop (Max 1000 blocks per request)
            const MAX_BLOCK_RANGE = 1000;
            let logs = [];
            let chunkStart = fromBlock;

            while (chunkStart < currentBlock) {
                const chunkEnd = Math.min(chunkStart + MAX_BLOCK_RANGE, currentBlock);
                // console.log(`      Fetching ${chunkStart} -> ${chunkEnd}`);

                try {
                    const chunkLogs = await provider.getLogs({
                        address: contract.address,
                        fromBlock: chunkStart,
                        toBlock: chunkEnd
                    });
                    logs = logs.concat(chunkLogs);
                } catch (e) {
                    console.log(`      ⚠️ Chunk Failed (${chunkStart}-${chunkEnd}): ${e.message}`);
                }
                chunkStart = chunkEnd + 1; // Correctly move to next block
            }

            console.log(`   > Found ${logs.length} logs.`);
            if (logs.length === 0) continue;

            let totalGas = BigInt(0);
            const userSet = new Set();
            const txHashes = new Set();

            // Process Logs (Sample stats)
            for (const log of logs) {
                if (txHashes.has(log.transactionHash)) continue;
                txHashes.add(log.transactionHash);

                // Fetch TX details
                try {
                    const tx = await provider.getTransaction(log.transactionHash);
                    const receipt = await provider.getTransactionReceipt(log.transactionHash); // Need receipt for gasUsed? Ethers v6 tx response might have it? No, receipt has it.

                    if (tx && receipt) {
                        const gasUsed = receipt.gasUsed; // BigInt
                        const gasPrice = receipt.gasPrice || tx.gasPrice || BigInt(0);
                        const fee = gasUsed * gasPrice;

                        totalGas += gasUsed;
                        userSet.add(tx.from);

                        // Save to DB
                        // Note: Using 'captured_at' as NOW() since we don't fetch block timestamp for every tx to save requests
                        await client.query(`
                            INSERT INTO mc_transaction_details (
                                cycle_id, chain_id, tx_hash, block_number, tx_index,
                                from_address, to_address, value, gas_price, gas_limit, gas_used,
                                status, nonce, captured_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                            ON CONFLICT (tx_hash) DO NOTHING
                        `, [
                            1, // cycle
                            contract.chain_id,
                            tx.hash,
                            tx.blockNumber,
                            tx.index || 0,
                            tx.from,
                            tx.to,
                            tx.value.toString(),
                            gasPrice.toString(),
                            tx.gasLimit.toString(),
                            gasUsed.toString(),
                            1, // status success
                            tx.nonce
                        ]);
                    }
                } catch (txErr) {
                    // Ignore individual tx errors
                }
            }

            // Update Metrics for this Project (Find project_id by address)
            // We assume 1-to-1 mapping via contract_address in projects table
            const projRes = await client.query('SELECT id FROM projects WHERE contract_address = $1', [contract.address]);
            if (projRes.rows.length > 0) {
                const projectId = projRes.rows[0].id;

                await client.query(`
                    INSERT INTO project_metrics (project_id, total_users, gas_consumed, fees_generated)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (project_id) DO UPDATE SET
                        total_users = $2,
                        gas_consumed = $3,
                        fees_generated = $4,
                        updated_at = NOW()
                `, [
                    projectId,
                    userSet.size,
                    totalGas.toString(),
                    (Number(totalGas) * 0.000000001).toFixed(4) // rough ETH calc
                ]);
                console.log(`   Updated metrics for project ${projectId}`);
            }
        }

        // Cleanup Logic (Keep only last 24h of data to save space)
        console.log('🧹 Cleaning up old data...');
        const retentionRes = await client.query("DELETE FROM mc_transaction_details WHERE captured_at < NOW() - INTERVAL '24 hours'");
        console.log(`   Deleted ${retentionRes.rowCount} old transactions.`);

        console.log('✅ Daily Indexing Complete.');

    } catch (e) {
        console.error('Indexer Failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
