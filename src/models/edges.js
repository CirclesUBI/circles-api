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

export default Edge;
