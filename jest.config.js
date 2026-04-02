module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/controller/**/*.js',
    'src/service/**/*.js',
    'src/routes/**/*.js',
    '!src/tests/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/jest.setup.js'],
};
