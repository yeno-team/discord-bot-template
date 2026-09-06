/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/database/migrations/**'],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/tests'],
  setupFiles: ['reflect-metadata'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
};

export default config;
