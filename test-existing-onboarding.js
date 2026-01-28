#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testExistingEndpoints() {
  try {
    // First register a user to get a token
    const userData = {
      email: `test-existing-${Date.now()}@example.com`,
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

    // Test existing onboarding status endpoint
    console.log('🔍 Testing existing onboarding status endpoint...');
    
    const statusResponse = await fetch(`${API_URL}/api/onboarding/status`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status endpoint status:', statusResponse.status);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status endpoint works:', statusData);
    } else {
      const statusText = await statusResponse.text();
      console.log('❌ Status endpoint failed:', statusText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testExistingEndpoints();