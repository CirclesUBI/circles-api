// Use require since it is used by sequelize-cli without babel
const dotenv = require('dotenv');
const path = require('path');

// Load .env files
dotenv.config({
  path: path.join(__dirname, '..', '..', '.env'),
});
