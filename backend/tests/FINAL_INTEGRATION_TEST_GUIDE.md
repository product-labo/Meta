# Final Integration Testing Guide

## Overview

This guide describes the comprehensive final integration testing for the Boardling fullstack application. These tests validate the complete system integration across all major user flows.

**Task**: Task 43 - Final integration testing  
**Requirements**: All requirements from the fullstack-integration spec

## Test Coverage

The final integration tests cover:

1. **User Registration Flow**
   - New user registration
   - Login with credentials
   - JWT token validation
   - Invalid credential rejection

2. **Complete Onboarding Flow**
   - Initial onboarding status check
   - Project and wallet creation in single transaction
   - Onboarding status verification
   - Duplicate onboarding prevention
   - Project and wallet persistence verification

3. **Analytics Dashboard with Real Data**
   - Multiple wallet creation
   - Dashboard metrics retrieval
   - Adoption funnel data
   - Retention cohorts
   - Productivity scores
   - Shielded transaction analytics
   - Wallet segmentation
   - Project health indicators

4. **Payment and Withdrawal Flows**
   - Subscription status checking
   - Invoice creation
   - Payment status checking
   - User balance retrieval
   - Withdrawal request creation
   - Withdrawal history

5. **Privacy Mode Enforcement**
   - Private wallet exclusion from public queries
   - Privacy mode updates
   - Immediate privacy enforcement
   - Monetizable data access
   - Cross-user access prevention

6. **Error Handling**
   - Structured error responses
   - Validation errors
   - Authentication errors

## Prerequisites

### 1. Database Setup

Ensure PostgreSQL is running and the database is initialized:

```bash
# Start PostgreSQL (if not running)
sudo systemctl start postgresql

# Create database (if not exists)
createdb boardling

# Run migrations
cd backend
npm run migrate
```

### 2. Environment Configuration

Create or verify `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/boardling

# Server
PORT=3001
NODE_ENV=test

# JWT
JWT_SECRET=your-test-jwt-secret

# API Keys
ADMIN_API_KEY=test-admin-key
```

### 3. Backend Server

Start the backend server:

```bash
cd backend
npm install
npm start
```

The server should be running on `http://localhost:3001`

### 4. Blockchain Indexer (Optional)

For full analytics testing, start the indexer:

```bash
cd backend/indexer
npm install
npm start
```

## Running the Tests

### Run All Integration Tests

```bash
# From project root
node backend/tests/test-final-integration.js

# Or from backend directory
cd backend
node tests/test-final-integration.js
```

### Run Individual Test Suites

You can also run the existing test suites separately:

```bash
# User registration and authentication
node backend/tests/test-auth-flows.js

# Onboarding flow
node backend/tests/test-onboarding-flow.js

# Complete payment flow
node backend/tests/test-complete-flow.js
```

## Test Output

### Success Output

When all tests pass, you'll see:

```
================================================================================
 TEST SUMMARY
================================================================================
ℹ️  Total Tests: 32
✅ Passed: 32
✅ Failed: 0
✅ Success Rate: 100.0%

🎉 ALL INTEGRATION TESTS PASSED! 🎉

✅ Complete System Verification:
  • User registration flow works correctly
  • Complete onboarding flow works correctly
  • Analytics dashboard with real data works correctly
  • Payment and withdrawal flows work correctly
  • Privacy mode enforcement works correctly
  • Error handling works correctly
```

### Failure Output

If tests fail, you'll see detailed error messages:

```
❌ Failed Tests:
❌   • Register new user: Registration failed: {"error":"..."}
❌   • Login with registered credentials: Login failed: {"error":"..."}
```

## Test Details

### Test 1: User Registration Flow (4 tests)

- **Register new user**: Creates a new user account
- **Login with registered credentials**: Authenticates the user
- **Verify JWT token is valid**: Validates token works for protected routes
- **Reject invalid credentials**: Ensures security

### Test 2: Complete Onboarding Flow (6 tests)

- **Check initial onboarding status**: Verifies new user has not completed onboarding
- **Complete onboarding with project and wallet**: Creates project and wallet in single transaction
- **Verify onboarding status after completion**: Confirms onboarding_completed flag is set
- **Prevent duplicate onboarding**: Ensures users can't onboard twice
- **Verify project was created**: Confirms project exists in database
- **Verify wallet was created**: Confirms wallet exists in database

