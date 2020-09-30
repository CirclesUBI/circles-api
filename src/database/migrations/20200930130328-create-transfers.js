module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('transfers', {
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
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      to: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      transactionHash: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      paymentNote: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    });
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('transfers');
  },
};
