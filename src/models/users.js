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
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  avatarUrl: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  safeAddress: {
    ...uniqueAndNotNull,
    type: Sequelize.STRING,
  },
  profileMigrationConsent: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

export default User;
