/**
 * Unit Tests for Registration Endpoint
 * Tests user registration functionality including validation and error handling
 * Requirements: 1.1, 1.3, 1.4
 * 
 * Run with: node backend/tests/unit/test-registration-endpoint.js
 * Requires: Backend server running on http://localhost:3001
 */

import axios from 'axios';
import bcrypt from 'bcryptjs';
import { pool } from '../../src/config/appConfig.js';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Helper to generate unique email
const generateEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

// Helper to clean up test users
async function cleanupTestUser(email) {
  try {
    await pool.query('DELETE FROM users WHERE email = $1', [email.toLowerCase()]);
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`✓ ${testName}`);
    return true;
  } catch (error) {
    failedTests++;
    console.error(`✗ ${testName}`);
    console.error(`  Error: ${error.message}`);
    return false;
  }
}

// Test Suite: Successful Registration
async function testSuccessfulRegistration() {
  console.log('\n=== Successful Registration ===');

  await runTest('should register a new user with valid data', async () => {
    const userData = {
      name: 'John Doe',
      email: generateEmail(),
      password: 'securePassword123',
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);

      if (response.status !== 201) throw new Error(`Expected status 201, got ${response.status}`);
      if (!response.data.success) throw new Error('Expected success to be true');
      if (response.data.message !== 'User registered successfully') {
        throw new Error(`Expected message 'User registered successfully', got '${response.data.message}'`);
      }
      if (!response.data.token) throw new Error('Expected token to be present');
      if (!response.data.user) throw new Error('Expected user object to be present');
      if (!response.data.user.id) throw new Error('Expected user.id to be present');
      if (response.data.user.name !== userData.name) {
        throw new Error(`Expected user.name to be '${userData.name}', got '${response.data.user.name}'`);
      }
      if (response.data.user.email !== userData.email.toLowerCase()) {
        throw new Error(`Expected user.email to be '${userData.email.toLowerCase()}', got '${response.data.user.email}'`);
      }
      if (!response.data.user.created_at) throw new Error('Expected user.created_at to be present');

      // Verify JWT token format (3 parts separated by dots)
      const tokenParts = response.data.token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error(`Expected JWT token to have 3 parts, got ${tokenParts.length}`);
      }

      await cleanupTestUser(userData.email);
    } catch (error) {
      await cleanupTestUser(userData.email);
      throw error;
    }
  });

  await runTest('should hash the password before storing', async () => {
    const userData = {
      name: 'Jane Smith',
      email: generateEmail(),
      password: 'mySecurePass456',
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      if (response.status !== 201) throw new Error(`Expected status 201, got ${response.status}`);

      // Query database to verify password was hashed
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE email = $1',
        [userData.email.toLowerCase()]
      );

      if (result.rows.length === 0) throw new Error('User not found in database');

      const hashedPassword = result.rows[0].password_hash;

      // Verify it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
      if (!/^\$2[aby]\$/.test(hashedPassword)) {
        throw new Error(`Expected bcrypt hash format, got '${hashedPassword.substring(0, 10)}...'`);
      }

      // Verify the hash is not the plain password
      if (hashedPassword === userData.password) throw new Error('Password was not hashed');

      // Verify the hash can be validated against the original password
      const isValid = await bcrypt.compare(userData.password, hashedPassword);
      if (!isValid) throw new Error('Password hash does not match original password');

      await cleanupTestUser(userData.email);
    } catch (error) {
      await cleanupTestUser(userData.email);
      throw error;
    }
  });

  await runTest('should convert email to lowercase', async () => {
    const userData = {
      name: 'Test User',
      email: `Test.User.${Date.now()}@EXAMPLE.COM`,
      password: 'password12345',
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      if (response.status !== 201) throw new Error(`Expected status 201, got ${response.status}`);

      const expectedEmail = userData.email.toLowerCase();
      if (response.data.user.email !== expectedEmail) {
        throw new Error(`Expected email to be '${expectedEmail}', got '${response.data.user.email}'`);
      }

      await cleanupTestUser(userData.email);
    } catch (error) {
      await cleanupTestUser(userData.email);
      throw error;
    }
  });
}

