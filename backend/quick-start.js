#!/usr/bin/env node

/**
 * Quick Start Script for Boardling Development
 * 
 * This script helps you get the full system running quickly
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import http from 'http';

console.log('🚀 Boardling Quick Start\n');

// Check if .env exists
try {
  readFileSync('.env');
  console.log('✅ .env file found');
} catch {
  console.log('❌ .env file not found. Please create one based on .env.example');
  process.exit(1);
}

// Function to check if a service is running
function checkService(port, name) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => resolve(false));
    req.end();
  });
}

async function quickStart() {
  console.log('🔍 Checking services...\n');
  
  // Check PostgreSQL
  console.log('1. Checking PostgreSQL...');
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'boardling',
      password: process.env.DB_PASS || 'boardling123',
      database: process.env.DB_NAME || 'boardling',
      connectionTimeoutMillis: 3000,
    });
    
    await pool.query('SELECT 1');
    await pool.end();
    console.log('✅ PostgreSQL is running');
  } catch (error) {
    console.log('❌ PostgreSQL not accessible');
    console.log('💡 Run: docker run --name boardling-postgres -e POSTGRES_PASSWORD=boardling123 -e POSTGRES_USER=boardling -e POSTGRES_DB=boardling -p 5432:5432 -d postgres:15');
    console.log('💡 Then run: node setup-database.js');
    return;
  }
  
  // Check if backend is running
  console.log('2. Checking backend server...');
  const backendRunning = await checkService(3001, 'Backend');
  if (backendRunning) {
    console.log('✅ Backend server is running on port 3001');
  } else {
    console.log('⚠️  Backend server not running');
    console.log('💡 Run: npm start');
  }
  
  // Check if frontend is running
  console.log('3. Checking frontend server...');
  const frontendRunning = await checkService(5173, 'Frontend');
  if (frontendRunning) {
    console.log('✅ Frontend server is running on port 5173');
  } else {
    console.log('⚠️  Frontend server not running');
    console.log('💡 Run: npm run dev (in the root directory)');
  }
  
  console.log('\n📋 System Status:');
  console.log(`Database: ✅ Ready`);
  console.log(`Backend:  ${backendRunning ? '✅ Running' : '❌ Not running'}`);
  console.log(`Frontend: ${frontendRunning ? '✅ Running' : '❌ Not running'}`);
  
  if (backendRunning && frontendRunning) {
    console.log('\n🎉 All systems are running!');
    console.log('🌐 Frontend: http://localhost:5173');
    console.log('🔧 Backend API: http://localhost:3001');
    console.log('📊 Health Check: http://localhost:3001/health');
  } else {
    console.log('\n🔧 Start missing services to get the full system running');
  }
}

quickStart().catch(console.error);