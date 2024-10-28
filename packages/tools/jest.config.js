module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(@langchain|zod)/)',
  ],
  setupFiles: ['<rootDir>/jest.polyfills.js'],
};