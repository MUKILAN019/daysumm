/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^react-native-purchases$': '<rootDir>/lib/purchases/__mocks__/purchases.ts',
    '^expo-sqlite$': '<rootDir>/lib/db/__mocks__/sqlite.ts',
  },
};
