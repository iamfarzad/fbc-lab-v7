// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    // Stub ESM-only KV client in tests to avoid transform issues
    '^@vercel/kv$': '<rootDir>/tests/mocks/vercel-kv.ts',
    // Mock AI SDK to avoid network calls in unit tests
    '^ai$': '<rootDir>/tests/mocks/ai.ts',
    // Mock ESM-only Google GenAI client to avoid ESM transform of node_modules
    '^@google/genai$': '<rootDir>/__mocks__/@google/genai.ts'
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.jest.json'
    }]
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

// Simple Jest config without Next.js integration for now
module.exports = customJestConfig
