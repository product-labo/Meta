/**
 * Verify Error Handler Implementation
 * Tests that error handling middleware is properly configured
 */

import { errorHandlerMiddleware } from '../src/middleware/errorHandler.js';
import {
  CustomAPIError,
  UnauthenticatedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  PaymentRequiredError,
  ValidationError,
  SubscriptionExpiredError,
  BlockchainError,
  PrivacyRestrictedError,
  InsufficientBalanceError,
  RateLimitExceededError,
} from '../src/errors/index.js';

console.log('\n=== Verifying Error Handler Implementation ===\n');

// Mock request and response objects
const createMockReq = () => ({
  method: 'GET',
  originalUrl: '/test',
  ip: '127.0.0.1',
  user: { id: 'test-user-id' },
});

const createMockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

const mockNext = () => {};

// Suppress console output during tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;
console.error = () => {};
console.warn = () => {};
console.log = () => {};

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test 1: UnauthenticatedError
test('UnauthenticatedError returns 401 with AUTH_INVALID code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new UnauthenticatedError('Invalid credentials');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 401, `Expected status 401, got ${res.statusCode}`);
  assert(res.jsonData.error === 'AUTH_INVALID', `Expected error code AUTH_INVALID, got ${res.jsonData.error}`);
  assert(res.jsonData.message === 'Invalid credentials', `Expected message 'Invalid credentials', got ${res.jsonData.message}`);
  assert(res.jsonData.timestamp, 'Expected timestamp in response');
});

// Test 2: NotFoundError
test('NotFoundError returns 404 with NOT_FOUND code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new NotFoundError('Resource not found');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 404, `Expected status 404, got ${res.statusCode}`);
  assert(res.jsonData.error === 'NOT_FOUND', `Expected error code NOT_FOUND, got ${res.jsonData.error}`);
});

// Test 3: BadRequestError
test('BadRequestError returns 400 with BAD_REQUEST code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new BadRequestError('Invalid input');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 400, `Expected status 400, got ${res.statusCode}`);
  assert(res.jsonData.error === 'BAD_REQUEST', `Expected error code BAD_REQUEST, got ${res.jsonData.error}`);
});

// Test 4: ForbiddenError
test('ForbiddenError returns 403 with PERMISSION_DENIED code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new ForbiddenError('Access denied');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 403, `Expected status 403, got ${res.statusCode}`);
  assert(res.jsonData.error === 'PERMISSION_DENIED', `Expected error code PERMISSION_DENIED, got ${res.jsonData.error}`);
});

// Test 5: ConflictError
test('ConflictError returns 409 with ALREADY_EXISTS code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new ConflictError('Resource already exists');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 409, `Expected status 409, got ${res.statusCode}`);
  assert(res.jsonData.error === 'ALREADY_EXISTS', `Expected error code ALREADY_EXISTS, got ${res.jsonData.error}`);
});

// Test 6: PaymentRequiredError
test('PaymentRequiredError returns 402 with PAYMENT_REQUIRED code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new PaymentRequiredError('Payment required');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 402, `Expected status 402, got ${res.statusCode}`);
  assert(res.jsonData.error === 'PAYMENT_REQUIRED', `Expected error code PAYMENT_REQUIRED, got ${res.jsonData.error}`);
});

// Test 7: ValidationError with details
test('ValidationError returns 400 with details', () => {
  const req = createMockReq();
  const res = createMockRes();
  const details = [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too short' },
  ];
  const error = new ValidationError('Validation failed', details);
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 400, `Expected status 400, got ${res.statusCode}`);
  assert(res.jsonData.error === 'VALIDATION_ERROR', `Expected error code VALIDATION_ERROR, got ${res.jsonData.error}`);
  assert(res.jsonData.details, 'Expected details in response');
  assert(res.jsonData.details.length === 2, `Expected 2 detail items, got ${res.jsonData.details.length}`);
});

// Test 8: SubscriptionExpiredError
test('SubscriptionExpiredError returns 402 with SUBSCRIPTION_EXPIRED code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new SubscriptionExpiredError();
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 402, `Expected status 402, got ${res.statusCode}`);
  assert(res.jsonData.error === 'SUBSCRIPTION_EXPIRED', `Expected error code SUBSCRIPTION_EXPIRED, got ${res.jsonData.error}`);
});

// Test 9: BlockchainError
test('BlockchainError returns 503 with BLOCKCHAIN_ERROR code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new BlockchainError('Failed to connect to Zcash node');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 503, `Expected status 503, got ${res.statusCode}`);
  assert(res.jsonData.error === 'BLOCKCHAIN_ERROR', `Expected error code BLOCKCHAIN_ERROR, got ${res.jsonData.error}`);
});

// Test 10: PrivacyRestrictedError
test('PrivacyRestrictedError returns 403 with PRIVACY_RESTRICTED code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new PrivacyRestrictedError();
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 403, `Expected status 403, got ${res.statusCode}`);
  assert(res.jsonData.error === 'PRIVACY_RESTRICTED', `Expected error code PRIVACY_RESTRICTED, got ${res.jsonData.error}`);
});

// Test 11: InsufficientBalanceError
test('InsufficientBalanceError returns 400 with INSUFFICIENT_BALANCE code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new InsufficientBalanceError('Balance too low for withdrawal');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 400, `Expected status 400, got ${res.statusCode}`);
  assert(res.jsonData.error === 'INSUFFICIENT_BALANCE', `Expected error code INSUFFICIENT_BALANCE, got ${res.jsonData.error}`);
});

// Test 12: RateLimitExceededError
test('RateLimitExceededError returns 429 with RATE_LIMIT_EXCEEDED code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new RateLimitExceededError();
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 429, `Expected status 429, got ${res.statusCode}`);
  assert(res.jsonData.error === 'RATE_LIMIT_EXCEEDED', `Expected error code RATE_LIMIT_EXCEEDED, got ${res.jsonData.error}`);
});

// Test 13: JWT TokenExpiredError
test('JWT TokenExpiredError returns 401 with AUTH_EXPIRED code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new Error('jwt expired');
  error.name = 'TokenExpiredError';
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 401, `Expected status 401, got ${res.statusCode}`);
  assert(res.jsonData.error === 'AUTH_EXPIRED', `Expected error code AUTH_EXPIRED, got ${res.jsonData.error}`);
});

// Test 14: Database unique constraint violation
test('Database unique constraint violation returns 409 with ALREADY_EXISTS code', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new Error('duplicate key value');
  error.code = '23505';
  error.constraint = 'users_email_unique';
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 409, `Expected status 409, got ${res.statusCode}`);
  assert(res.jsonData.error === 'ALREADY_EXISTS', `Expected error code ALREADY_EXISTS, got ${res.jsonData.error}`);
});

// Test 15: Generic error returns 500 with errorId
test('Generic error returns 500 with INTERNAL_ERROR code and errorId', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new Error('Something went wrong');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.statusCode === 500, `Expected status 500, got ${res.statusCode}`);
  assert(res.jsonData.error === 'INTERNAL_ERROR', `Expected error code INTERNAL_ERROR, got ${res.jsonData.error}`);
  assert(res.jsonData.errorId, 'Expected errorId in response for server errors');
  assert(/^[a-f0-9]{16}$/.test(res.jsonData.errorId), `Expected errorId to be 16 hex chars, got ${res.jsonData.errorId}`);
});

// Test 16: Structured error response format
test('All errors return structured response with required fields', () => {
  const req = createMockReq();
  const res = createMockRes();
  const error = new NotFoundError('Not found');
  
  errorHandlerMiddleware(error, req, res, mockNext);
  
  assert(res.jsonData.error, 'Expected error code in response');
  assert(res.jsonData.message, 'Expected message in response');
  assert(res.jsonData.timestamp, 'Expected timestamp in response');
  assert(typeof res.jsonData.error === 'string', 'Expected error code to be string');
  assert(typeof res.jsonData.message === 'string', 'Expected message to be string');
  assert(new Date(res.jsonData.timestamp).toString() !== 'Invalid Date', 'Expected valid ISO timestamp');
});

// Restore console
console.error = originalError;
console.warn = originalWarn;
console.log = originalLog;

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✓ All error handler tests passed!\n');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed\n');
  process.exit(1);
}
