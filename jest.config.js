module.exports = {
  testEnvironment: 'node',

  // Resolve own modules with alias
  moduleNameMapper: {
    '^~(.*)$': '<rootDir>/src$1',
  },
};
