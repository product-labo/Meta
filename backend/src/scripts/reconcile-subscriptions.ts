import { pool } from '../config/database.js';
import { contractService } from '../services/contractService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BATCH_SIZE = 50;

/**
 * Reconciles DB subscription status with On-Chain status.
 * Run this nightly.
 */
async function reconcileSubscriptions() {
    console.log('=== Starting Subscription Reconciliation ===');
    const client = await pool.connect();

    try {
        let offset = 0;
        while (true) {
            // Fetch users in batches who have a custodial wallet
            const query = `
                SELECT u.id, u.subscription_status, cw.address 
                FROM users u
                JOIN custodial_wallets cw ON u.id = cw.user_id 
                WHERE cw.project_id IS NULL
                ORDER BY u.created_at DESC
                LIMIT $1 OFFSET $2
            `;
            const res = await client.query(query, [BATCH_SIZE, offset]);

            if (res.rows.length === 0) break;

            console.log(`Processing batch ${offset} - ${offset + res.rows.length}...`);

            const subContract = contractService.getContract('SUBSCRIPTION');

            for (const user of res.rows) {
                try {
                    // Check On-Chain
                    const info = await subContract.getSubscriptionInfo(user.address);
                    const isActive = info.isActive;
                    const tier = Number(info.tier);

                    // Map tier to DB status
                    let expectedStatus = 'free';
                    if (isActive) {
                        // Simple mapping: 1,2,3 -> premium (or specialized logic)
                        if (tier >= 1) expectedStatus = 'premium';
                        if (tier === 3) expectedStatus = 'enterprise';
                    }

                    // Check for discrepancy
                    if (user.subscription_status !== expectedStatus) {
                        console.log(`[MISMATCH] User ${user.id} (${user.address}): DB=${user.subscription_status}, Chain=${expectedStatus}. Fixing...`);

                        // Update DB
                        await client.query(
                            'UPDATE users SET subscription_status = $1, subscription_expires_at = to_timestamp($2) WHERE id = $3',
                            [expectedStatus, Number(info.periodEnd), user.id]
                        );
                    }
                } catch (err) {
                    console.error(`Failed to reconcile user ${user.id}:`, err);
                }
            }

            offset += BATCH_SIZE;
        }

        console.log('=== Reconciliation Complete ===');

    } catch (error) {
        console.error('Fatal Reconciliation Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    reconcileSubscriptions();
}

export { reconcileSubscriptions };
