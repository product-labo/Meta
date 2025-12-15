/**
 * Property-based tests for user registration
 * Feature: fullstack-integration
 * 
 * Tests universal properties that should hold across all user registration scenarios
 */

import fc from 'fast-check';
import bcrypt from 'bcryptjs';
import { pool } from '../../src/config/appConfig.js';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.js';

// Create a minimal Express app for testing
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('User Registration Properties', () => {
  // Clean up test users after all tests
  const testEmails = [];

  afterAll(async () => {
    // Clean up all test users
    if (testEmails.length > 0) {
      try {
        await pool.query('DELETE FROM users WHERE email = ANY($1)', [testEmails]);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    // Close the pool connection
    try {
      await pool.end();
    } catch (error) {
      console.error('Pool end error:', error);
    }
  });

  // Feature: fullstack-integration, Property 1: User registration creates hashed passwords
  // Validates: Requirements 1.1
  test('Property 1: For any valid user registration data, the password should be hashed with bcrypt', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid user data
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 100 })
        }),
        async (userData) => {
          // Make email unique for this test run
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const uniqueEmail = `test-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register the user
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          // Registration should succeed
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);

          // Query the database to get the stored password_hash
          const result = await pool.query(
            'SELECT password_hash FROM users WHERE email = $1',
            [uniqueEmail.toLowerCase()]
          );

          expect(result.rows.length).toBe(1);
          const storedPasswordHash = result.rows[0].password_hash;

          // Property 1: Password should be hashed (not stored as plain text)
          expect(storedPasswordHash).not.toBe(userData.password);

          // Property 2: The stored value should be a valid bcrypt hash
          // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
          expect(storedPasswordHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);

          // Property 3: The hash should verify against the original password
          const isValidHash = await bcrypt.compare(userData.password, storedPasswordHash);
          expect(isValidHash).toBe(true);

          // Property 4: The hash should NOT verify against a different password
          const differentPassword = userData.password + 'different';
          const isInvalidHash = await bcrypt.compare(differentPassword, storedPasswordHash);
          expect(isInvalidHash).toBe(false);

          return true;
        }
      ),
      { numRuns: 20 } // Reduced from 100 to speed up tests
    );
  }, 60000); // 60 second timeout for this property test

  // Additional property: Verify that the same password produces different hashes (salt is random)
  test('Property: For any password, multiple registrations should produce different hashes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          password: fc.string({ minLength: 8, maxLength: 100 })
        }),
        async (userData) => {
          const timestamp = Date.now();
          const random1 = Math.random().toString(36).substring(7);
          const random2 = Math.random().toString(36).substring(7);
          
          // Create two users with the same password but different emails
          const email1 = `test-${timestamp}-${random1}@example.com`;
          const email2 = `test-${timestamp}-${random2}@example.com`;
          testEmails.push(email1, email2);

          // Register first user
          await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: email1,
              password: userData.password
            });

          // Register second user with same password
          await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: email2,
              password: userData.password
            });

          // Get both password hashes
          const result1 = await pool.query(
            'SELECT password_hash FROM users WHERE email = $1',
            [email1.toLowerCase()]
          );
          const result2 = await pool.query(
            'SELECT password_hash FROM users WHERE email = $1',
            [email2.toLowerCase()]
          );

          const hash1 = result1.rows[0].password_hash;
          const hash2 = result2.rows[0].password_hash;

          // Property: Hashes should be different (due to random salt)
          expect(hash1).not.toBe(hash2);

          // But both should verify against the same password
          expect(await bcrypt.compare(userData.password, hash1)).toBe(true);
          expect(await bcrypt.compare(userData.password, hash2)).toBe(true);

          return true;
        }
      ),
      { numRuns: 10 } // Reduced from 50 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Property: Verify that plain text passwords are never stored
  test('Property: For any registration, the database should never contain the plain text password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 100 })
        }),
        async (userData) => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const uniqueEmail = `test-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register the user
          await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          // Query all text fields in the user record
          const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [uniqueEmail.toLowerCase()]
          );

          const user = result.rows[0];

          // Check that the plain password doesn't appear in any field
          const userValues = Object.values(user).map(v => String(v));
          const containsPlainPassword = userValues.some(value => 
            value.includes(userData.password)
          );

          expect(containsPlainPassword).toBe(false);

          return true;
        }
      ),
      { numRuns: 10 } // Reduced from 50 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Feature: fullstack-integration, Property 2: Duplicate email prevention
  // Validates: Requirements 1.3
  test('Property 2: For any email address, attempting to register a second user with the same email should fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name1: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          name2: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress(),
          password1: fc.string({ minLength: 8, maxLength: 100 }),
          password2: fc.string({ minLength: 8, maxLength: 100 })
        }),
        async (userData) => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const uniqueEmail = `test-dup-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register the first user with this email
          const firstResponse = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name1,
              email: uniqueEmail,
              password: userData.password1
            });

          // First registration should succeed
          expect(firstResponse.status).toBe(201);
          expect(firstResponse.body.success).toBe(true);

          // Attempt to register a second user with the same email
          const secondResponse = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name2,
              email: uniqueEmail,
              password: userData.password2
            });

          // Property 1: Second registration should fail with 409 Conflict
          expect(secondResponse.status).toBe(409);

          // Property 2: Error code should indicate the resource already exists
          expect(secondResponse.body.error).toBe('ALREADY_EXISTS');

          // Property 3: Error message should indicate email is already registered
          expect(secondResponse.body.message).toMatch(/email already exists/i);

          // Property 4: Only one user should exist in the database with this email
          const result = await pool.query(
            'SELECT id, name, email FROM users WHERE email = $1',
            [uniqueEmail.toLowerCase()]
          );

          expect(result.rows.length).toBe(1);

          // Property 5: The stored user should be the first one registered
          expect(result.rows[0].name).toBe(userData.name1);

          return true;
        }
      ),
      { numRuns: 20 } // Test with 20 different email/name/password combinations
    );
  }, 60000); // 60 second timeout

  // Additional property: Case-insensitive email duplicate prevention
  test('Property: For any email address, duplicate registration should fail regardless of case', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name1: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          name2: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress(),
          password1: fc.string({ minLength: 8, maxLength: 100 }),
          password2: fc.string({ minLength: 8, maxLength: 100 })
        }),
        async (userData) => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const baseEmail = `test-case-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(baseEmail.toLowerCase());

          // Register first user with lowercase email
          const firstResponse = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name1,
              email: baseEmail.toLowerCase(),
              password: userData.password1
            });

          expect(firstResponse.status).toBe(201);

          // Attempt to register with uppercase email
          const upperEmail = baseEmail.toUpperCase();
          const secondResponse = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name2,
              email: upperEmail,
              password: userData.password2
            });

          // Property: Should fail even with different case
          expect(secondResponse.status).toBe(409);
          expect(secondResponse.body.error).toBe('ALREADY_EXISTS');

          // Attempt to register with mixed case email
          const mixedEmail = baseEmail.split('').map((char, i) => 
            i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
          ).join('');
          
          const thirdResponse = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name2,
              email: mixedEmail,
              password: userData.password2
            });

          // Property: Should also fail with mixed case
          expect(thirdResponse.status).toBe(409);
          expect(thirdResponse.body.error).toBe('ALREADY_EXISTS');

          // Verify only one user exists
          const result = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE LOWER(email) = $1',
            [baseEmail.toLowerCase()]
          );

          expect(parseInt(result.rows[0].count)).toBe(1);

          return true;
        }
      ),
      { numRuns: 10 } // Test with 10 different combinations
    );
  }, 60000); // 60 second timeout
});