### Test 3: Analytics Dashboard with Real Data (8 tests)

- **Add additional wallets for analytics**: Creates multiple wallets with different privacy modes
- **Get dashboard metrics**: Retrieves aggregated dashboard data
- **Get adoption funnel data**: Retrieves adoption stage progression
- **Get retention cohorts**: Retrieves cohort analysis
- **Get productivity scores**: Retrieves wallet productivity metrics
- **Get shielded analytics**: Retrieves shielded transaction data
- **Get wallet segments**: Retrieves wallet segmentation
- **Get project health indicators**: Retrieves overall project health

### Test 4: Payment and Withdrawal Flows (7 tests)

- **Check subscription status**: Retrieves current subscription information
- **Create subscription invoice**: Creates a payment invoice
- **Get invoice details**: Retrieves invoice information
- **Check payment status**: Checks if payment has been received
- **Get user balance**: Retrieves user's ZEC balance
- **Create withdrawal request**: Creates a withdrawal (may fail with insufficient balance)
- **Get withdrawal history**: Retrieves withdrawal records

### Test 5: Privacy Mode Enforcement (5 tests)

- **Verify private wallet is excluded from public queries**: Tests privacy filtering
- **Update wallet privacy mode**: Changes privacy mode from private to public
- **Verify privacy mode change is immediate**: Confirms immediate enforcement
- **Test monetizable data access**: Sets wallet to monetizable mode
- **Verify cross-user access prevention**: Ensures users can't access other users' data

### Test 6: Error Handling (3 tests)

- **Verify structured error responses**: Checks error response format
- **Verify validation errors**: Tests input validation
- **Verify authentication errors**: Tests authentication failure handling

## Troubleshooting

### Connection Refused Error

```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solution**: Start the backend server:
```bash
cd backend
npm start
```

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Start PostgreSQL:
```bash
sudo systemctl start postgresql
```

### Migration Errors

```
Error: relation "users" does not exist
```

**Solution**: Run migrations:
```bash
cd backend
npm run migrate
```

### JWT Secret Error

```
Error: JWT_SECRET is not defined
```

**Solution**: Set JWT_SECRET in `.env`:
```env
JWT_SECRET=your-secret-key-here
```

## Continuous Integration

### GitHub Actions

Add to `.github/workflows/integration-tests.yml`:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: boardling_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Run migrations
        run: |
          cd backend
          npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/boardling_test
      
      - name: Start backend server
        run: |
          cd backend
          npm start &
          sleep 5
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/boardling_test
          JWT_SECRET: test-secret
          PORT: 3001
      
      - name: Run integration tests
        run: node backend/tests/test-final-integration.js
        env:
          BASE_URL: http://localhost:3001
```

## Test Maintenance

### Adding New Tests

To add new integration tests:

1. Add a new test function in `test-final-integration.js`
2. Call the function from `runFinalIntegrationTests()`
3. Update this documentation

### Updating Test Data

Test data is defined at the top of `test-final-integration.js`:

```javascript
const TEST_USER = {
  name: 'Integration Test User',
  email: `integration-test-${Date.now()}@example.com`,
  password: 'TestPassword123!'
};

const TEST_PROJECT = {
  name: 'Integration Test Project',
  // ...
};

const TEST_WALLETS = [
  // ...
];
```

## Related Documentation

- [Requirements Document](../../.kiro/specs/fullstack-integration/requirements.md)
- [Design Document](../../.kiro/specs/fullstack-integration/design.md)
- [Tasks Document](../../.kiro/specs/fullstack-integration/tasks.md)
- [Authentication Setup](../docs/AUTHENTICATION_SETUP.md)
- [Project Management Setup](../docs/PROJECT_MANAGEMENT_SETUP.md)
- [Analytics API Endpoints](../docs/ANALYTICS_API_ENDPOINTS.md)

## Success Criteria

All 32 integration tests must pass for Task 43 to be considered complete:

- ✅ 4 user registration flow tests
- ✅ 6 onboarding flow tests
- ✅ 8 analytics dashboard tests
- ✅ 7 payment and withdrawal tests
- ✅ 5 privacy mode enforcement tests
- ✅ 3 error handling tests

**Total**: 32 tests covering all major system flows
