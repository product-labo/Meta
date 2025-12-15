
import { pool } from '../src/config/database';

async function runMigration() {
    try {
        console.log('Starting migration 020...');

        await pool.query(`
            DO $$
            BEGIN
                -- Add chain column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'chain') THEN
                    ALTER TABLE projects ADD COLUMN chain VARCHAR(50);
                    RAISE NOTICE 'Added chain column';
                END IF;

                -- Add contract_address column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'contract_address') THEN
                    ALTER TABLE projects ADD COLUMN contract_address VARCHAR(100);
                    RAISE NOTICE 'Added contract_address column';
                END IF;

                -- Add abi column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'abi') THEN
                    ALTER TABLE projects ADD COLUMN abi TEXT;
                    RAISE NOTICE 'Added abi column';
                END IF;

                -- Add utility column
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'utility') THEN
                    ALTER TABLE projects ADD COLUMN utility VARCHAR(50);
                    RAISE NOTICE 'Added utility column';
                END IF;
            END $$;
        `);

        console.log('Migration 020 applied successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
