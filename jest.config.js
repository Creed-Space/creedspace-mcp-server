module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/postinstall.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle ESM-style .js imports by mapping to .ts source files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 10000,

  // Coverage thresholds - set to achievable levels based on current coverage (~18%)
  // Note: Per-file thresholds removed for index.ts/api-client.ts as they're
  // re-export modules without direct test coverage
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 15,
      lines: 15,
      statements: 15
    }
  },
  verbose: true,
  collectCoverage: false, // Only collect when explicitly requested
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    'postinstall.ts'
  ]
};