module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('users', ['safeAddress'], {
      name: 'IX_safe_address',
      unique: true,
      concurrently: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', ['safeAddress']);
  },
};
