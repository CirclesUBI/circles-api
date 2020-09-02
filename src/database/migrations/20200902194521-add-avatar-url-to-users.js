module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('users', 'avatarUrl', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: (queryInterface) => {
    return queryInterface.removeColumn('users', 'avatarUrl');
  },
};
