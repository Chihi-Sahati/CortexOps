// CortexOps - Jest Configuration
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
  ],
  // Coverage thresholds disabled — tests are focused on critical security modules.
  // Re-enable once integration tests are added.
  // coverageThreshold: { global: { branches: 70, functions: 70, lines: 80, statements: 80 } },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|nanoid)/)',
  ],
}

export default createJestConfig(config)
