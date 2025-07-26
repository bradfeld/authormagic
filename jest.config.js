module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './jest.babel.config.js' }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverage: false,
  // Simplified - removed coverage collection to avoid JSX parsing issues
};
