import Sequelize from 'sequelize';

import db from '../database';

const uniqueAndNotNull = {
  unique: true,
  allowNull: false,
  validate: {
    notEmpty: true,
  },
};

const User = db.define('users', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    ...uniqueAndNotNull,
    type: Sequelize.STRING,
  },
  safeAddress: {
    ...uniqueAndNotNull,
    type: Sequelize.STRING,
  },
});

export default User;