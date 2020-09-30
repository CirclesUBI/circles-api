import Sequelize from 'sequelize';

import db from '../database';

const Transfer = db.define('transfers', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
    type: Sequelize.STRING,
  },
  paymentNote: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
});

export default Transfer;
