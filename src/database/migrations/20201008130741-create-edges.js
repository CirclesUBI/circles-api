module.exports = { up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('edges', {
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
      from: {
        type: Sequelize.STRING(42),
        allowNull: false,
        unique: 'edges_unique',
      },
      to: {
        type: Sequelize.STRING(42),
        allowNull: false,
        unique: 'edges_unique',
      },
      token: {
        type: Sequelize.STRING(42),
        allowNull: false,
        unique: 'edges_unique',
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('edges');
  },
};
