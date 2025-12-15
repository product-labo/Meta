#!/usr/bin/env node

/**
 * Create Lisk database using SQL commands
 * Run this with: psql -U postgres -f create-lisk-db.sql
 */

import { writeFileSync } from 'fs';

const sqlCommands = `
-- Create boardling_lisk database
CREATE DATABASE boardling_lisk;

-- Connect to the new database
\\c boardling_lisk

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON DATABASE boardling_lisk TO postgres;
GRANT ALL ON SCHEMA public TO postgres;

-- Show success message
SELECT 'Database boardling_lisk created successfully!' as message;
`;

writeFileSync('create-lisk-db.sql', sqlCommands);

console.log('✓ SQL file created: create-lisk-db.sql');
console.log('\nTo create the database, run:');
console.log('  psql -U postgres -f create-lisk-db.sql');
console.log('\nOr manually:');
console.log('  1. Open pgAdmin or psql');
console.log('  2. Run: CREATE DATABASE boardling_lisk;');
console.log('\nThen run migrations with:');
console.log('  node run-migrations-simple.js');
