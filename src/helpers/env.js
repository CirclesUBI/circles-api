// Use require since it is used by sequelize-cli without babel
const dotenv = require('dotenv');
const path = require('path');

const DEFAULT_ENV = 'development';

const env = process.env.NODE_ENV || DEFAULT_ENV;

// Load .env files in test and development
if (['test', 'development'].includes(env)) {
  const envFile = env === 'development' ? '.env' : `.env.${env}`;

  dotenv.config({
    path: path.join(__dirname, '..', '..', envFile),
  });
}
