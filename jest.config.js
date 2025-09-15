module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/nodes'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'nodes/utils/JwtValidator.ts',
    'nodes/utils/EnreachUtils.ts',
    '!nodes/**/constants.ts'
  ],
  coverageThreshold: {
    './nodes/utils/JwtValidator.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './nodes/utils/EnreachUtils.ts': {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40
    }
  }
};