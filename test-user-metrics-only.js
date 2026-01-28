#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testUserMetrics() {
  try {
    // Register user
    const userData = {
      email: `test-metrics-${Date.now()}@example.com`,
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

    console.log('✅ User registered');

    // Test user metrics endpoint
    console.log('🔍 Testing user metrics endpoint...');
    
    const response = await fetch(`${API_URL}/api/onboarding/user-metrics`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (responseText) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ User metrics parsed successfully:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError.message);
        console.error('Raw response:', responseText);
      }
    } else {
      console.error('❌ Empty response');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserMetrics();