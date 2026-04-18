/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'main',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/app/main', '<rootDir>/modules'],
      testMatch: ['**/*.test.ts'],
      moduleNameMapper: {
        '@modules/speech': '<rootDir>/modules/speech/src/index.ts',
        '@modules/text': '<rootDir>/modules/text/src/index.ts',
        '@modules/db': '<rootDir>/modules/db/src/index.ts',
        '@modules/auth': '<rootDir>/modules/auth/src/index.ts',
      },
    },
    {
      displayName: 'renderer',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/app/renderer/src'],
      testMatch: ['**/*.test.tsx', '**/*.test.ts'],
      moduleNameMapper: {
        '\\.css$': '<rootDir>/app/renderer/src/__mocks__/fileMock.ts',
      },
      setupFilesAfterEnv: ['<rootDir>/app/renderer/src/setupTests.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: '<rootDir>/app/renderer/tsconfig.json',
        }],
      },
    },
  ],
};
