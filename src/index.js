import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import './helpers/env';

import errorsMiddleware from './middlewares/errors';
import logger from './helpers/logger';
import db from './database';

const DEFAULT_PORT = 3000;

// Check database connection
db.authenticate()
  .then(() => {
    logger.info('Database connection has been established successfully');
  })
  .catch(() => {
    logger.error('Unable to connect to database');
    process.exit(1);
  });

// Initialize express instance
const app = express();
app.set('port', process.env.PORT || DEFAULT_PORT);

// Use HTTP middlewares
app.use(compression());

// Use CORS and security middlewares
app.use(cors());
app.use(helmet());

// Log HTTP requests and route them to winston
app.use(
  morgan('dev', {
    stream: {
      write: message => logger.verbose(message.replace('\n', '')),
    },
  }),
);

// Mount all API routes
app.use('/api', require('./routes'));

// Use middleware to handle all thrown errors
app.use(errorsMiddleware);

// Start server
app.listen(app.get('port'), () => {
  logger.info(
    `Server is listening at port ${app.get('port')} in ${app.get('env')} mode`,
  );
});

export default app;
