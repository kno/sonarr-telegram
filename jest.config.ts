import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
};

export default config;

