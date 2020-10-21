import Sequelize from 'sequelize';

import db from '../database';

const Edge = db.define(
  'edges',
  {
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
      type: Sequelize.STRING,
    },
  },
  {
    indexes: [
      {
        name: 'edges_unique',
        unique: true,
        fields: ['from', 'to', 'token'],
      },
    ],
  },
);

export default Edge;
