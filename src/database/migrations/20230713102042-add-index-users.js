module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex(
      'users',
      ['username', 'safeAddress', 'email', 'avatarUrl'],
      {
        name: 'users_unique',
        unique: true,
        concurrently: true,
      },
    );
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', [
      'username',
      'safeAddress',
      'email',
      'avatarUrl',
    ]);
  },
};
