# E2E Integration Tests - Quick Start Guide

## Quick Run

```bash
# Run all E2E tests
cd backend/tests
./run-e2e-tests.sh

# Or run backend tests only
cd backend/tests/integration
node run-e2e-flows.js

# Or run frontend tests only
npm run test -- src/__tests__/integration/e2e-flows.test.tsx --run
```

## Prerequisites Checklist

- [ ] Backend server running (`npm start` in backend/)
- [ ] Database initialized (`npm run migrate` in backend/)
- [ ] Environment variables set (`.env` file configured)
- [ ] PostgreSQL running

## Quick Setup

```bash
# 1. Start PostgreSQL (if not running)
sudo systemctl start postgresql

# 2. Initialize database
cd backend
npm run migrate

# 3. Start backend server (in separate terminal)
cd backend
npm start

# 4. Run E2E tests (in another terminal)
cd backend/tests
./run-e2e-tests.sh
```

## Test Flows

### Flow 1: Registration → Onboarding → Analytics
Tests complete user journey from signup to viewing analytics

### Flow 2: Subscription Upgrade
Tests free trial and premium subscription upgrade

### Flow 3: Data Monetization
Tests setting wallets to monetizable and creating data access invoices

### Flow 4: Withdrawal
Tests balance checking, address validation, and withdrawal requests

## Expected Output

```
================================================================================
  END-TO-END INTEGRATION TESTS
================================================================================
Base URL: http://localhost:3001

================================================================================
  Flow 1: Registration → Onboarding → Analytics
================================================================================
✅ PASS: 1.1: User registration creates account
✅ PASS: 1.2: User login returns JWT token
...

================================================================================
  TEST SUMMARY
================================================================================
ℹ️  Total Tests: 42
✅ Passed: 42
✅ Failed: 0
✅ Success Rate: 100.0%

🎉 ALL E2E TESTS PASSED! 🎉
```

## Troubleshooting

### Server Not Running
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```
**Fix**: Start backend server with `npm start`

### Database Connection Error
```
Error: Connection terminated unexpectedly
```
**Fix**: Check PostgreSQL is running and database exists

### Test Timeout
```
Error: Timeout - Async callback was not invoked
```
**Fix**: Increase timeout or check server performance

## Test Configuration

Edit environment variables in `.env`:

```bash
BASE_URL=http://localhost:3001
TEST_ENV=test
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/boardling
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run E2E Tests
  run: |
    npm start &
    sleep 5
    cd backend/tests
    ./run-e2e-tests.sh
```

## Need Help?

See full documentation: [README.md](./README.md)
