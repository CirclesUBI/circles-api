// Use require since it is used by sequelize-cli without babel
require('../helpers/env');

const url = process.env.DATABASE_URL;
const dialect = process.env.DATABASE_DIALECT || 'postgres';

const timezone = '+00:00'; // UTC

module.exports = {
  test: {
    url,
    dialect,
    timezone,
  },
  development: {
    url,
    dialect,
    timezone,
  },
  staging: {
    url,
    dialect,
    timezone,
  },
  production: {
    url,
    dialect,
    timezone,
  },
};
