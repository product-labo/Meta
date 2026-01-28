#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testSimpleEndpoint() {
  try {
    // First register a user to get a token
    const userData = {
      email: `test-simple-${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User'
    };

    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const registerData = await registerResponse.json();
    const token = registerData.token;

    console.log('✅ User registered, token obtained');

    // Test the simple test endpoint
    console.log('🔍 Testing simple test endpoint...');
    
    const testResponse = await fetch(`${API_URL}/api/onboarding/test-refresh`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Test endpoint status:', testResponse.status);
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Test endpoint works:', testData);
    } else {
      console.log('❌ Test endpoint failed');
    }

    // Test the actual refresh endpoint
    console.log('🔍 Testing refresh endpoint...');
    
    const refreshResponse = await fetch(`${API_URL}/api/onboarding/refresh-default-contract`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Refresh endpoint status:', refreshResponse.status);
    const refreshText = await refreshResponse.text();
    console.log('Refresh response:', refreshText);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleEndpoint();