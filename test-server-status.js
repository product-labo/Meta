/**
 * Test Server Status
 * Check if the server is running and responding
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

console.log('🔍 Testing Server Status...\n');

// Test 1: Health check
console.log('1. Testing health endpoint...');
try {
  const response = await fetch(`${API_URL}/health`);
  const data = await response.json();
  console.log(`   Status: ${response.status}`);
  console.log(`   Response:`, data);
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
  console.log('   Server might not be running!');
}

// Test 2: Root endpoint
console.log('\n2. Testing root endpoint...');
try {
  const response = await fetch(`${API_URL}/`);
  const data = await response.json();
  console.log(`   Status: ${response.status}`);
  console.log(`   API Name:`, data.name);
} catch (error) {
  console.log(`   ❌ Error:`, error.message);
}

console.log('\n🎯 Server Status Test Complete!');