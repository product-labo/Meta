#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testEndpoint() {
  try {
    // First register a user to get a token
    const userData = {
      email: `test-endpoint-${Date.now()}@example.com`,
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

    // Test if the refresh endpoint exists
    console.log('🔍 Testing refresh endpoint...');
    
    const response = await fetch(`${API_URL}/api/onboarding/refresh-default-contract`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (response.status === 404 && responseText.includes('not a valid endpoint')) {
      console.log('❌ Endpoint not found - route not registered');
    } else {
      console.log('✅ Endpoint exists');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoint();