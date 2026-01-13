/**
 * Test setup and configuration
 */

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/starknet_rpc_query_test';
process.env.STARKNET_RPC_URL = 'https://starknet-testnet.public.blastapi.io';

// Global test utilities
global.beforeEach(() => {
  // Reset any global state before each test
});

global.afterEach(() => {
  // Clean up after each test
});

export {};