/**
 * Test Authentication Infrastructure
 * Tests user registration, login, JWT token generation and validation
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test user data
const testUser = {
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

let authToken = null;
let userId = null;

async function testRegistration() {
  console.log('\n=== Testing User Registration ===');
  
  try {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    
    console.log('✓ Registration successful');
    console.log('  User ID:', response.data.user.id);
    console.log('  Email:', response.data.user.email);
    console.log('  Token received:', response.data.token ? 'Yes' : 'No');
    
    authToken = response.data.token;
    userId = response.data.user.id;
    
    return true;
  } catch (error) {
    console.error('✗ Registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDuplicateRegistration() {
  console.log('\n=== Testing Duplicate Email Prevention ===');
  
  try {
    await axios.post(`${API_URL}/auth/register`, testUser);
    console.error('✗ Duplicate registration should have failed');
    return false;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✓ Duplicate email correctly rejected');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testPasswordValidation() {
  console.log('\n=== Testing Password Validation ===');
  
  try {
    await axios.post(`${API_URL}/auth/register`, {
      name: 'Test User',
      email: `test-short-${Date.now()}@example.com`,
      password: 'short'
    });
    console.error('✗ Short password should have been rejected');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('8 characters')) {
      console.log('✓ Short password correctly rejected');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n=== Testing User Login ===');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    console.log('✓ Login successful');
    console.log('  Token received:', response.data.token ? 'Yes' : 'No');
    console.log('  User ID matches:', response.data.user.id === userId);
    
    authToken = response.data.token;
    
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInvalidLogin() {
  console.log('\n=== Testing Invalid Credentials ===');
  
  try {
    await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: 'wrongpassword'
    });
    console.error('✗ Invalid login should have failed');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Invalid credentials correctly rejected');
      console.log('  Error message does not reveal which field is wrong:', 
        !error.response.data.message.includes('password') && 
        !error.response.data.message.includes('email'));
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testJWTValidation() {
  console.log('\n=== Testing JWT Token Validation ===');
  
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    console.log('✓ JWT token validated successfully');
    console.log('  User data retrieved:', response.data.user.email === testUser.email);
    
    return true;
  } catch (error) {
    console.error('✗ JWT validation failed:', error.response?.data || error.message);
    return false;
  }
}

async function testInvalidToken() {
  console.log('\n=== Testing Invalid Token Rejection ===');
  
  try {
    await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid-token-12345'
      }
    });
    console.error('✗ Invalid token should have been rejected');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Invalid token correctly rejected');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testMissingToken() {
  console.log('\n=== Testing Missing Token ===');
  
  try {
    await axios.get(`${API_URL}/auth/me`);
    console.error('✗ Request without token should have been rejected');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✓ Missing token correctly rejected');
      return true;
    }
    console.error('✗ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testPasswordChange() {
  console.log('\n=== Testing Password Change ===');
  
  try {
    const response = await axios.post(`${API_URL}/auth/change-password`, {
      currentPassword: testUser.password,
      newPassword: 'newpassword123'
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    console.log('✓ Password changed successfully');
    
    // Try logging in with new password
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: 'newpassword123'
    });
    
    console.log('✓ Login with new password successful');
    
    return true;
  } catch (error) {
    console.error('✗ Password change failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPasswordHashing() {
  console.log('\n=== Testing Password Hashing ===');
  
  try {
    // This test verifies that passwords are hashed by checking that
    // we can't login with a hash value directly
    const { pool } = await import('../src/config/appConfig.js');
    
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    const storedHash = result.rows[0].password_hash;
    
    // Verify it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    const isBcryptHash = /^\$2[aby]\$/.test(storedHash);
    
    if (isBcryptHash) {
      console.log('✓ Password is properly hashed with bcrypt');
      console.log('  Hash format:', storedHash.substring(0, 7) + '...');
      return true;
    } else {
      console.error('✗ Password is not properly hashed');
      return false;
    }
  } catch (error) {
    console.error('✗ Password hashing test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('===========================================');
  console.log('Authentication Infrastructure Test Suite');
  console.log('===========================================');
  
  const results = [];
  
  // Run tests in sequence
  results.push(await testRegistration());
  results.push(await testDuplicateRegistration());
  results.push(await testPasswordValidation());
  results.push(await testLogin());
  results.push(await testInvalidLogin());
  results.push(await testJWTValidation());
  results.push(await testInvalidToken());
  results.push(await testMissingToken());
  results.push(await testPasswordChange());
  results.push(await testPasswordHashing());
  
  // Summary
  console.log('\n===========================================');
  console.log('Test Summary');
  console.log('===========================================');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
