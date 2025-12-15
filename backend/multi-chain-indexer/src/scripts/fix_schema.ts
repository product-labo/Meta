
import { dbService } from '../services/DbService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function fix() {
    console.log('Fixing Schema...');
    const client = await dbService.getClient();

    try {
        await client.query(`
            ALTER TABLE mc_chain_snapshots 
            ADD COLUMN IF NOT EXISTS fee_history_json JSONB;
        `);
        console.log('Added fee_history_json column.');
    } catch (e) {
        console.error('Fix Failed:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

fix();
