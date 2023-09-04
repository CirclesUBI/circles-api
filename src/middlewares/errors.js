import httpStatus from 'http-status';
import { isCelebrateError as isValidationError } from 'celebrate';

import APIError from '../helpers/errors';
import logger from '../helpers/logger';
import { respondWithError } from '../helpers/responses';

// eslint-disable-next-line no-unused-vars
export default function errorsMiddleware(err, req, res, next) {
  // Check if error is public facing and known to us
  if (isValidationError(err)) {
    // Show validation errors to user
    err = new APIError(httpStatus.BAD_REQUEST);

    if (err.details) {
      err.data = {
        fields: err.details.map((detail) => {
          return {
            path: detail.path,
            message: detail.message,
          };
        }),
      };
    }
  } else if (
    !(err instanceof APIError) ||
    (!err.isPublic && process.env.NODE_ENV === 'production')
  ) {
    // Log error message internally
    if (err.code) {
      const message = err.message || httpStatus[err.code];
      logger.error(`${message} ${err.code} ${err.stack}`);
    } else {
      logger.error(err.stack);
    }

    // Send a generic INTERNAL_SERVER_ERROR APIError to the client
    err = new APIError(httpStatus.INTERNAL_SERVER_ERROR);
  }

  // Respond with the error message and status
  respondWithError(
    res,
    {
      code: err.code,
      message: err.message || httpStatus[err.code],
      ...err.data,
    },
    err.code,
  );
}
