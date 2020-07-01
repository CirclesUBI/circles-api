module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      createdAt: {
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
      username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      safeAddress: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    });
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('users');
  },
};
