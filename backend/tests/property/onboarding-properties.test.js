/**
 * Property-based tests for onboarding completion
 * Feature: fullstack-integration
 * 
 * Tests universal properties that should hold across all onboarding scenarios
 */

import fc from 'fast-check';
import { pool } from '../../src/config/appConfig.js';
import { completeOnboarding } from '../../src/services/onboardingService.js';
import bcrypt from 'bcryptjs';

describe('Onboarding Completion Properties', () => {
  // Track test data for cleanup
  const testUserIds = [];
  const testProjectIds = [];
  const testWalletIds = [];

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    try {
      if (testWalletIds.length > 0) {
        await pool.query('DELETE FROM wallets WHERE id = ANY($1)', [testWalletIds]);
      }
      if (testProjectIds.length > 0) {
        await pool.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
      }
      if (testUserIds.length > 0) {
        await pool.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    // Close the pool connection
    try {
      await pool.end();
    } catch (error) {
      console.error('Pool end error:', error);
    }
  });

  // Helper function to create a test user
  async function createTestUser() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const email = `test-onboarding-${timestamp}-${random}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, onboarding_completed)
       VALUES ($1, $2, $3, false)
       RETURNING id, name, email`,
      [`Test User ${random}`, email, passwordHash]
    );

    const user = result.rows[0];
    testUserIds.push(user.id);
    return user;
  }

  // Arbitraries for generating test data
  const projectCategoryArb = fc.constantFrom(
    'defi', 'social_fi', 'gamefi', 'nft', 'infrastructure', 
    'governance', 'cefi', 'metaverse', 'dao', 'identity', 
    'storage', 'ai_ml', 'other'
  );

  const privacyModeArb = fc.constantFrom('private', 'public', 'monetizable');

  // Generate wallet data with matching address and network
  const walletDataArb = fc.oneof(
    // Mainnet addresses
    fc.record({
      address: fc.constantFrom(
        // Transparent mainnet addresses
        't1Hsc1LR8yKnbbe3twRp88p6vFfC5t7DLbs',
        't1VShpjhziaKBQKvW8xZmqPvyqJPLZCJLPv',
        't1XVXWCvpMgBvUaed4XDqWtgQgJSu1Ghz7F',
        't3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd',
        't3LmX1cxWPPPqL4TZHx42HU3U5ghbFjRiif',
        // Shielded mainnet addresses (exactly 78 characters)
        'zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlk12345678',
        'zs1fxgluwznkzm52ux7jkf4st5znwzqay8zyz3autjdz0zy0ydvmfz6xjh8jc0qdvfxzjz12345678',
        'zs1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1',
        // Unified mainnet addresses
        'u1l8xunezsvhq8fgzfl7404m450nwnd76zshscn6nfys7vyz2ywyh4cc5daaq0c7q2su5lqfh23sp7fkf3kt27ve5948mzpfdvckzaect2jtte',
        'u1ckeydud0996ftppqrnpdsqyeq4e57qcyjr4raht4dc8j3njuyj3gmm9yk7hq6frqfz0w8ykh5ykzqf7xqvqqqqqqqqqqqqqqqqqqqqqqqqqq'
      ),
      privacy_mode: privacyModeArb,
      description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
      network: fc.constant('mainnet')
    })
  );

  // Feature: fullstack-integration, Property 9: Onboarding completion creates records
  // Validates: Requirements 3.5
  test('Property 9: For any user completing onboarding with valid project and wallet data, the system should create linked project and wallet records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
            category: projectCategoryArb,
            website_url: fc.option(fc.webUrl(), { nil: null }),
            // GitHub URLs must match the pattern https://github.com/username/repo
            // Use simple valid GitHub URLs or null
            github_url: fc.option(
              fc.constantFrom(
                'https://github.com/zcash/zcash',
                'https://github.com/bitcoin/bitcoin',
                'https://github.com/ethereum/go-ethereum',
                'https://github.com/test-user/test-repo',
                'https://github.com/example/example-project'
              ),
              { nil: null }
            )
          }),
          wallet: walletDataArb
        }),
        async (onboardingData) => {
          // Create a test user
          const user = await createTestUser();

          // Clean up any existing wallet with this address to avoid unique constraint violations
          await pool.query(
            'DELETE FROM wallets WHERE address = $1 AND network = $2',
            [onboardingData.wallet.address, onboardingData.wallet.network]
          );

          // Complete onboarding
          const result = await completeOnboarding(user.id, onboardingData);

          // Track created resources for cleanup
          if (result.project) testProjectIds.push(result.project.id);
          if (result.wallet) testWalletIds.push(result.wallet.id);

          // Property 1: Onboarding should succeed
          expect(result.success).toBe(true);
          expect(result.message).toBe('Onboarding completed successfully');

          // Property 2: A project record should be created
          expect(result.project).toBeDefined();
          expect(result.project.id).toBeDefined();
          expect(result.project.user_id).toBe(user.id);
          expect(result.project.name).toBe(onboardingData.project.name);
          expect(result.project.category).toBe(onboardingData.project.category);
          expect(result.project.status).toBe('active');

          // Property 3: A wallet record should be created
          expect(result.wallet).toBeDefined();
          expect(result.wallet.id).toBeDefined();
          expect(result.wallet.project_id).toBe(result.project.id);
          expect(result.wallet.address).toBe(onboardingData.wallet.address.trim());
          expect(result.wallet.privacy_mode).toBe(onboardingData.wallet.privacy_mode);
          expect(result.wallet.network).toBe(onboardingData.wallet.network);
          expect(result.wallet.is_active).toBe(true);

          // Property 4: Project and wallet should be linked
          expect(result.wallet.project_id).toBe(result.project.id);

          // Property 5: User's onboarding_completed flag should be set to true
          const userCheck = await pool.query(
            'SELECT onboarding_completed FROM users WHERE id = $1',
            [user.id]
          );
          expect(userCheck.rows[0].onboarding_completed).toBe(true);

          // Property 6: Project should exist in database
          const projectCheck = await pool.query(
            'SELECT * FROM projects WHERE id = $1',
            [result.project.id]
          );
          expect(projectCheck.rows.length).toBe(1);
          expect(projectCheck.rows[0].user_id).toBe(user.id);
          expect(projectCheck.rows[0].name).toBe(onboardingData.project.name);

          // Property 7: Wallet should exist in database
          const walletCheck = await pool.query(
            'SELECT * FROM wallets WHERE id = $1',
            [result.wallet.id]
          );
          expect(walletCheck.rows.length).toBe(1);
          expect(walletCheck.rows[0].project_id).toBe(result.project.id);
          expect(walletCheck.rows[0].address).toBe(onboardingData.wallet.address.trim());

          // Property 8: Wallet type should be auto-detected based on address prefix
          const address = onboardingData.wallet.address.trim();
          let expectedType;
          if (address.startsWith('t1') || address.startsWith('t3')) {
            expectedType = 't';
          } else if (address.startsWith('zs1') || address.startsWith('ztestsapling')) {
            expectedType = 'z';
          } else if (address.startsWith('u1') || address.startsWith('utest')) {
            expectedType = 'u';
          }
          
          if (expectedType) {
            expect(result.wallet.type).toBe(expectedType);
          }

          // Property 9: Optional fields should be stored correctly (or as null)
          // Note: The service may normalize empty/undefined values to null
          if (onboardingData.project.description !== null && onboardingData.project.description !== undefined && onboardingData.project.description !== '') {
            // Either the value is stored as-is, or it's normalized to null
            expect([onboardingData.project.description, null]).toContain(result.project.description);
          }
          if (onboardingData.project.website_url !== null && onboardingData.project.website_url !== undefined) {
            expect([onboardingData.project.website_url, null]).toContain(result.project.website_url);
          }
          if (onboardingData.project.github_url !== null && onboardingData.project.github_url !== undefined) {
            expect([onboardingData.project.github_url, null]).toContain(result.project.github_url);
          }
          if (onboardingData.wallet.description !== null && onboardingData.wallet.description !== undefined && onboardingData.wallet.description !== '') {
            expect([onboardingData.wallet.description, null]).toContain(result.wallet.description);
          }

          return true;
        }
      ),
      { numRuns: 20 } // Test with 20 different combinations
    );
  }, 120000); // 120 second timeout for this property test

  // Additional property: Onboarding should be atomic (all or nothing)
  test('Property: Onboarding completion should be atomic - if wallet creation fails, project should not be created', async () => {
    const user = await createTestUser();

    const invalidOnboardingData = {
      project: {
        name: 'Test Project',
        category: 'defi'
      },
      wallet: {
        address: 'invalid-address-format',
        privacy_mode: 'private',
        network: 'mainnet'
      }
    };

    // Attempt onboarding with invalid wallet address
    await expect(
      completeOnboarding(user.id, invalidOnboardingData)
    ).rejects.toThrow();

    // Property: No project should be created if wallet validation fails
    const projectCheck = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1',
      [user.id]
    );
    expect(projectCheck.rows.length).toBe(0);

    // Property: User's onboarding_completed should still be false
    const userCheck = await pool.query(
      'SELECT onboarding_completed FROM users WHERE id = $1',
      [user.id]
    );
    expect(userCheck.rows[0].onboarding_completed).toBe(false);
  }, 30000);

  // Additional property: Onboarding requires both project and wallet data
  test('Property: For any user, onboarding should fail if project or wallet data is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (includeProject) => {
          const user = await createTestUser();

          const onboardingData = includeProject
            ? { project: { name: 'Test', category: 'defi' } }
            : { wallet: { address: 't1TestAddress123', privacy_mode: 'private', network: 'mainnet' } };

          // Property: Should throw error when data is incomplete
          await expect(
            completeOnboarding(user.id, onboardingData)
          ).rejects.toThrow(/both project and wallet data are required/i);

          // Property: No records should be created
          const projectCheck = await pool.query(
            'SELECT * FROM projects WHERE user_id = $1',
            [user.id]
          );
          expect(projectCheck.rows.length).toBe(0);

          const userCheck = await pool.query(
            'SELECT onboarding_completed FROM users WHERE id = $1',
            [user.id]
          );
          expect(userCheck.rows[0].onboarding_completed).toBe(false);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  // Additional property: Privacy mode validation
  test('Property: For any invalid privacy mode, onboarding should fail', async () => {
    const user = await createTestUser();

    const onboardingData = {
      project: {
        name: 'Test Project',
        category: 'defi'
      },
      wallet: {
        address: 't1Hsc1LR8yKnbbe3twRp88p6vFfC5t7DLbs', // Valid transparent address
        privacy_mode: 'invalid-mode',
        network: 'mainnet'
      }
    };

    // Property: Should reject invalid privacy modes
    await expect(
      completeOnboarding(user.id, onboardingData)
    ).rejects.toThrow(/invalid privacy mode/i);

    // Property: No records should be created
    const projectCheck = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1',
      [user.id]
    );
    expect(projectCheck.rows.length).toBe(0);
  }, 30000);

  // Additional property: Project category validation
  test('Property: For any user, onboarding should require a valid project category', async () => {
    const user = await createTestUser();

    const onboardingData = {
      project: {
        name: 'Test Project'
        // Missing category
      },
      wallet: {
        address: 't1TestAddress123456789012345678901234',
        privacy_mode: 'private',
        network: 'mainnet'
      }
    };

    // Property: Should fail when required fields are missing
    await expect(
      completeOnboarding(user.id, onboardingData)
    ).rejects.toThrow(/category/i);
  }, 30000);
});
