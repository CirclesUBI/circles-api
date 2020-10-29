// Use require since it is used by sequelize-cli without babel
require('../helpers/env');

const url = process.env.DATABASE_URL;
const dialect = process.env.DATABASE_DIALECT || 'postgres';

const timezone = '+00:00'; // UTC

const asInteger = (envVarName, fallbackValue = 0) => {
  if (envVarName in process.env) {
    return parseInt(process.env[envVarName], 10);
  }
  return fallbackValue;
};

const sslConfiguration = process.env.POSTGRES_USE_SSL
  ? {
      ssl: true,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }
  : {};

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
    ...sslConfiguration,
    pool: {
      // Maximum number of connection in pool
      max: asInteger('POOL_MAX', 2),
      // Minimum number of connection in pool
      min: asInteger('POOL_MIN', 0),
      // The maximum time, in milliseconds, that pool will try to get
      // connection before throwing error
      acquire: asInteger('POOL_AQUIRE', 1000 * 30),
      // The maximum time, in milliseconds, that a connection can be idle
      // before being released
      idle: asInteger('POOL_IDLE', 1000 * 10),
    },
  },
};