// Test Suite: Duplicate Email Rejection
async function testDuplicateEmailRejection() {
  console.log('\n=== Duplicate Email Rejection ===');

  await runTest('should reject registration with existing email', async () => {
    const userData = {
      name: 'Duplicate User',
      email: generateEmail(),
      password: 'password123',
    };

    try {
      // First registration
      const firstResponse = await axios.post(`${API_URL}/auth/register`, userData);
      if (firstResponse.status !== 201) {
        throw new Error(`First registration failed with status ${firstResponse.status}`);
      }

      // Attempt duplicate registration
      try {
        await axios.post(`${API_URL}/auth/register`, userData);
        throw new Error('Duplicate registration should have been rejected');
      } catch (error) {
        if (!error.response) throw error;
        if (error.response.status !== 409) {
          throw new Error(`Expected status 409, got ${error.response.status}`);
        }
        if (error.response.data.error !== 'ALREADY_EXISTS') {
          throw new Error(`Expected error 'ALREADY_EXISTS', got '${error.response.data.error}'`);
        }
        if (!error.response.data.message.includes('already exists')) {
          throw new Error(`Expected message to include 'already exists', got '${error.response.data.message}'`);
        }
      }

      await cleanupTestUser(userData.email);
    } catch (error) {
      await cleanupTestUser(userData.email);
      throw error;
    }
  });

  await runTest('should check for duplicate email case-insensitively', async () => {
    const baseEmail = `test.${Date.now()}@example.com`;
    const userData1 = {
      name: 'Test User 1',
      email: baseEmail.toLowerCase(),
      password: 'password123',
    };
    const userData2 = {
      name: 'Test User 2',
      email: baseEmail.toUpperCase(),
      password: 'password456',
    };

    try {
      // Register with lowercase email
      const firstResponse = await axios.post(`${API_URL}/auth/register`, userData1);
      if (firstResponse.status !== 201) {
        throw new Error(`First registration failed with status ${firstResponse.status}`);
      }

      // Attempt registration with uppercase email
      try {
        await axios.post(`${API_URL}/auth/register`, userData2);
        throw new Error('Duplicate registration with different case should have been rejected');
      } catch (error) {
        if (!error.response) throw error;
        if (error.response.status !== 409) {
          throw new Error(`Expected status 409, got ${error.response.status}`);
        }
      }

      await cleanupTestUser(baseEmail);
    } catch (error) {
      await cleanupTestUser(baseEmail);
      throw error;
    }
  });
}

// Test Suite: Invalid Email Format
async function testInvalidEmailFormat() {
  console.log('\n=== Invalid Email Format ===');

  await runTest('should reject registration with invalid email format', async () => {
    const userData = {
      name: 'Test User',
      email: 'not-an-email',
      password: 'password123',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration with invalid email should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
      if (error.response.data.message !== 'Invalid email format') {
        throw new Error(`Expected message 'Invalid email format', got '${error.response.data.message}'`);
      }
    }
  });

  await runTest('should reject email without @ symbol', async () => {
    const userData = {
      name: 'Test User',
      email: 'invalidemail.com',
      password: 'password123',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration with email without @ should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
    }
  });

  await runTest('should reject email without domain', async () => {
    const userData = {
      name: 'Test User',
      email: 'user@',
      password: 'password123',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration with email without domain should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
    }
  });

  await runTest('should reject email with spaces', async () => {
    const userData = {
      name: 'Test User',
      email: 'user @example.com',
      password: 'password123',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration with email containing spaces should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
    }
  });
}

// Test Suite: Weak Password Rejection
async function testWeakPasswordRejection() {
  console.log('\n=== Weak Password Rejection ===');

  await runTest('should reject password shorter than 8 characters', async () => {
    const userData = {
      name: 'Test User',
      email: generateEmail(),
      password: 'short',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration with short password should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
      if (!error.response.data.message.includes('8 characters')) {
        throw new Error(`Expected message to include '8 characters', got '${error.response.data.message}'`);
      }
    }
  });

  await runTest('should reject password with exactly 7 characters', async () => {
    const userData = {
      name: 'Test User',
      email: generateEmail(),
      password: 'pass123',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration with 7-character password should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
      if (!error.response.data.message.includes('8 characters')) {
        throw new Error(`Expected message to include '8 characters', got '${error.response.data.message}'`);
      }
    }
  });

  await runTest('should accept password with exactly 8 characters', async () => {
    const userData = {
      name: 'Test User',
      email: generateEmail(),
      password: 'pass1234',
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      if (response.status !== 201) {
        throw new Error(`Expected status 201, got ${response.status}`);
      }

      await cleanupTestUser(userData.email);
    } catch (error) {
      await cleanupTestUser(userData.email);
      throw error;
    }
  });

  await runTest('should reject empty password', async () => {
    const userData = {
      name: 'Test User',
      email: generateEmail(),
      password: '',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration with empty password should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
    }
  });
}

