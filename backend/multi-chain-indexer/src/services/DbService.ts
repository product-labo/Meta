
import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

class DbService {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASS,
            port: parseInt(process.env.DB_PORT || '5432'),
            max: parseInt(process.env.DB_POOL_SIZE || '10'),
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        });

        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            // Optionally exit process to allow restart
            // process.exit(-1);
        });
    }

    public async query(text: string, params?: any[]): Promise<QueryResult> {
        return this.pool.query(text, params);
    }

    public async getClient() {
        return this.pool.connect();
    }
}

export const dbService = new DbService();
