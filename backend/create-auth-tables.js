#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function createUsersTable() {
  try {
    console.log('🔧 Creating users table for authentication...');
    
    // Create users table with essential fields for auth
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        phone_number VARCHAR(50),
        password_hash VARCHAR(255),
        name VARCHAR(255),
        avatar_url TEXT,
        roles TEXT[] DEFAULT '{}',
        is_verified BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        otp_secret VARCHAR(10),
        google_id VARCHAR(255),
        github_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'free',
        subscription_expires_at TIMESTAMP,
        default_wallet_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Users table created successfully');
    
    // Create api_keys table for API access
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        permissions TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ API keys table created successfully');
    
    // Create projects table for user projects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        tags TEXT[] DEFAULT '{}',
        website_url TEXT,
        github_url TEXT,
        twitter_url TEXT,
        logo_url TEXT,
        launch_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Projects table created successfully');
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
      CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    `);
    
    console.log('✅ Database indexes created successfully');
    
    // Test the setup
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\n📊 Database ready! Current users: ${userCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await pool.end();
  }
}

createUsersTable();
