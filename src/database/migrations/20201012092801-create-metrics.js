module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('metrics', {
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
      category: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: 'metrics_unique',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: 'metrics_unique',
      },
      value: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
    });
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('metrics');
  },
};