// Test Suite: Missing Required Fields
async function testMissingRequiredFields() {
  console.log('\n=== Missing Required Fields ===');

  await runTest('should reject registration without name', async () => {
    const userData = {
      email: generateEmail(),
      password: 'password123',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration without name should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
      if (!error.response.data.message.includes('All fields are required')) {
        throw new Error(`Expected message to include 'All fields are required', got '${error.response.data.message}'`);
      }
    }
  });

  await runTest('should reject registration without email', async () => {
    const userData = {
      name: 'Test User',
      password: 'password123',
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration without email should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
    }
  });

  await runTest('should reject registration without password', async () => {
    const userData = {
      name: 'Test User',
      email: generateEmail(),
    };

    try {
      await axios.post(`${API_URL}/auth/register`, userData);
      throw new Error('Registration without password should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
    }
  });

  await runTest('should reject registration with empty request body', async () => {
    try {
      await axios.post(`${API_URL}/auth/register`, {});
      throw new Error('Registration with empty body should have been rejected');
    } catch (error) {
      if (!error.response) throw error;
      if (error.response.status !== 400) {
        throw new Error(`Expected status 400, got ${error.response.status}`);
      }
      if (error.response.data.error !== 'VALIDATION_ERROR') {
        throw new Error(`Expected error 'VALIDATION_ERROR', got '${error.response.data.error}'`);
      }
    }
  });
}

// Test Suite: Response Structure Validation
async function testResponseStructure() {
  console.log('\n=== Response Structure Validation ===');

  await runTest('should not include password in response', async () => {
    const userData = {
      name: 'Test User',
      email: generateEmail(),
      password: 'password123',
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);

      if (response.status !== 201) {
        throw new Error(`Expected status 201, got ${response.status}`);
      }

      if (response.data.user.password) {
        throw new Error('Response should not include password field');
      }
      if (response.data.user.password_hash) {
        throw new Error('Response should not include password_hash field');
      }

      await cleanupTestUser(userData.email);
    } catch (error) {
      await cleanupTestUser(userData.email);
      throw error;
    }
  });

  await runTest('should include all required user fields in response', async () => {
    const userData = {
      name: 'Test User',
      email: generateEmail(),
      password: 'password123',
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);

      if (response.status !== 201) {
        throw new Error(`Expected status 201, got ${response.status}`);
      }

      if (!response.data.user.id) throw new Error('Response should include user.id');
      if (!response.data.user.name) throw new Error('Response should include user.name');
      if (!response.data.user.email) throw new Error('Response should include user.email');
      if (!response.data.user.created_at) throw new Error('Response should include user.created_at');

      await cleanupTestUser(userData.email);
    } catch (error) {
      await cleanupTestUser(userData.email);
      throw error;
    }
  });
}

// Main test runner
async function runAllTests() {
  console.log('===========================================');
  console.log('Registration Endpoint Unit Tests');
  console.log('===========================================');
  console.log(`Testing API at: ${API_URL}`);
  console.log('');

  try {
    await testSuccessfulRegistration();
    await testDuplicateEmailRejection();
    await testInvalidEmailFormat();
    await testWeakPasswordRejection();
    await testMissingRequiredFields();
    await testResponseStructure();

    console.log('\n===========================================');
    console.log('Test Summary');
    console.log('===========================================');
    console.log(`Total: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log('');

    if (failedTests === 0) {
      console.log('✓ All tests passed!');
      process.exit(0);
    } else {
      console.log(`✗ ${failedTests} test(s) failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\nTest suite error:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();
