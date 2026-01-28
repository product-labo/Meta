#!/usr/bin/env node

/**
 * Simple test for onboarding API endpoints
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testHealthCheck() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data.status);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  try {
    const userData = {
      email: `test-simple-${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User'
    };

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error);
    }

    console.log('✅ User registration successful');
    return data.token;
  } catch (error) {
    console.error('❌ User registration failed:', error.message);
    return null;
  }
}

async function testOnboardingStatus(token) {
  try {
    const response = await fetch(`${API_URL}/api/onboarding/status`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response status:', response.status);
      console.error('Response text:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Onboarding status:', data);
    return data;
  } catch (error) {
    console.error('❌ Onboarding status failed:', error.message);
    return null;
  }
}

async function runSimpleTest() {
  console.log('🧪 Running Simple Onboarding Test');
  console.log('==================================');

  // Test 1: Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) return;

  // Test 2: User registration
  const token = await testUserRegistration();
  if (!token) return;

  // Test 3: Onboarding status
  const status = await testOnboardingStatus(token);
  if (!status) return;

  console.log('🎉 Simple test completed successfully!');
}

runSimpleTest().catch(console.error);