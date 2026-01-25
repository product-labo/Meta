/**
 * Database initialization and connection management
 * MongoDB with Mongoose ODM
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/analytics_api',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
    }
  }
};

let db = null;

/**
 * Initialize database connection
 */
export async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('URI:', dbConfig.mongodb.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    // Connect to MongoDB
    await mongoose.connect(dbConfig.mongodb.uri, dbConfig.mongodb.options);
    
    db = mongoose.connection;
    
    db.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error.message);
    });
    
    db.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    db.once('open', () => {
      console.log('✅ MongoDB connected successfully');
    });
    
    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    // If MongoDB connection fails, continue without database (demo mode)
    console.log('⚠️  Continuing in demo mode without database...');
    return null;
  }
}

/**
 * Get database connection
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (db) {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

export default {
  initialize: initializeDatabase,
  getConnection: getDatabase,
  close: closeDatabase
};