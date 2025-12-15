export default {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/property/**/*.test.js',
    '**/tests/unit/**/*.test.js'
  ],
  transform: {},
  testTimeout: 30000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ]
};
