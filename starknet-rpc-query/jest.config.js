module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/test/properties/*.test.ts',
    '**/test/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts'
  ],
  testTimeout: 60000,
  maxWorkers: 1 // Run tests sequentially to avoid database conflicts
};
