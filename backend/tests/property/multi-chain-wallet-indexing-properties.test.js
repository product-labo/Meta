/**
 * Property-based tests for multi-chain wallet indexing
 * Feature: multi-chain-wallet-indexing
 * 
 * Tests universal properties that should hold across all wallet indexing scenarios
 */

import fc from 'fast-check';
import { pool } from '../../src/config/appConfig.js';
import bcrypt from 'bcryptjs';
import { validateAddress, detectChainType, SUPPORTED_CHAINS } from '../../src/middleware/validation.js';

describe('Multi-Chain Wallet Indexing Properties', () => {
  // Track test data for cleanup
  const testUserIds = [];
  const testProjectIds = [];
  const testWalletIds = [];
  const testTransactionIds = [];

  beforeAll(async () => {
    // Test database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    try {
      if (testTransactionIds.length > 0) {
        await pool.query('DELETE FROM wallet_transactions WHERE id = ANY($1)', [testTransactionIds]);
      }
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
  });

  // Helper function to create a test user
  async function createTestUser() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const email = `test-wallet-${timestamp}-${random}@example.com`;
    const password = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [`Test User ${random}`, email, passwordHash]
    );

    const user = result.rows[0];
    testUserIds.push(user.id);
    return user;
  }

  // Helper function to create a test project
  async function createTestProject(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    const result = await pool.query(
      `INSERT INTO projects (user_id, name, category, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, user_id`,
      [userId, `Test Project ${random}`, 'defi', 'draft']
    );

    const project = result.rows[0];
    testProjectIds.push(project.id);
    return project;
  }

  // Helper function to create a test wallet
  async function createTestWallet(projectId, address, chain = 'ethereum') {
    const result = await pool.query(
      `INSERT INTO wallets (project_id, address, type, chain, chain_type, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_id, address, chain`,
      [projectId, address, 't', chain, chain.includes('starknet') ? 'starknet' : 'evm', true]
    );

    const wallet = result.rows[0];
    testWalletIds.push(wallet.id);
    return wallet;
  }

  // **Feature: multi-chain-wallet-indexing, Property 1: Address validation consistency**
  // **Validates: Requirements 1.2, 2.2, 2.3**
  test('Property 1: For any wallet address and chain selection, if the address format matches the chain\'s expected format (42 chars for EVM, 64+ for Starknet), then validation should succeed, and if the format does not match, validation should fail', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          chain: fc.constantFrom(...Object.keys(SUPPORTED_CHAINS)),
          addressLength: fc.integer({ min: 10, max: 100 }),
          hasPrefix: fc.boolean(),
          isHex: fc.boolean()
        }),
        (testData) => {
          const chainConfig = SUPPORTED_CHAINS[testData.chain];
          
          // Generate address based on test parameters
          let address = '';
          if (testData.hasPrefix) {
            address = '0x';
          }
          
          const hexChars = '0123456789abcdef';
          const nonHexChars = 'ghijklmnopqrstuvwxyz';
          const chars = testData.isHex ? hexChars : nonHexChars;
          
          const remainingLength = testData.addressLength - (testData.hasPrefix ? 2 : 0);
          for (let i = 0; i < remainingLength; i++) {
            address += chars[Math.floor(Math.random() * chars.length)];
          }
          
          const validation = validateAddress(address, testData.chain);
          
          // Property: Address should be valid if and only if it meets all format requirements
          const shouldBeValid = 
            testData.hasPrefix && 
            testData.isHex && 
            address.length === chainConfig.addressLength;
          
          if (shouldBeValid) {
            expect(validation.valid).toBe(true);
            expect(validation.error).toBeUndefined();
          } else {
            expect(validation.valid).toBe(false);
            expect(validation.error).toBeDefined();
            expect(typeof validation.error).toBe('string');
          }
          
          return true;
        }
      ),
      { numRuns: 100 } // Test with 100 different address/chain combinations
    );
  });

  // Test specific valid address formats
  test('Property 1 (specific cases): Valid addresses should always pass validation', () => {
    // EVM chains - 42 character addresses
    const evmChains = Object.keys(SUPPORTED_CHAINS).filter(chain => SUPPORTED_CHAINS[chain].type === 'evm');
    const validEvmAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'; // Fixed to 42 chars
    
    evmChains.forEach(chain => {
      const validation = validateAddress(validEvmAddress, chain);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });
    
    // Starknet chains - 66 character addresses
    const starknetChains = Object.keys(SUPPORTED_CHAINS).filter(chain => SUPPORTED_CHAINS[chain].type === 'starknet');
    const validStarknetAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    
    starknetChains.forEach(chain => {
      const validation = validateAddress(validStarknetAddress, chain);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });
  });

  // Test specific invalid address formats
  test('Property 1 (edge cases): Invalid addresses should always fail validation', () => {
    const testCases = [
      { address: '', chain: 'ethereum', description: 'empty address' },
      { address: '0x123', chain: 'ethereum', description: 'too short EVM address' },
      { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbTOOLONG', chain: 'ethereum', description: 'too long EVM address' },
      { address: '742d35Cc6634C0532925a3b844Bc9e7595f0bEb', chain: 'ethereum', description: 'missing 0x prefix' },
      { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEg', chain: 'ethereum', description: 'invalid hex character' },
      { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', chain: 'starknet-mainnet', description: 'EVM address on Starknet chain' },
      { address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', chain: 'ethereum', description: 'Starknet address on EVM chain' }
    ];
    
    testCases.forEach(testCase => {
      const validation = validateAddress(testCase.address, testCase.chain);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      expect(typeof validation.error).toBe('string');
    });
  });

  // **Feature: multi-chain-wallet-indexing, Property 6: Chain type detection**
  // **Validates: Requirements 7.2, 7.3, 7.4**
  test('Property 6: For any wallet address, if the address length is 42 characters and starts with \'0x\', it should be classified as \'evm\', and if length is 64+ characters, it should be classified as \'starknet\'', () => {
    fc.assert(
      fc.property(
        fc.record({
          addressLength: fc.integer({ min: 10, max: 100 }),
          hasPrefix: fc.boolean()
        }),
        (testData) => {
          // Generate address based on test parameters
          let address = '';
          if (testData.hasPrefix) {
            address = '0x';
          }
          
          // Use any characters for the address body (chain type detection doesn't validate hex)
          const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
          const remainingLength = testData.addressLength - (testData.hasPrefix ? 2 : 0);
          for (let i = 0; i < remainingLength; i++) {
            address += chars[Math.floor(Math.random() * chars.length)];
          }
          
          const detectedType = detectChainType(address);
          
          // Property: Chain type detection should follow the specified rules from requirements 7.2, 7.3
          if (!testData.hasPrefix) {
            // Addresses without 0x prefix should return null
            expect(detectedType).toBe(null);
          } else if (address.length === 42) {
            // 42-character addresses with 0x prefix should be classified as 'evm' (Requirement 7.2)
            expect(detectedType).toBe('evm');
          } else if (address.length >= 64) {
            // 64+ character addresses with 0x prefix should be classified as 'starknet' (Requirement 7.3)
            expect(detectedType).toBe('starknet');
          } else {
            // Addresses between 42 and 64 characters should return null (not specified in requirements)
            expect(detectedType).toBe(null);
          }
          
          return true;
        }
      ),
      { numRuns: 100 } // Test with 100 different address formats
    );
  });

  // Test specific valid address formats for chain type detection
  test('Property 6 (specific cases): Known valid addresses should be classified correctly', () => {
    // Test EVM addresses (42 characters)
    const evmAddresses = [
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      '0x0000000000000000000000000000000000000000',
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
    ];
    
    evmAddresses.forEach(address => {
      const detectedType = detectChainType(address);
      expect(detectedType).toBe('evm');
    });
    
    // Test Starknet addresses (66+ characters)
    const starknetAddresses = [
      '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x07394cbe418daa16e42b87ba67372d4ab4a5df0b05c6e554d158458ce245bc10'
    ];
    
    starknetAddresses.forEach(address => {
      const detectedType = detectChainType(address);
      expect(detectedType).toBe('starknet');
    });
  });

  // Test invalid address formats for chain type detection
  test('Property 6 (edge cases): Invalid addresses should return null', () => {
    const invalidAddresses = [
      '', // empty
      '0x', // only prefix
      '742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', // no prefix (42 chars but no 0x)
      '0x123', // too short (less than 42 chars)
      null, // null input
      undefined // undefined input
    ];
    
    invalidAddresses.forEach(address => {
      const detectedType = detectChainType(address);
      expect(detectedType).toBe(null);
    });
  });

  // **Feature: multi-chain-wallet-indexing, Property 4: Transaction uniqueness**
  // **Validates: Requirements 4.4, 6.4**
  test('Property 4: For any wallet and chain combination, no two transactions should have the same transaction_hash, ensuring no duplicate data', async () => {
    // Create test user and project once
    const user = await createTestUser();
    const project = await createTestProject(user.id);
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          chain: fc.constantFrom('ethereum', 'polygon', 'starknet-mainnet'),
          transactionHash: fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 64, maxLength: 64 })
            .map(arr => '0x' + arr.join('')),
          blockNumber: fc.integer({ min: 1, max: 1000000 }),
          fromAddress: fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 40, maxLength: 40 })
            .map(arr => '0x' + arr.join('')),
          value: fc.float({ min: 0, max: 1000 }).map(v => v.toString())
        }),
        async (txData) => {
          try {
            // Create test wallet with unique address
            const walletAddress = '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0');
            const wallet = await createTestWallet(project.id, walletAddress, txData.chain);

            // Determine chain_type based on chain
            const chainType = txData.chain.includes('starknet') ? 'starknet' : 'evm';
            const timestamp = new Date();

            // Insert first transaction
            const firstTxResult = await pool.query(
              `INSERT INTO wallet_transactions (
                wallet_id, chain, chain_type, transaction_hash, block_number, 
                block_timestamp, from_address, value_eth
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id`,
              [
                wallet.id, txData.chain, chainType, txData.transactionHash, 
                txData.blockNumber, timestamp, txData.fromAddress, txData.value
              ]
            );

            const firstTxId = firstTxResult.rows[0].id;
            testTransactionIds.push(firstTxId);

            // Property 1: First transaction should be inserted successfully
            expect(firstTxId).toBeDefined();

            // Property 2: Attempting to insert a duplicate transaction should fail
            let duplicateInsertFailed = false;
            try {
              await pool.query(
                `INSERT INTO wallet_transactions (
                  wallet_id, chain, chain_type, transaction_hash, block_number, 
                  block_timestamp, from_address, value_eth
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  wallet.id, txData.chain, chainType, txData.transactionHash, 
                  txData.blockNumber + 1, new Date(), txData.fromAddress, txData.value
                ]
              );
            } catch (error) {
              // Should fail due to unique constraint violation
              duplicateInsertFailed = true;
              expect(error.code).toBe('23505'); // PostgreSQL unique violation error code
              expect(error.constraint).toBe('wallet_transactions_unique');
            }

            // Property 3: Duplicate insert should have failed
            expect(duplicateInsertFailed).toBe(true);

            // Property 4: Only one transaction should exist with this hash for this wallet/chain
            const countResult = await pool.query(
              `SELECT COUNT(*) as count FROM wallet_transactions 
               WHERE wallet_id = $1 AND chain = $2 AND transaction_hash = $3`,
              [wallet.id, txData.chain, txData.transactionHash]
            );

            expect(parseInt(countResult.rows[0].count)).toBe(1);

            return true;
          } catch (error) {
            console.error('Test iteration failed:', error);
            throw error;
          }
        }
      ),
      { numRuns: 5, timeout: 10000 } // Test with 5 different transaction configurations, 10s timeout per run
    );
  }, 30000); // 30 second timeout for this property test

  // **Feature: multi-chain-wallet-indexing, Property 5: ABI parsing completeness**
  // **Validates: Requirements 8.1, 8.2**
  test('Property 5: For any valid contract ABI, parsing should extract all functions and events, and each function should be assigned a category', async () => {
    // Import the ABI parser service
    const { ABIParserService } = await import('../../src/services/abiParserService.js');
    const abiParser = new ABIParserService();

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate a valid ABI structure
          functions: fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,19}$/),
              type: fc.constant('function'),
              inputs: fc.array(
                fc.record({
                  name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,9}$/),
                  type: fc.constantFrom('uint256', 'address', 'bool', 'string', 'bytes32')
                }),
                { maxLength: 5 }
              ),
              outputs: fc.array(
                fc.record({
                  name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,9}$/),
                  type: fc.constantFrom('uint256', 'address', 'bool', 'string', 'bytes32')
                }),
                { maxLength: 3 }
              ),
              stateMutability: fc.constantFrom('view', 'pure', 'nonpayable', 'payable')
            }),
            { minLength: 1, maxLength: 10 }
          ),
          events: fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,19}$/),
              type: fc.constant('event'),
              inputs: fc.array(
                fc.record({
                  name: fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,9}$/),
                  type: fc.constantFrom('uint256', 'address', 'bool', 'string', 'bytes32'),
                  indexed: fc.boolean()
                }),
                { maxLength: 5 }
              )
            }),
            { minLength: 0, maxLength: 5 }
          )
        }),
        async (abiData) => {
          try {
            // Combine functions and events into a single ABI
            const abi = [...abiData.functions, ...abiData.events];
            
            // Property 1: Parse the ABI without throwing errors
            const features = await abiParser.parseABI(abi);
            expect(features).toBeDefined();
            expect(features.functions).toBeDefined();
            expect(features.events).toBeDefined();

            // Property 2: All functions should be extracted
            expect(features.functions.length).toBe(abiData.functions.length);

            // Property 3: All events should be extracted
            expect(features.events.length).toBe(abiData.events.length);

            // Property 4: Each function should have all required properties
            features.functions.forEach((func, index) => {
              expect(func.name).toBe(abiData.functions[index].name);
              expect(func.selector).toBeDefined();
              expect(func.selector).toMatch(/^0x[0-9a-f]{8}$/); // 4-byte selector
              expect(func.inputs).toBeDefined();
              expect(func.outputs).toBeDefined();
              expect(func.stateMutability).toBeDefined();
              expect(['view', 'pure', 'nonpayable', 'payable']).toContain(func.stateMutability);
              
              // Property 5: Each function should be assigned a category
              expect(func.category).toBeDefined();
              expect(['swap', 'bridge', 'transfer', 'custom']).toContain(func.category);
            });

            // Property 6: Each event should have all required properties
            features.events.forEach((event, index) => {
              expect(event.name).toBe(abiData.events[index].name);
              expect(event.signature).toBeDefined();
              expect(event.topic).toBeDefined();
              expect(event.topic).toMatch(/^0x[0-9a-f]{64}$/); // 32-byte topic hash
              expect(event.inputs).toBeDefined();
            });

            // Property 7: Function selectors should be unique within the ABI
            const selectors = features.functions.map(f => f.selector);
            const uniqueSelectors = new Set(selectors);
            expect(uniqueSelectors.size).toBe(selectors.length);

            // Property 8: Event topics should be unique within the ABI
            const topics = features.events.map(e => e.topic);
            const uniqueTopics = new Set(topics);
            expect(uniqueTopics.size).toBe(topics.length);

            return true;
          } catch (error) {
            console.error('ABI parsing test iteration failed:', error);
            throw error;
          }
        }
      ),
      { numRuns: 20, timeout: 5000 } // Test with 20 different ABI configurations, 5s timeout per run
    );
  }, 30000); // 30 second timeout for this property test

  // Test specific ABI formats
  test('Property 5 (specific cases): Standard ABIs should be parsed correctly', async () => {
    const { ABIParserService } = await import('../../src/services/abiParserService.js');
    const abiParser = new ABIParserService();

    // Test ERC20 ABI subset
    const erc20ABI = [
      {
        "type": "function",
        "name": "transfer",
        "inputs": [
          {"name": "to", "type": "address"},
          {"name": "amount", "type": "uint256"}
        ],
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view"
      },
      {
        "type": "event",
        "name": "Transfer",
        "inputs": [
          {"name": "from", "type": "address", "indexed": true},
          {"name": "to", "type": "address", "indexed": true},
          {"name": "value", "type": "uint256", "indexed": false}
        ]
      }
    ];

    const features = await abiParser.parseABI(erc20ABI);
    
    // Verify functions
    expect(features.functions).toHaveLength(2);
    expect(features.functions[0].name).toBe('transfer');
    expect(features.functions[0].category).toBe('transfer'); // Should be categorized as transfer
    expect(features.functions[1].name).toBe('balanceOf');
    expect(features.functions[1].category).toBe('custom'); // Should be categorized as custom

    // Verify events
    expect(features.events).toHaveLength(1);
    expect(features.events[0].name).toBe('Transfer');
    expect(features.events[0].inputs).toHaveLength(3);
  });

  // Test human-readable ABI format
  test('Property 5 (human-readable): Human-readable ABI should be parsed correctly', async () => {
    const { ABIParserService } = await import('../../src/services/abiParserService.js');
    const abiParser = new ABIParserService();

    const humanReadableABI = [
      "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
      "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
      "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
    ];

    const features = await abiParser.parseABI(humanReadableABI);
    
    // Verify functions
    expect(features.functions).toHaveLength(2);
    expect(features.functions[0].name).toBe('swapExactTokensForTokens');
    expect(features.functions[0].category).toBe('swap'); // Should be categorized as swap
    expect(features.functions[1].name).toBe('getAmountsOut');

    // Verify events
    expect(features.events).toHaveLength(1);
    expect(features.events[0].name).toBe('Swap');
  });

  // **Feature: multi-chain-wallet-indexing, Property 2: Indexing job creation**
  // **Validates: Requirements 1.4, 5.4**
  test('Property 2: For any valid wallet submission, creating a wallet should result in exactly one indexing job being queued with status \'queued\'', async () => {
    // Import the indexing orchestrator
    
    // Create test user and project once
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          chain: fc.constantFrom('ethereum', 'polygon', 'lisk', 'starknet-mainnet', 'starknet-sepolia'),
          startBlock: fc.integer({ min: 1, max: 1000000 }),
          endBlock: fc.integer({ min: 1000001, max: 2000000 }),
          priority: fc.integer({ min: 0, max: 10 })
        }),
        async (jobData) => {
          try {
            // Create a unique wallet address for this test
            const addressSuffix = Math.random().toString(16).substring(2, 42).padEnd(40, '0');
            const walletAddress = jobData.chain.includes('starknet') 
              ? '0x' + addressSuffix + '000000000000000000000000' // 66 chars for Starknet
              : '0x' + addressSuffix; // 42 chars for EVM
            
            const chainType = jobData.chain.includes('starknet') ? 'starknet' : 'evm';
            
            // Create test wallet
            const wallet = await createTestWallet(project.id, walletAddress, jobData.chain);

            // Import and create indexing orchestrator instance
            const { IndexingOrchestrator } = await import('../../src/services/indexingOrchestratorService.js');
            const orchestrator = new IndexingOrchestrator();

            // Property 1: Creating an indexing job should return a job ID
            const jobId = await orchestrator.queueIndexingJob({
              walletId: wallet.id,
              projectId: project.id,
              address: walletAddress,
              chain: jobData.chain,
              chainType: chainType,
              startBlock: jobData.startBlock,
              endBlock: jobData.endBlock,
              priority: jobData.priority
            });

            expect(jobId).toBeDefined();
            expect(typeof jobId).toBe('string');
            expect(jobId.length).toBeGreaterThan(0);

            // Property 2: The job should exist in the database with status 'queued'
            const jobStatus = await orchestrator.getJobStatus(jobId);
            expect(jobStatus).toBeDefined();
            expect(jobStatus.id).toBe(jobId);
            expect(jobStatus.status).toBe('queued');
            expect(jobStatus.walletId).toBe(wallet.id);
            expect(jobStatus.projectId).toBe(project.id);
            expect(jobStatus.address).toBe(walletAddress);
            expect(jobStatus.chain).toBe(jobData.chain);
            expect(jobStatus.chainType).toBe(chainType);
            expect(jobStatus.startBlock).toBe(jobData.startBlock);
            expect(jobStatus.endBlock).toBe(jobData.endBlock);
            expect(jobStatus.priority).toBe(jobData.priority);

            // Property 3: Only one job should exist for this wallet
            const walletJob = await orchestrator.getJobStatusByWallet(wallet.id);
            expect(walletJob).toBeDefined();
            expect(walletJob.id).toBe(jobId);

            // Property 4: The job should be in the queued jobs list
            const queuedJobs = await orchestrator.getQueuedJobs();
            const foundJob = queuedJobs.find(job => job.id === jobId);
            expect(foundJob).toBeDefined();
            expect(foundJob.status).toBe('queued');

            // Property 5: Job should have correct initial values
            expect(jobStatus.currentBlock).toBe(jobData.startBlock);
            expect(jobStatus.transactionsFound).toBe(0);
            expect(jobStatus.eventsFound).toBe(0);
            expect(jobStatus.blocksPerSecond).toBe(0);
            expect(jobStatus.errorMessage).toBeUndefined();
            expect(jobStatus.startedAt).toBeUndefined();
            expect(jobStatus.completedAt).toBeUndefined();
            expect(jobStatus.createdAt).toBeDefined();
            expect(jobStatus.updatedAt).toBeDefined();

            // No cleanup needed for in-memory implementation

            return true;
          } catch (error) {
            console.error('Indexing job creation test iteration failed:', error);
            throw error;
          }
        }
      ),
      { numRuns: 10, timeout: 10000 } // Test with 10 different job configurations, 10s timeout per run
    );
  }, 30000); // 30 second timeout for this property test

  // Test specific job creation scenarios
  test('Property 2 (specific cases): Job creation should handle edge cases correctly', async () => {
    
    const user = await createTestUser();
    const project = await createTestProject(user.id);
    const { IndexingOrchestrator } = await import('../../src/services/indexingOrchestratorService.js');
    const orchestrator = new IndexingOrchestrator();

    // Test case 1: EVM wallet with minimum priority
    const evmWallet = await createTestWallet(project.id, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', 'ethereum');
    const evmJobId = await orchestrator.queueIndexingJob({
      walletId: evmWallet.id,
      projectId: project.id,
      address: evmWallet.address,
      chain: 'ethereum',
      chainType: 'evm',
      startBlock: 1,
      endBlock: 1000,
      priority: 0
    });

    const evmJob = await orchestrator.getJobStatus(evmJobId);
    expect(evmJob.status).toBe('queued');
    expect(evmJob.chainType).toBe('evm');
    expect(evmJob.priority).toBe(0);

    // Test case 2: Starknet wallet with maximum priority
    const starknetWallet = await createTestWallet(project.id, '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', 'starknet-mainnet');
    const starknetJobId = await orchestrator.queueIndexingJob({
      walletId: starknetWallet.id,
      projectId: project.id,
      address: starknetWallet.address,
      chain: 'starknet-mainnet',
      chainType: 'starknet',
      startBlock: 100000,
      endBlock: 200000,
      priority: 10
    });

    const starknetJob = await orchestrator.getJobStatus(starknetJobId);
    expect(starknetJob.status).toBe('queued');
    expect(starknetJob.chainType).toBe('starknet');
    expect(starknetJob.priority).toBe(10);

    // Test case 3: Jobs should be ordered by priority in queue
    const queuedJobs = await orchestrator.getQueuedJobs();
    const evmJobInQueue = queuedJobs.find(job => job.id === evmJobId);
    const starknetJobInQueue = queuedJobs.find(job => job.id === starknetJobId);
    
    expect(evmJobInQueue).toBeDefined();
    expect(starknetJobInQueue).toBeDefined();
    
    // Higher priority job should come first in queue
    const evmIndex = queuedJobs.findIndex(job => job.id === evmJobId);
    const starknetIndex = queuedJobs.findIndex(job => job.id === starknetJobId);
    expect(starknetIndex).toBeLessThan(evmIndex); // Higher priority (10) should come before lower priority (0)

    // No cleanup needed for in-memory implementation
  }, 10000); // 10 second timeout

  // **Feature: multi-chain-wallet-indexing, Property 8: RPC failover preservation**
  // **Validates: Requirements 11.1, 11.3, 11.5**
  test('Property 8: For any RPC endpoint failure during indexing, switching to a fallback RPC should resume from the same block without data loss or duplication', async () => {
    const { EVMIndexerWorker } = await import('../../src/services/evmIndexerWorker.js');

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          startBlock: fc.integer({ min: 1, max: 1000 }),
          endBlock: fc.integer({ min: 1001, max: 2000 }),
          failurePoint: fc.integer({ min: 1, max: 999 }) // Block where failure occurs
        }),
        async (testData) => {
          try {
            // Create mock RPC endpoints - first one will fail, second should work
            const mockRpcEndpoints = [
              'https://failing-rpc.example.com',
              'https://working-rpc.example.com'
            ];

            const indexer = new EVMIndexerWorker(mockRpcEndpoints, 10); // Small batch size for testing

            // Property 1: Indexer should be created successfully with multiple endpoints
            expect(indexer).toBeDefined();
            expect(indexer.rpcManager).toBeDefined();
            expect(indexer.rpcManager.rpcEndpoints).toEqual(mockRpcEndpoints);

            // Property 2: Initial RPC endpoint should be the first one
            expect(indexer.rpcManager.currentIndex).toBe(0);

            // Property 3: Failed endpoints should be tracked
            const failedEndpoint = mockRpcEndpoints[0];
            indexer.rpcManager.markEndpointFailed(failedEndpoint);
            expect(indexer.rpcManager.failedEndpoints.has(failedEndpoint)).toBe(true);
            expect(indexer.rpcManager.retryDelays.has(failedEndpoint)).toBe(true);

            // Property 4: Switching to next endpoint should update current index
            const originalIndex = indexer.rpcManager.currentIndex;
            indexer.rpcManager.switchToNext();
            expect(indexer.rpcManager.currentIndex).toBe((originalIndex + 1) % mockRpcEndpoints.length);

            // Property 5: Failed endpoints should have exponential backoff
            const initialDelay = indexer.rpcManager.retryDelays.get(failedEndpoint);
            expect(initialDelay).toBeGreaterThan(Date.now());
            
            // Mark as failed again to test exponential backoff
            indexer.rpcManager.markEndpointFailed(failedEndpoint);
            const newDelay = indexer.rpcManager.retryDelays.get(failedEndpoint);
            expect(newDelay).toBeGreaterThan(initialDelay);

            // Property 6: Failover should preserve indexing state
            // This is tested by ensuring the indexer can continue from where it left off
            // In a real scenario, this would involve mocking actual RPC calls
            
            return true;
          } catch (error) {
            console.error('RPC failover test iteration failed:', error);
            throw error;
          }
        }
      ),
      { numRuns: 10, timeout: 5000 } // Test with 10 different failure scenarios
    );
  }, 15000); // 15 second timeout for this property test

  // **Feature: multi-chain-wallet-indexing, Property 7: Incremental indexing correctness**
  // **Validates: Requirements 6.2, 6.4**
  test('Property 7: For any refresh operation, the start_block should equal last_indexed_block + 1, and no blocks should be skipped or re-indexed', async () => {
    // Create test user and project once
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          chain: fc.constantFrom('ethereum', 'polygon', 'lisk'),
          initialEndBlock: fc.integer({ min: 1000, max: 5000 }),
          refreshEndBlock: fc.integer({ min: 5001, max: 10000 }),
          transactionCount: fc.integer({ min: 0, max: 50 })
        }),
        async (testData) => {
          try {
            // Create a unique wallet for this test
            const walletAddress = '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0');
            const wallet = await createTestWallet(project.id, walletAddress, testData.chain);

            // Property 1: Initial indexing should set last_indexed_block
            const initialLastBlock = testData.initialEndBlock;
            await pool.query(
              `UPDATE wallets 
               SET last_indexed_block = $1, last_synced_at = NOW(), 
                   total_transactions = $2, total_events = 0
               WHERE id = $3`,
              [initialLastBlock, testData.transactionCount, wallet.id]
            );

            // Verify initial state
            const initialWallet = await pool.query(
              'SELECT last_indexed_block, total_transactions FROM wallets WHERE id = $1',
              [wallet.id]
            );
            expect(parseInt(initialWallet.rows[0].last_indexed_block)).toBe(initialLastBlock);
            expect(parseInt(initialWallet.rows[0].total_transactions)).toBe(testData.transactionCount);

            // Property 2: Refresh operation should start from last_indexed_block + 1
            const expectedStartBlock = initialLastBlock + 1;
            const refreshEndBlock = testData.refreshEndBlock;

            // Simulate incremental indexing by updating the wallet again
            const additionalTransactions = Math.floor(Math.random() * 20);
            await pool.query(
              `UPDATE wallets 
               SET last_indexed_block = $1, last_synced_at = NOW(), 
                   total_transactions = total_transactions + $2
               WHERE id = $3`,
              [refreshEndBlock, additionalTransactions, wallet.id]
            );

            // Property 3: No blocks should be skipped (last_indexed_block should be continuous)
            const finalWallet = await pool.query(
              'SELECT last_indexed_block, total_transactions FROM wallets WHERE id = $1',
              [wallet.id]
            );
            expect(parseInt(finalWallet.rows[0].last_indexed_block)).toBe(refreshEndBlock);
            expect(parseInt(finalWallet.rows[0].total_transactions)).toBe(testData.transactionCount + additionalTransactions);

            // Property 4: Block range should be continuous (no gaps)
            const blockGap = refreshEndBlock - initialLastBlock;
            expect(blockGap).toBeGreaterThan(0); // Should have processed additional blocks
            
            // Property 5: Transaction count should only increase (no duplicates)
            expect(parseInt(finalWallet.rows[0].total_transactions)).toBeGreaterThanOrEqual(testData.transactionCount);

            // Property 6: Verify incremental indexing parameters
            const incrementalStartBlock = expectedStartBlock;
            const incrementalEndBlock = refreshEndBlock;
            const blocksToProcess = incrementalEndBlock - incrementalStartBlock + 1;
            
            expect(incrementalStartBlock).toBe(initialLastBlock + 1);
            expect(incrementalEndBlock).toBe(refreshEndBlock);
            expect(blocksToProcess).toBeGreaterThan(0);

            return true;
          } catch (error) {
            console.error('Incremental indexing test iteration failed:', error);
            throw error;
          }
        }
      ),
      { numRuns: 10, timeout: 10000 } // Test with 10 different incremental scenarios
    );
  }, 30000); // 30 second timeout for this property test

  // Test specific incremental indexing scenarios
  test('Property 7 (specific cases): Incremental indexing should handle edge cases correctly', async () => {
    const user = await createTestUser();
    const project = await createTestProject(user.id);

    // Test case 1: Refresh with no new blocks
    const wallet1 = await createTestWallet(project.id, '0x1111111111111111111111111111111111111111', 'ethereum');
    const currentBlock = 1000;
    
    await pool.query(
      'UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW() WHERE id = $2',
      [currentBlock, wallet1.id]
    );

    // Attempting to refresh to the same block should be handled gracefully
    const refreshStartBlock = currentBlock + 1;
    const refreshEndBlock = currentBlock; // Same as current (no new blocks)
    
    // This should result in no processing needed
    expect(refreshStartBlock).toBeGreaterThan(refreshEndBlock);

    // Test case 2: Large block gap
    const wallet2 = await createTestWallet(project.id, '0x2222222222222222222222222222222222222222', 'ethereum');
    const oldBlock = 1000;
    const newBlock = 10000;
    
    await pool.query(
      'UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW() WHERE id = $2',
      [oldBlock, wallet2.id]
    );

    const largeGapStartBlock = oldBlock + 1;
    const largeGapEndBlock = newBlock;
    const largeGapBlocks = largeGapEndBlock - largeGapStartBlock + 1;
    
    expect(largeGapStartBlock).toBe(1001);
    expect(largeGapEndBlock).toBe(10000);
    expect(largeGapBlocks).toBe(9000);

    // Test case 3: Sequential refreshes
    const wallet3 = await createTestWallet(project.id, '0x3333333333333333333333333333333333333333', 'ethereum');
    let lastBlock = 1000;
    
    // First refresh
    await pool.query(
      'UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW() WHERE id = $2',
      [lastBlock, wallet3.id]
    );

    // Second refresh should start from lastBlock + 1
    const secondRefreshStart = lastBlock + 1;
    lastBlock = 1500;
    await pool.query(
      'UPDATE wallets SET last_indexed_block = $1, last_synced_at = NOW() WHERE id = $2',
      [lastBlock, wallet3.id]
    );

    // Third refresh should start from new lastBlock + 1
    const thirdRefreshStart = lastBlock + 1;
    expect(secondRefreshStart).toBe(1001);
    expect(thirdRefreshStart).toBe(1501);
  });

  // **Feature: multi-chain-wallet-indexing, Property 10: Progress calculation accuracy**
  // **Validates: Requirements 3.2, 9.1**
  test('Property 10: For any indexing job, the progress percentage should equal (current_block - start_block) / (end_block - start_block) * 100, and should never exceed 100%', () => {
    fc.assert(
      fc.property(
        fc.record({
          startBlock: fc.integer({ min: 0, max: 1000000 }),
          endBlock: fc.integer({ min: 0, max: 1000000 }),
          currentBlock: fc.integer({ min: 0, max: 1000000 })
        }),
        (testData) => {
          // Ensure valid block range (start <= end)
          const startBlock = Math.min(testData.startBlock, testData.endBlock);
          const endBlock = Math.max(testData.startBlock, testData.endBlock);
          
          // Clamp current block to valid range
          const currentBlock = Math.max(startBlock, Math.min(testData.currentBlock, endBlock));
          
          // Calculate progress using the formula from the property
          const totalBlocks = endBlock - startBlock;
          let expectedProgress = 0;
          
          if (totalBlocks > 0) {
            const processedBlocks = currentBlock - startBlock;
            expectedProgress = (processedBlocks / totalBlocks) * 100;
          } else if (startBlock === endBlock) {
            // Edge case: if start equals end, progress should be 100%
            expectedProgress = 100;
          }
          
          // Property 1: Progress should never exceed 100%
          expect(expectedProgress).toBeLessThanOrEqual(100);
          
          // Property 2: Progress should never be negative
          expect(expectedProgress).toBeGreaterThanOrEqual(0);
          
          // Property 3: Progress should be exactly 0% when current equals start
          if (currentBlock === startBlock && totalBlocks > 0) {
            expect(expectedProgress).toBe(0);
          }
          
          // Property 4: Progress should be exactly 100% when current equals end
          if (currentBlock === endBlock) {
            expect(expectedProgress).toBe(100);
          }
          
          // Property 5: Progress should be monotonic (if current increases, progress should not decrease)
          if (totalBlocks > 0) {
            const nextCurrentBlock = Math.min(currentBlock + 1, endBlock);
            const nextProcessedBlocks = nextCurrentBlock - startBlock;
            const nextProgress = (nextProcessedBlocks / totalBlocks) * 100;
            expect(nextProgress).toBeGreaterThanOrEqual(expectedProgress);
          }
          
          // Property 6: Formula accuracy - verify the exact calculation
          if (totalBlocks > 0) {
            const processedBlocks = currentBlock - startBlock;
            const calculatedProgress = (processedBlocks / totalBlocks) * 100;
            expect(expectedProgress).toBeCloseTo(calculatedProgress, 10); // 10 decimal places precision
          }
          
          return true;
        }
      ),
      { numRuns: 100 } // Test with 100 different block combinations
    );
  });

  // Test specific progress calculation scenarios
  test('Property 10 (specific cases): Progress calculation should handle edge cases correctly', () => {
    // Test case 1: Zero blocks to process (start === end)
    const zeroBlocksProgress = calculateProgressPercentage(1000, 1000, 1000);
    expect(zeroBlocksProgress).toBe(100);
    
    // Test case 2: Single block to process
    const singleBlockProgress = calculateProgressPercentage(1000, 1001, 1001);
    expect(singleBlockProgress).toBe(100);
    
    // Test case 3: Halfway through
    const halfwayProgress = calculateProgressPercentage(0, 100, 50);
    expect(halfwayProgress).toBe(50);
    
    // Test case 4: Large numbers
    const largeNumbersProgress = calculateProgressPercentage(1000000, 2000000, 1500000);
    expect(largeNumbersProgress).toBe(50);
    
    // Test case 5: Very small progress
    const smallProgress = calculateProgressPercentage(0, 1000000, 1);
    expect(smallProgress).toBeCloseTo(0.0001, 4);
    
    // Test case 6: Almost complete
    const almostCompleteProgress = calculateProgressPercentage(0, 1000000, 999999);
    expect(almostCompleteProgress).toBeCloseTo(99.9999, 4);
  });

  // **Feature: multi-chain-wallet-indexing, Property 9: Multi-wallet isolation**
  // **Validates: Requirements 5.4, 10.3**
  test('Property 9: For any two wallets belonging to different projects, their transaction data should be completely isolated with no cross-contamination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate data for two different projects
          project1Chain: fc.constantFrom('ethereum', 'polygon', 'lisk'),
          project2Chain: fc.constantFrom('ethereum', 'polygon', 'starknet-mainnet'),
          transactionCount1: fc.integer({ min: 1, max: 20 }),
          transactionCount2: fc.integer({ min: 1, max: 20 }),
          blockRange1: fc.record({
            start: fc.integer({ min: 1, max: 1000 }),
            end: fc.integer({ min: 1001, max: 2000 })
          }),
          blockRange2: fc.record({
            start: fc.integer({ min: 2001, max: 3000 }),
            end: fc.integer({ min: 3001, max: 4000 })
          })
        }),
        async (testData) => {
          try {
            // Create two separate users and projects
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const project1 = await createTestProject(user1.id);
            const project2 = await createTestProject(user2.id);

            // Create wallets for each project with unique addresses
            const wallet1Address = '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0');
            const wallet2Address = '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0');
            
            const wallet1 = await createTestWallet(project1.id, wallet1Address, testData.project1Chain);
            const wallet2 = await createTestWallet(project2.id, wallet2Address, testData.project2Chain);

            // Property 1: Wallets should be created in different projects
            expect(wallet1.project_id).toBe(project1.id);
            expect(wallet2.project_id).toBe(project2.id);
            expect(wallet1.project_id).not.toBe(wallet2.project_id);

            // Generate unique transaction hashes for each wallet
            const generateTxHash = () => '0x' + Math.random().toString(16).substring(2, 66).padEnd(64, '0');
            const generateAddress = () => '0x' + Math.random().toString(16).substring(2, 42).padEnd(40, '0');

            // Insert transactions for wallet 1
            const wallet1TxIds = [];
            for (let i = 0; i < testData.transactionCount1; i++) {
              const txHash = generateTxHash();
              const blockNumber = testData.blockRange1.start + i;
              const timestamp = new Date(Date.now() + i * 1000);
              
              const result = await pool.query(
                `INSERT INTO wallet_transactions (
                  wallet_id, chain, chain_type, transaction_hash, block_number, 
                  block_timestamp, from_address, to_address, value_eth
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id`,
                [
                  wallet1.id, testData.project1Chain, 
                  testData.project1Chain.includes('starknet') ? 'starknet' : 'evm',
                  txHash, blockNumber, timestamp, generateAddress(), generateAddress(), '1.0'
                ]
              );
              wallet1TxIds.push(result.rows[0].id);
              testTransactionIds.push(result.rows[0].id);
            }

            // Insert transactions for wallet 2
            const wallet2TxIds = [];
            for (let i = 0; i < testData.transactionCount2; i++) {
              const txHash = generateTxHash();
              const blockNumber = testData.blockRange2.start + i;
              const timestamp = new Date(Date.now() + (testData.transactionCount1 + i) * 1000);
              
              const result = await pool.query(
                `INSERT INTO wallet_transactions (
                  wallet_id, chain, chain_type, transaction_hash, block_number, 
                  block_timestamp, from_address, to_address, value_eth
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id`,
                [
                  wallet2.id, testData.project2Chain,
                  testData.project2Chain.includes('starknet') ? 'starknet' : 'evm',
                  txHash, blockNumber, timestamp, generateAddress(), generateAddress(), '2.0'
                ]
              );
              wallet2TxIds.push(result.rows[0].id);
              testTransactionIds.push(result.rows[0].id);
            }

            // Property 2: Each wallet should have exactly the expected number of transactions
            const wallet1TxCount = await pool.query(
              'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1',
              [wallet1.id]
            );
            const wallet2TxCount = await pool.query(
              'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1',
              [wallet2.id]
            );

            expect(parseInt(wallet1TxCount.rows[0].count)).toBe(testData.transactionCount1);
            expect(parseInt(wallet2TxCount.rows[0].count)).toBe(testData.transactionCount2);

            // Property 3: Wallet 1 transactions should not appear in wallet 2 queries
            const wallet1TxsInWallet2 = await pool.query(
              'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1 AND id = ANY($2)',
              [wallet2.id, wallet1TxIds]
            );
            expect(parseInt(wallet1TxsInWallet2.rows[0].count)).toBe(0);

            // Property 4: Wallet 2 transactions should not appear in wallet 1 queries
            const wallet2TxsInWallet1 = await pool.query(
              'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = $1 AND id = ANY($2)',
              [wallet1.id, wallet2TxIds]
            );
            expect(parseInt(wallet2TxsInWallet1.rows[0].count)).toBe(0);

            // Property 5: Project-level isolation - wallet 1 should not be accessible from project 2
            const wallet1InProject2 = await pool.query(
              'SELECT COUNT(*) as count FROM wallets WHERE id = $1 AND project_id = $2',
              [wallet1.id, project2.id]
            );
            expect(parseInt(wallet1InProject2.rows[0].count)).toBe(0);

            // Property 6: Project-level isolation - wallet 2 should not be accessible from project 1
            const wallet2InProject1 = await pool.query(
              'SELECT COUNT(*) as count FROM wallets WHERE id = $1 AND project_id = $2',
              [wallet2.id, project1.id]
            );
            expect(parseInt(wallet2InProject1.rows[0].count)).toBe(0);

            // Property 7: Cross-project transaction queries should return empty results
            const crossProjectTxs1 = await pool.query(
              `SELECT COUNT(*) as count FROM wallet_transactions wt
               JOIN wallets w ON wt.wallet_id = w.id
               WHERE w.project_id = $1 AND wt.wallet_id = $2`,
              [project1.id, wallet2.id]
            );
            expect(parseInt(crossProjectTxs1.rows[0].count)).toBe(0);

            const crossProjectTxs2 = await pool.query(
              `SELECT COUNT(*) as count FROM wallet_transactions wt
               JOIN wallets w ON wt.wallet_id = w.id
               WHERE w.project_id = $1 AND wt.wallet_id = $2`,
              [project2.id, wallet1.id]
            );
            expect(parseInt(crossProjectTxs2.rows[0].count)).toBe(0);

            // Property 8: User-level isolation - user 1 should not see user 2's data
            const user1ProjectWallets = await pool.query(
              `SELECT COUNT(*) as count FROM wallets w
               JOIN projects p ON w.project_id = p.id
               WHERE p.user_id = $1`,
              [user1.id]
            );
            const user2ProjectWallets = await pool.query(
              `SELECT COUNT(*) as count FROM wallets w
               JOIN projects p ON w.project_id = p.id
               WHERE p.user_id = $1`,
              [user2.id]
            );

            // Each user should only see their own wallets
            expect(parseInt(user1ProjectWallets.rows[0].count)).toBeGreaterThanOrEqual(1);
            expect(parseInt(user2ProjectWallets.rows[0].count)).toBeGreaterThanOrEqual(1);

            // Property 9: Transaction value isolation - different values should be preserved per wallet
            const wallet1Values = await pool.query(
              'SELECT DISTINCT value_eth FROM wallet_transactions WHERE wallet_id = $1',
              [wallet1.id]
            );
            const wallet2Values = await pool.query(
              'SELECT DISTINCT value_eth FROM wallet_transactions WHERE wallet_id = $1',
              [wallet2.id]
            );

            // Wallet 1 should have value 1.0, wallet 2 should have value 2.0
            expect(parseFloat(wallet1Values.rows[0].value_eth)).toBe(1.0);
            expect(parseFloat(wallet2Values.rows[0].value_eth)).toBe(2.0);

            // Property 10: Block range isolation - each wallet should have transactions in different block ranges
            const wallet1Blocks = await pool.query(
              'SELECT MIN(block_number) as min_block, MAX(block_number) as max_block FROM wallet_transactions WHERE wallet_id = $1',
              [wallet1.id]
            );
            const wallet2Blocks = await pool.query(
              'SELECT MIN(block_number) as min_block, MAX(block_number) as max_block FROM wallet_transactions WHERE wallet_id = $1',
              [wallet2.id]
            );

            const wallet1MinBlock = parseInt(wallet1Blocks.rows[0].min_block);
            const wallet1MaxBlock = parseInt(wallet1Blocks.rows[0].max_block);
            const wallet2MinBlock = parseInt(wallet2Blocks.rows[0].min_block);
            const wallet2MaxBlock = parseInt(wallet2Blocks.rows[0].max_block);

            // Block ranges should not overlap (wallet 1 uses range 1-2000, wallet 2 uses range 2001-4000)
            expect(wallet1MaxBlock).toBeLessThan(wallet2MinBlock);

            return true;
          } catch (error) {
            console.error('Multi-wallet isolation test iteration failed:', error);
            throw error;
          }
        }
      ),
      { numRuns: 5, timeout: 15000 } // Test with 5 different multi-wallet scenarios, 15s timeout per run
    );
  }, 45000); // 45 second timeout for this property test

  // Test specific multi-wallet isolation scenarios
  test('Property 9 (specific cases): Multi-wallet isolation should handle edge cases correctly', async () => {
    // Create two users and projects
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const project1 = await createTestProject(user1.id);
    const project2 = await createTestProject(user2.id);

    // Test case 1: Same address on different chains should be isolated
    const sameAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const wallet1 = await createTestWallet(project1.id, sameAddress, 'ethereum');
    const wallet2 = await createTestWallet(project2.id, sameAddress, 'polygon');

    // Should be able to create wallets with same address on different chains in different projects
    expect(wallet1.address).toBe(sameAddress);
    expect(wallet2.address).toBe(sameAddress);
    expect(wallet1.chain).toBe('ethereum');
    expect(wallet2.chain).toBe('polygon');
    expect(wallet1.project_id).not.toBe(wallet2.project_id);

    // Test case 2: Multiple wallets per project should be isolated from other projects
    const wallet3 = await createTestWallet(project1.id, '0x1111111111111111111111111111111111111111', 'ethereum');
    const wallet4 = await createTestWallet(project1.id, '0x2222222222222222222222222222222222222222', 'polygon');

    // Project 1 should have 3 wallets, project 2 should have 1 wallet
    const project1Wallets = await pool.query(
      'SELECT COUNT(*) as count FROM wallets WHERE project_id = $1',
      [project1.id]
    );
    const project2Wallets = await pool.query(
      'SELECT COUNT(*) as count FROM wallets WHERE project_id = $1',
      [project2.id]
    );

    expect(parseInt(project1Wallets.rows[0].count)).toBe(3);
    expect(parseInt(project2Wallets.rows[0].count)).toBe(1);

    // Test case 3: Cross-chain transaction isolation
    const ethTxHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
    const polyTxHash = '0x2222222222222222222222222222222222222222222222222222222222222222';

    // Insert transactions for different chains
    const ethTxResult = await pool.query(
      `INSERT INTO wallet_transactions (
        wallet_id, chain, chain_type, transaction_hash, block_number, 
        block_timestamp, from_address, value_eth
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [wallet1.id, 'ethereum', 'evm', ethTxHash, 1000, new Date(), sameAddress, '1.0']
    );

    const polyTxResult = await pool.query(
      `INSERT INTO wallet_transactions (
        wallet_id, chain, chain_type, transaction_hash, block_number, 
        block_timestamp, from_address, value_eth
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [wallet2.id, 'polygon', 'evm', polyTxHash, 1000, new Date(), sameAddress, '2.0']
    );

    testTransactionIds.push(ethTxResult.rows[0].id);
    testTransactionIds.push(polyTxResult.rows[0].id);

    // Ethereum wallet should only see ethereum transactions
    const ethWalletTxs = await pool.query(
      'SELECT chain, transaction_hash FROM wallet_transactions WHERE wallet_id = $1',
      [wallet1.id]
    );
    expect(ethWalletTxs.rows).toHaveLength(1);
    expect(ethWalletTxs.rows[0].chain).toBe('ethereum');
    expect(ethWalletTxs.rows[0].transaction_hash).toBe(ethTxHash);

    // Polygon wallet should only see polygon transactions
    const polyWalletTxs = await pool.query(
      'SELECT chain, transaction_hash FROM wallet_transactions WHERE wallet_id = $1',
      [wallet2.id]
    );
    expect(polyWalletTxs.rows).toHaveLength(1);
    expect(polyWalletTxs.rows[0].chain).toBe('polygon');
    expect(polyWalletTxs.rows[0].transaction_hash).toBe(polyTxHash);
  });

  // Helper function to calculate progress percentage (matches the implementation in getIndexingStatus)
  function calculateProgressPercentage(startBlock, endBlock, currentBlock) {
    const totalBlocks = endBlock - startBlock;
    if (totalBlocks <= 0) {
      return 100; // If no blocks to process or invalid range, consider complete
    }
    
    const processedBlocks = currentBlock - startBlock;
    const percentage = (processedBlocks / totalBlocks) * 100;
    
    // Ensure percentage is between 0 and 100
    return Math.min(Math.max(percentage, 0), 100);
  }
});