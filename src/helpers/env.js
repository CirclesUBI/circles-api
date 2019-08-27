// Use require since it is used by sequelize-cli without babel
const dotenv = require('dotenv');
const path = require('path');

// Load .env files in test and development
if (['test', 'development'].includes(process.env.NODE_ENV)) {
  const envFile =
    process.env.NODE_ENV === 'development'
      ? '.env'
      : `.env.${process.env.NODE_ENV}`;

  dotenv.config({
    path: path.join(__dirname, '..', '..', envFile),
  });
}
