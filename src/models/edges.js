import Sequelize from 'sequelize';

import db from '../database';

const Edge = db.define('edges', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  from: {
    type: Sequelize.STRING(42),
    allowNull: false,
  },
  to: {
    type: Sequelize.STRING(42),
    allowNull: false,
  },
  token: {
    type: Sequelize.STRING(42),
    allowNull: false,
  },
  capacity: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

export default Edge;
