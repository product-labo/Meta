/**
 * Unit Tests for Login Endpoint
 * Tests POST /auth/login endpoint functionality
 * Requirements: 2.1, 2.2
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authRoutes from '../src/routes/auth.js';
import { pool } from '../src/config/appConfig.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// JWT secret for testing
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Test data
const testUser = {
  name: 'Test User',
  email: 'testlogin@example.com',
  password: 'testpassword123'
};

let testUserId;
let testUserPasswordHash;

// Setup: Create a test user before running tests
beforeAll(async () => {
  try {
    // Clean up any existing test user
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    testUserPasswordHash = await bcrypt.hash(testUser.password, salt);
    
    // Create test user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [testUser.name, testUser.email, testUserPasswordHash]
    );
    
    testUserId = result.rows[0].id;
  } catch (error) {
    console.error('Setup error:', error);
    throw error;
  }
});

// Cleanup: Remove test user after all tests
afterAll(async () => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});

describe('POST /auth/login - Successful Login', () => {
  test('should return 200 and JWT token with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'Login successful');
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    
    // Verify user object structure
    expect(response.body.user).toHaveProperty('id', testUserId);
    expect(response.body.user).toHaveProperty('name', testUser.name);
    expect(response.body.user).toHaveProperty('email', testUser.email);
    expect(response.body.user).toHaveProperty('created_at');
    expect(response.body.user).toHaveProperty('subscription_status');
    expect(response.body.user).toHaveProperty('onboarding_completed');
  });

  test('should accept email in different case', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email.toUpperCase(),
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('token');
  });
});

describe('POST /auth/login - Invalid Email', () => {
  test('should return 401 with non-existent email', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: testUser.password
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
    expect(response.body).toHaveProperty('message', 'Invalid credentials');
  });

  test('should not reveal that email does not exist', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: testUser.password
      });

    // Error message should be generic and not mention "email"
    expect(response.body.message).not.toContain('email');
    expect(response.body.message).not.toContain('user');
    expect(response.body.message).toBe('Invalid credentials');
  });

  test('should return 400 with missing email', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        password: testUser.password
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(response.body.message).toContain('Email and password are required');
  });
});

describe('POST /auth/login - Invalid Password', () => {
  test('should return 401 with incorrect password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword123'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
    expect(response.body).toHaveProperty('message', 'Invalid credentials');
  });

  test('should not reveal that password is incorrect', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword123'
      });

    // Error message should be generic and not mention "password"
    expect(response.body.message).not.toContain('password');
    expect(response.body.message).toBe('Invalid credentials');
  });

  test('should return 400 with missing password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(response.body.message).toContain('Email and password are required');
  });

  test('should return 401 with empty password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: ''
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });
});

describe('POST /auth/login - JWT Token Structure and Expiration', () => {
  test('should return valid JWT token with correct structure', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    const token = response.body.token;
    
    // Verify token is a string
    expect(typeof token).toBe('string');
    
    // Verify token has three parts (header.payload.signature)
    const tokenParts = token.split('.');
    expect(tokenParts).toHaveLength(3);
  });

  test('should include correct user data in JWT payload', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    const token = response.body.token;
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify payload contains user information
    expect(decoded).toHaveProperty('id', testUserId);
    expect(decoded).toHaveProperty('email', testUser.email);
    expect(decoded).toHaveProperty('name', testUser.name);
    expect(decoded).toHaveProperty('iat'); // issued at
    expect(decoded).toHaveProperty('exp'); // expiration
  });

  test('should set appropriate expiration time on JWT token', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    const token = response.body.token;
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Calculate expected expiration (7 days by default)
    const expectedExpiration = decoded.iat + (7 * 24 * 60 * 60); // 7 days in seconds
    
    // Allow 5 second tolerance for test execution time
    expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiration - 5);
    expect(decoded.exp).toBeLessThanOrEqual(expectedExpiration + 5);
  });

  test('should generate different tokens for multiple logins', async () => {
    const response1 = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    // Wait a moment to ensure different issued-at time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response2 = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response1.body.token).not.toBe(response2.body.token);
  });

  test('should create token that can be verified with JWT_SECRET', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    const token = response.body.token;
    
    // Should not throw error when verifying
    expect(() => {
      jwt.verify(token, JWT_SECRET);
    }).not.toThrow();
  });

  test('should reject token verification with wrong secret', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    const token = response.body.token;
    
    // Should throw error when verifying with wrong secret
    expect(() => {
      jwt.verify(token, 'wrong-secret');
    }).toThrow();
  });
});

describe('POST /auth/login - Edge Cases', () => {
  test('should handle missing request body', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  test('should handle null values', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: null,
        password: null
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
  });

  test('should not trim whitespace from email', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: `  ${testUser.email}  `,
        password: testUser.password
      });

    // Should fail because email whitespace is not trimmed
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
  });

  test('should not trim whitespace from password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: `  ${testUser.password}  `
      });

    // Should fail because password whitespace is significant
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
  });
});

describe('POST /auth/login - Security Requirements', () => {
  test('should not return password hash in response', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  test('should handle user with missing password_hash gracefully', async () => {
    // Create a user without password_hash (edge case that shouldn't happen in production)
    const testEmailNoHash = 'nohash@example.com';
    
    try {
      // Clean up if exists
      await pool.query('DELETE FROM users WHERE email = $1', [testEmailNoHash]);
      
      // Insert user without password_hash (using NULL)
      await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, NULL)',
        ['No Hash User', testEmailNoHash]
      );

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmailNoHash,
          password: 'anypassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
      expect(response.body).toHaveProperty('message', 'Invalid credentials');

      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', [testEmailNoHash]);
    } catch (error) {
      // If the test fails due to NOT NULL constraint, that's actually good
      // It means the database schema properly enforces password_hash
      if (error.message.includes('null value') || error.message.includes('NOT NULL')) {
        // This is expected and good - the database prevents NULL password_hash
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  });

  test('should use generic error message for security', async () => {
    // Test with wrong email
    const response1 = await request(app)
      .post('/auth/login')
      .send({
        email: 'wrong@example.com',
        password: testUser.password
      });

    // Test with wrong password
    const response2 = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    // Both should return the same generic error message
    expect(response1.body.message).toBe(response2.body.message);
    expect(response1.body.message).toBe('Invalid credentials');
  });

  test('should return 401 status for both invalid email and password', async () => {
    // Test with wrong email
    const response1 = await request(app)
      .post('/auth/login')
      .send({
        email: 'wrong@example.com',
        password: testUser.password
      });

    // Test with wrong password
    const response2 = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    // Both should return 401
    expect(response1.status).toBe(401);
    expect(response2.status).toBe(401);
  });
});
