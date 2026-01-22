import { readFileSync } from 'fs';
import { join } from 'path';

// Database migrations
export const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    sql: readFileSync(join(__dirname, '001_initial_schema.sql'), 'utf8')
  }
];
