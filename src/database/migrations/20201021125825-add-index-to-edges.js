module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('edges', ['from', 'to', 'token'], {
      name: 'edges_unique',
      unique: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('edges', ['from', 'to', 'token']);
  },
};
