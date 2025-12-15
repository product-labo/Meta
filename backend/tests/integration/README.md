# End-to-End Integration Tests

This directory contains comprehensive end-to-end integration tests for the Boardling platform.

## Overview

The E2E tests validate complete user journeys across the entire system, ensuring that all components work together correctly. These tests cover:

1. **Registration → Onboarding → Analytics Flow**
   - User registration with password hashing
   - JWT authentication and session management
   - Complete onboarding with project and wallet creation
   - Analytics dashboard data retrieval across all endpoints

2. **Subscription Upgrade Flow**
   - Free trial initialization
   - Subscription status checking
   - Invoice creation for premium upgrades
   - Payment detection and subscription activation
   - Feature access control based on subscription status

3. **Data Monetization Flow**
   - Privacy mode configuration (private/public/monetizable)
   - Data access invoice creation
   - Payment splitting (70% owner, 30% platform)
   - Balance updates for data owners
   - Access control for monetizable data

4. **Withdrawal Flow**
   - Balance checking and validation
   - Zcash address validation
   - Withdrawal request creation
   - Fee calculation
   - Withdrawal history tracking

## Test Files

### Backend Tests
- **`e2e-flows.test.js`**: Complete backend E2E test suite using Jest and Axios
  - Tests all API endpoints in realistic user flows
  - Validates data persistence and state management
  - Checks authorization and privacy enforcement
  - Verifies error handling and validation

### Frontend Tests
- **`../../src/__tests__/integration/e2e-flows.test.tsx`**: Frontend E2E test suite using Vitest
  - Tests React components and state management
  - Validates service layer integration
  - Checks store synchronization
  - Verifies UI state consistency

## Running the Tests

### Prerequisites

1. **Backend server must be running:**
   ```bash
   cd backend
   npm start
   ```

2. **Database must be initialized:**
   ```bash
   cd backend
   npm run migrate
   ```

3. **Environment variables must be set:**
   ```bash
   export BASE_URL=http://localhost:3001
   export TEST_ENV=test
   ```

### Run All E2E Tests

Use the provided test runner script:

```bash
cd backend/tests
./run-e2e-tests.sh
```

This will run:
- Backend E2E tests (Jest)
- Frontend E2E tests (Vitest)
- Integration test script

### Run Individual Test Suites

**Backend tests only:**
```bash
cd backend
npx jest tests/integration/e2e-flows.test.js --verbose
```

**Frontend tests only:**
```bash
npm run test -- src/__tests__/integration/e2e-flows.test.tsx --run
```

**Integration script:**
```bash
cd backend/tests
node test-final-integration.js
```

## Test Structure

### Backend Test Structure

```javascript
describe('End-to-End Integration Tests', () => {
  describe('Flow 1: Registration → Onboarding → Analytics', () => {
    test('1.1: User registration creates account', async () => { ... });
    test('1.2: User login returns JWT token', async () => { ... });
    // ... more tests
  });
  
  describe('Flow 2: Subscription Upgrade', () => { ... });
  describe('Flow 3: Data Monetization', () => { ... });
  describe('Flow 4: Withdrawal', () => { ... });
  describe('Cross-Flow Integration', () => { ... });
});
```

### Frontend Test Structure

```typescript
describe('Frontend E2E Integration Tests', () => {
  describe('Flow 1: Registration → Onboarding → Analytics', () => {
    test('1.1: Complete registration flow', async () => { ... });
    // ... more tests
  });
  
  // Similar structure for other flows
});
```

## Test Data

The tests use realistic test data that mimics production scenarios:

- **Test Users**: Unique email addresses with timestamp to avoid conflicts
- **Test Projects**: DeFi category projects with complete metadata
- **Test Wallets**: All three Zcash address types (transparent, shielded, unified)
- **Test Invoices**: Realistic ZEC amounts for subscriptions and data access
- **Test Withdrawals**: Small amounts with proper fee calculations

## Assertions and Validations

Each test validates:

1. **HTTP Status Codes**: Correct response codes (200, 201, 400, 401, 403, 404)
2. **Response Structure**: Required fields present in responses
3. **Data Integrity**: Values match expected types and formats
4. **State Persistence**: Data persists across requests
5. **Authorization**: Users can only access their own data
6. **Privacy Enforcement**: Privacy modes are respected
7. **Error Handling**: Errors return structured responses

## Coverage

The E2E tests provide coverage for:

- ✅ All authentication endpoints
- ✅ All project management endpoints
- ✅ All wallet management endpoints
- ✅ All analytics endpoints
- ✅ All subscription endpoints
- ✅ All payment endpoints
- ✅ All withdrawal endpoints
- ✅ Privacy enforcement across all queries
- ✅ Authorization checks for all protected resources
- ✅ Error handling for all failure scenarios

## Continuous Integration

These tests should be run:

- ✅ Before merging pull requests
- ✅ After deploying to staging
- ✅ As part of nightly builds
- ✅ Before production releases

## Troubleshooting

### Server Not Running

```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solution**: Start the backend server:
```bash
cd backend && npm start
```

### Database Connection Errors

```
Error: Connection terminated unexpectedly
```

**Solution**: Check PostgreSQL is running and database exists:
```bash
psql -U postgres -c "SELECT 1"
```

### Test Timeouts

```
Error: Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution**: Increase Jest timeout in test file:
```javascript
jest.setTimeout(30000); // 30 seconds
```

### Authentication Failures

```
Error: 401 Unauthorized
```

**Solution**: Check JWT token generation and validation:
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Tests should clean up created resources (or use unique identifiers)
3. **Realistic Data**: Use realistic test data that mimics production scenarios
4. **Error Cases**: Test both success and failure paths
5. **Performance**: Keep tests fast by mocking external services when appropriate
6. **Documentation**: Document complex test scenarios and edge cases

## Related Documentation

- [Final Integration Test Guide](../FINAL_INTEGRATION_TEST_GUIDE.md)
- [Quick Start Integration Tests](../QUICK_START_INTEGRATION_TESTS.md)
- [Test Coverage Summary](../TEST_COVERAGE_SUMMARY.md)
- [Requirements Document](../../../.kiro/specs/fullstack-integration/requirements.md)
- [Design Document](../../../.kiro/specs/fullstack-integration/design.md)

## Task Reference

**Task 43.1**: Write end-to-end integration tests
- Test registration → onboarding → analytics flow ✅
- Test subscription upgrade flow ✅
- Test data monetization flow ✅
- Test withdrawal flow ✅
- Requirements: All ✅
