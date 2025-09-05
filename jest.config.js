/** @type {import('jest').Config} */
module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  coverageDirectory: './coverage',
  collectCoverageFrom: ['src/**/*.js', 'src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^kaibanjs$': '<rootDir>/dist/bundle.cjs',
  },
  testTimeout: 300000, // Sets global timeout to 10 seconds for all tests
  noStackTrace: true,
  verbose: true, // Make Jest more verbose
  silent: false, // Ensure Jest is not silent (though this is not directly related to console.log output)
  // testMatch: ['**/tests/e2e/**/eventPlanningTeam.test.js'], // Run tests only in the specific directory
};
