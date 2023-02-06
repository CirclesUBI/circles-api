import Sequelize from 'sequelize';

import db from '../database';

const News = db.define('news', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  message_en: {
    type: Sequelize.TEXT,
  },
  date: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
    defaultValue: Sequelize.NOW,
  },
  icon_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  active: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

export default News;
