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
    ssl: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      // Maximum number of connection in pool
      max: process.env.POOL_MAX || 2,
      // Minimum number of connection in pool
      min: process.env.POOL_MIN || 0,
      // The maximum time, in milliseconds, that pool will try to get
      // connection before throwing error
      acquire: process.env.POOL_AQUIRE || 1000 * 30,
      // The maximum time, in milliseconds, that a connection can be idle
      // before being released
      idle: process.env.POOL_IDLE || 1000 * 10,
    },
  },
};
