module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest', // Transform both .ts and .js files
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|date-fns)/)', // Ensure uuid and date-fns are NOT ignored
  ],
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'), // Explicitly resolve uuid to its CommonJS version if available
  },
  collectCoverage: false, // Disable coverage for now to focus on logs
  verbose: true, // Enable verbose output for more details
};
