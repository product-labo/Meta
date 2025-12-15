# Zcash Paywall SDK - Tests

This directory contains test suites for the Zcash Paywall SDK backend.

## Test Structure

```
tests/
├── README.md           # This file
├── sample.test.js      # Unit tests for core functions
├── integration/        # Integration tests (to be added)
├── fixtures/          # Test data fixtures (to be added)
└── helpers/           # Test helper functions (to be added)
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Test Categories

### Unit Tests
- Fee calculation functions
- Utility helper functions
- Validation middleware
- Configuration parsing

### Integration Tests (To Be Implemented)
- API endpoint testing
- Database operations
- Zcash RPC interactions
- End-to-end payment flows

### Performance Tests (To Be Implemented)
- Load testing for API endpoints
- Database query performance
- Memory usage monitoring

## Test Database Setup

For integration tests, you'll need a separate test database:

```bash
# Create test database
createdb zcashpaywall_test

# Run schema
psql -d zcashpaywall_test -f ../schema.sql

# Set test environment variables
export NODE_ENV=test
export DB_NAME=zcashpaywall_test
```

## Test Data

Test fixtures should use:
- Predictable UUIDs for consistency
- Valid but fake Zcash addresses
- Realistic ZEC amounts
- Mock RPC responses

## Coverage Goals

- Unit tests: 90%+ coverage
- Integration tests: All critical paths
- Error handling: All error conditions

## Continuous Integration

Tests should run on:
- Pull requests
- Main branch commits
- Scheduled daily runs
- Before releases

## Writing New Tests

Follow these patterns:

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test('should do something specific', () => {
    // Arrange
    const input = 'test data';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

## Mock Strategy

- Mock external dependencies (Zcash RPC, database)
- Use real implementations for unit tests where possible
- Provide realistic mock data
- Test both success and failure scenarios
