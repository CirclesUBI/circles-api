import Sequelize from 'sequelize';

import db from '../database';

const Metric = db.define('metrics', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  category: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  value: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
});

export default Metric;
