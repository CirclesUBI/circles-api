import httpStatus from 'http-status';

import APIError from '../helpers/errors';
import logger from '../helpers/logger';

// eslint-disable-next-line no-unused-vars
export default function errorsMiddleware(err, req, res, next) {
  // Check if error is public facing
  if (!err.isPublic && process.env.NODE_ENV === 'production') {
    // Log error message internally ..
    const message = err.message || httpStatus[err.code];
    logger.error(`${message} ${err.code} ${err.stack}`);

    // .. and expose generic message to public
    err = new APIError(httpStatus.INTERNAL_SERVER_ERROR);
  }

  // Respond with error message and status
  res.status(err.code).json({
    code: err.code,
    message: err.message || httpStatus[err.code],
    status: 'error',
  });
}
