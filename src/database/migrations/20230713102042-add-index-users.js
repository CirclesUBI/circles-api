module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('users', ['username'], {
      name: 'IX_users_name',
      unique: true,
      concurrently: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', ['username']);
  },
};
