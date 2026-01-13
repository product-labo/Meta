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

async function checkDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log('📅 Current time:', testResult.rows[0].now);
    
    // Check if users table exists
    console.log('\n🔍 Checking users table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table exists');
      
      // Check table structure
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Users table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Check if there are any users
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`\n👥 Total users: ${userCount.rows[0].count}`);
      
      if (parseInt(userCount.rows[0].count) > 0) {
        const sampleUsers = await pool.query('SELECT id, email, is_verified, roles, created_at FROM users LIMIT 3');
        console.log('\n📝 Sample users:');
        sampleUsers.rows.forEach(user => {
          console.log(`  - ID: ${user.id}, Email: ${user.email}, Verified: ${user.is_verified}, Roles: ${JSON.stringify(user.roles)}`);
        });
      }
      
    } else {
      console.log('❌ Users table does not exist');
      console.log('💡 Need to run database migrations');
    }
    
    // Check other auth-related tables
    console.log('\n🔍 Checking other auth tables...');
    const authTables = ['api_keys', 'projects', 'wallets'];
    
    for (const tableName of authTables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      console.log(`  - ${tableName}: ${exists.rows[0].exists ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 PostgreSQL is not running or connection details are wrong');
    } else if (error.code === '3D000') {
      console.log('💡 Database does not exist');
    } else if (error.code === '28P01') {
      console.log('💡 Authentication failed - check username/password');
    }
  } finally {
    await pool.end();
  }
}

checkDatabase();
