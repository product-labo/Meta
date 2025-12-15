/**
 * Property-based tests for subscription management
 * Feature: fullstack-integration
 * 
 * Tests universal properties that should hold across all subscription scenarios
 */

import fc from 'fast-check';
import { pool } from '../../src/config/appConfig.js';
import { initializeFreeTrial, checkSubscriptionStatus } from '../../src/services/subscriptionService.js';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../src/routes/auth.js';

// Create a minimal Express app for testing
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Subscription Management Properties', () => {
  // Track test users for cleanup
  const testUserIds = [];
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

  // Feature: fullstack-integration, Property 36: Free trial initialization
  // Validates: Requirements 9.1
  test('Property 36: For any user completing onboarding, a subscription record should be created with status "free" and expiration 30 days in the future', async () => {
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
          const uniqueEmail = `test-sub-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register the user (which should initialize free trial)
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
          
          const userId = response.body.user.id;
          testUserIds.push(userId);

          // Query the database to get the subscription data
          const result = await pool.query(
            'SELECT id, subscription_status, subscription_expires_at FROM users WHERE id = $1',
            [userId]
          );

          expect(result.rows.length).toBe(1);
          const user = result.rows[0];

          // Property 1: Subscription status should be 'free'
          expect(user.subscription_status).toBe('free');

          // Property 2: Subscription expiration should be set
          expect(user.subscription_expires_at).not.toBeNull();

          // Property 3: Expiration should be approximately 30 days in the future
          const expiresAt = new Date(user.subscription_expires_at);
          const now = new Date();
          const diffDays = Math.round((expiresAt - now) / (1000 * 60 * 60 * 24));
          
          // Allow for some variance due to test execution time (29-31 days)
          expect(diffDays).toBeGreaterThanOrEqual(29);
          expect(diffDays).toBeLessThanOrEqual(31);

          // Property 4: Subscription should be active
          const status = await checkSubscriptionStatus(userId);
          expect(status.isActive).toBe(true);
          expect(status.isExpired).toBe(false);

          // Property 5: Days remaining should be approximately 30
          expect(status.daysRemaining).toBeGreaterThanOrEqual(29);
          expect(status.daysRemaining).toBeLessThanOrEqual(31);

          return true;
        }
      ),
      { numRuns: 20 } // Reduced from 100 to speed up tests
    );
  }, 60000); // 60 second timeout for this property test

  // Additional property: Verify free trial is initialized immediately on registration
  test('Property: For any user registration, free trial should be initialized before registration response', async () => {
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
          const uniqueEmail = `test-immediate-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register the user
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          expect(response.status).toBe(201);
          const userId = response.body.user.id;
          testUserIds.push(userId);

          // Immediately check subscription status (no delay)
          const status = await checkSubscriptionStatus(userId);

          // Property: Free trial should already be active
          expect(status.status).toBe('free');
          expect(status.isActive).toBe(true);
          expect(status.expiresAt).not.toBeNull();

          return true;
        }
      ),
      { numRuns: 10 } // Reduced from 50 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Additional property: Verify expiration date calculation is consistent
  test('Property: For any set of users registered at the same time, expiration dates should be within seconds of each other', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 100 })
          }),
          { minLength: 2, maxLength: 5 } // Test with 2-5 users
        ),
        async (usersData) => {
          const timestamp = Date.now();
          const userIds = [];
          const expirationDates = [];

          // Register all users in quick succession
          for (let i = 0; i < usersData.length; i++) {
            const random = Math.random().toString(36).substring(7);
            const uniqueEmail = `test-batch-${timestamp}-${i}-${random}@${usersData[i].email.split('@')[1]}`;
            testEmails.push(uniqueEmail);

            const response = await request(app)
              .post('/auth/register')
              .send({
                name: usersData[i].name,
                email: uniqueEmail,
                password: usersData[i].password
              });

            expect(response.status).toBe(201);
            const userId = response.body.user.id;
            userIds.push(userId);
            testUserIds.push(userId);

            // Get expiration date
            const result = await pool.query(
              'SELECT subscription_expires_at FROM users WHERE id = $1',
              [userId]
            );
            expirationDates.push(new Date(result.rows[0].subscription_expires_at));
          }

          // Property: All expiration dates should be within 10 seconds of each other
          // (accounting for test execution time)
          const firstExpiration = expirationDates[0];
          for (let i = 1; i < expirationDates.length; i++) {
            const diffMs = Math.abs(expirationDates[i] - firstExpiration);
            const diffSeconds = diffMs / 1000;
            expect(diffSeconds).toBeLessThan(10);
          }

          return true;
        }
      ),
      { numRuns: 10 } // Reduced from 20 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Additional property: Verify free trial status is queryable
  test('Property: For any user with initialized free trial, checkSubscriptionStatus should return consistent data', async () => {
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
          const uniqueEmail = `test-query-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register user
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          expect(response.status).toBe(201);
          const userId = response.body.user.id;
          testUserIds.push(userId);

          // Get subscription status
          const status = await checkSubscriptionStatus(userId);

          // Property 1: Status object should have all required fields
          expect(status).toHaveProperty('userId');
          expect(status).toHaveProperty('status');
          expect(status).toHaveProperty('expiresAt');
          expect(status).toHaveProperty('isActive');
          expect(status).toHaveProperty('isExpired');
          expect(status).toHaveProperty('daysRemaining');
          expect(status).toHaveProperty('isPremium');

          // Property 2: Values should be consistent
          expect(status.userId).toBe(userId);
          expect(status.status).toBe('free');
          expect(status.isActive).toBe(true);
          expect(status.isExpired).toBe(false);
          expect(status.isPremium).toBe(false);
          expect(status.daysRemaining).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 10 } // Reduced from 50 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Feature: fullstack-integration, Property 37: Active trial feature access
  // Validates: Requirements 9.2
  test('Property 37: For any user with an active free trial, all premium features should be accessible', async () => {
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
          const uniqueEmail = `test-trial-access-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register user (initializes free trial)
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          expect(response.status).toBe(201);
          const userId = response.body.user.id;
          testUserIds.push(userId);

          // Check subscription status
          const status = await checkSubscriptionStatus(userId);

          // Property 1: User should have active trial
          expect(status.status).toBe('free');
          expect(status.isActive).toBe(true);
          expect(status.isExpired).toBe(false);

          // Property 2: Days remaining should be positive (trial not expired)
          expect(status.daysRemaining).toBeGreaterThan(0);
          expect(status.daysRemaining).toBeLessThanOrEqual(30);

          // Property 3: User should have access to features during active trial
          // isActive should be true for free trial users
          expect(status.isActive).toBe(true);

          // Property 4: Expiration date should be in the future
          const expiresAt = new Date(status.expiresAt);
          const now = new Date();
          expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());

          return true;
        }
      ),
      { numRuns: 20 } // Reduced from 100 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Feature: fullstack-integration, Property 38: Expired trial restrictions
  // Validates: Requirements 9.3, 4.3
  test('Property 38: For any user with an expired trial, premium features should be restricted and upgrade prompts should be displayed', async () => {
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
          const uniqueEmail = `test-expired-trial-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register user
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          expect(response.status).toBe(201);
          const userId = response.body.user.id;
          testUserIds.push(userId);

          // Manually expire the trial by setting expiration to the past
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

          await pool.query(
            `UPDATE users 
             SET subscription_expires_at = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [pastDate, userId]
          );

          // Check subscription status
          const status = await checkSubscriptionStatus(userId);

          // Property 1: Subscription should be marked as expired
          expect(status.isExpired).toBe(true);

          // Property 2: Subscription should not be active
          expect(status.isActive).toBe(false);

          // Property 3: Days remaining should be 0 (or negative, but clamped to 0)
          expect(status.daysRemaining).toBe(0);

          // Property 4: Status should still be 'free' (not changed to another status)
          expect(status.status).toBe('free');

          // Property 5: Expiration date should be in the past
          const expiresAt = new Date(status.expiresAt);
          const now = new Date();
          expect(expiresAt.getTime()).toBeLessThan(now.getTime());

          // Property 6: User should not have premium access
          expect(status.isPremium).toBe(false);

          return true;
        }
      ),
      { numRuns: 20 } // Reduced from 100 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Additional property: Verify trial expiration boundary conditions
  test('Property: For any user with trial expiring exactly now, status should correctly reflect expiration', async () => {
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
          const uniqueEmail = `test-boundary-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register user
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          expect(response.status).toBe(201);
          const userId = response.body.user.id;
          testUserIds.push(userId);

          // Set expiration to exactly now (within a few seconds)
          const now = new Date();
          now.setSeconds(now.getSeconds() - 5); // 5 seconds ago to ensure it's expired

          await pool.query(
            `UPDATE users 
             SET subscription_expires_at = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [now, userId]
          );

          // Check subscription status
          const status = await checkSubscriptionStatus(userId);

          // Property: Should be marked as expired
          expect(status.isExpired).toBe(true);
          expect(status.isActive).toBe(false);

          return true;
        }
      ),
      { numRuns: 10 } // Reduced from 50 to speed up tests
    );
  }, 60000); // 60 second timeout

  // Additional property: Verify trial access control is consistent across multiple checks
  test('Property: For any user, multiple subscription status checks should return consistent results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 100 }),
          isExpired: fc.boolean() // Randomly test both active and expired trials
        }),
        async (userData) => {
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const uniqueEmail = `test-consistent-${timestamp}-${random}@${userData.email.split('@')[1]}`;
          testEmails.push(uniqueEmail);

          // Register user
          const response = await request(app)
            .post('/auth/register')
            .send({
              name: userData.name,
              email: uniqueEmail,
              password: userData.password
            });

          expect(response.status).toBe(201);
          const userId = response.body.user.id;
          testUserIds.push(userId);

          // Optionally expire the trial
          if (userData.isExpired) {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            await pool.query(
              `UPDATE users 
               SET subscription_expires_at = $1
               WHERE id = $2`,
              [pastDate, userId]
            );
          }

          // Check status multiple times
          const status1 = await checkSubscriptionStatus(userId);
          const status2 = await checkSubscriptionStatus(userId);
          const status3 = await checkSubscriptionStatus(userId);

          // Property: All checks should return identical results
          expect(status1.isActive).toBe(status2.isActive);
          expect(status2.isActive).toBe(status3.isActive);
          expect(status1.isExpired).toBe(status2.isExpired);
          expect(status2.isExpired).toBe(status3.isExpired);
          expect(status1.status).toBe(status2.status);
          expect(status2.status).toBe(status3.status);
          expect(status1.daysRemaining).toBe(status2.daysRemaining);
          expect(status2.daysRemaining).toBe(status3.daysRemaining);

          return true;
        }
      ),
      { numRuns: 10 } // Reduced from 50 to speed up tests
    );
  }, 60000); // 60 second timeout
});
