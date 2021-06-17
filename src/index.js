import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import methodOverride from 'method-override';
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
app.use(methodOverride());
app.use(bodyParser.json());

// Use CORS and security middlewares
app.use(cors());
app.use(helmet());

// Log HTTP requests and route them to winston
app.use(
  morgan(
    (tokens, req, res) => {
      return [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'),
        '-',
        tokens['response-time'](req, res),
        'ms',
      ].join(' ');
    },
    {
      stream: {
        write: (message) => logger.info(message.replace('\n', '')),
      },
    },
  ),
);

// Mount all API routes
app.use('/api', require('./routes'));

// Use middleware to handle all thrown errors
app.use(errorsMiddleware);

// Start server
if (process.env.NODE_ENV !== 'test') {
  const env = app.get('env');
  const port = app.get('port');

  app.listen(port, () => {
    logger.info(`Server is listening at port ${port} in ${env} mode`);
  });
}

export default app;
