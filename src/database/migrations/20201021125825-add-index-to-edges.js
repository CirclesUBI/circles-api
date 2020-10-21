module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('edges', ['from', 'to', 'token'], {
      unique: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('edges', ['from', 'to', 'token']);
  },
};
