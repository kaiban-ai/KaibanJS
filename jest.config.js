module.exports = {
    transform: {
      '^.+\\.js$': 'babel-jest',
    },
    moduleNameMapper: {
        '^agenticjs$': '<rootDir>/dist/bundle.cjs.js'
    },
    testTimeout: 300000, // Sets global timeout to 10 seconds for all tests
    testEnvironment: 'node', // Use Node.js environment for executing tests,
    verbose: true, // Make Jest more verbose
    silent: false, // Ensure Jest is not silent (though this is not directly related to console.log output)

  };