/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/server.js',
  ],
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  testTimeout: 10000,
};
