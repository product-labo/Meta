
import { dbService } from '../services/DbService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function check() {
    console.log('Verifying Database Content...');
    const client = await dbService.getClient();

    try {
        const chains = await client.query('SELECT count(*) FROM mc_chains');
        console.log(`Chains: ${chains.rows[0].count}`);

        const seeds = await client.query('SELECT count(*) FROM mc_registry');
        console.log(`Registry/Contracts: ${seeds.rows[0].count}`);

        const cycles = await client.query('SELECT * FROM mc_rotation_cycles ORDER BY id DESC LIMIT 1');
        console.log(`Active Cycle ID: ${cycles.rows[0]?.id || 'None'} (Status: ${cycles.rows[0]?.status})`);

        const snapshots = await client.query('SELECT count(*) FROM mc_chain_snapshots');
        console.log(`Chain Snapshots: ${snapshots.rows[0].count}`);

        const entities = await client.query('SELECT count(*) FROM mc_entity_snapshots');
        console.log(`Entity Snapshots: ${entities.rows[0].count}`);

        if (parseInt(entities.rows[0].count) > 0) {
            const sample = await client.query('SELECT * FROM mc_entity_snapshots LIMIT 1');
            console.log('Sample Data:', sample.rows[0]);
        }

    } catch (e) {
        console.error('Check Failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

check();
