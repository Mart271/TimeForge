import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'fs';

const baseTsconfig = JSON.parse(readFileSync('tsconfig.base.json', 'utf8'));

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  // Ignore stale git worktrees under .claude/worktrees — they duplicate spec
  // files and pollute the run (double-counted suites, masked failures).
  testPathIgnorePatterns: ['/node_modules/', '/.claude/', '/dist/'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    ...pathsToModuleNameMapper(baseTsconfig.compilerOptions.paths, { prefix: '<rootDir>/' }),
    '^@/(.*)$': '<rootDir>/apps/api/src/$1',
  },
};

export default config;
