console.log('Testing migration script...');

import { runMigration } from './run-metrics-migration.js';

console.log('About to run migration...');
runMigration().then(() => {
    console.log('Migration completed!');
}).catch(error => {
    console.error('Migration error:', error);
});