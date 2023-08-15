'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('news', 'title_en', {
      type: Sequelize.TEXT,
    });
  },
  down: (queryInterface) => {
    return queryInterface.removeColumn('news', 'title_en');
  },
};
