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
      type: Sequelize.STRING,
      allowNull: false,
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
