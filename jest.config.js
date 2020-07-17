module.exports = {
  testEnvironment: 'node',
  testTimeout: 200000,

  // Resolve own modules with alias
  moduleNameMapper: {
    '^~(.*)$': '<rootDir>/src$1',
  },
};
