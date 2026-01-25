/**
 * Database initialization and connection management
 * File-based storage system
 */

import { initializeStorage } from './fileStorage.js';

/**
 * Initialize database connection
 */
export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing file-based storage...');
    await initializeStorage();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Get database connection (not needed for file storage)
 */
export function getDatabase() {
  return null; // File storage doesn't need a connection object
}

/**
 * Close database connection (not needed for file storage)
 */
export async function closeDatabase() {
  console.log('✅ File storage closed');
}

export default {
  initialize: initializeDatabase,
  getConnection: getDatabase,
  close: closeDatabase
};