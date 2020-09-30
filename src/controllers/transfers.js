import httpStatus from 'http-status';

import APIError from '../helpers/errors';
import { respondWithSuccess } from '../helpers/responses';
import { transferSteps } from '../services/transfer';

export default {
  findTransferSteps: async (req, res, next) => {
    try {
      const result = await transferSteps({
        ...req.body,
      });

      respondWithSuccess(res, result);
    } catch (error) {
      next(new APIError(httpStatus.UNPROCESSABLE_ENTITY, error.message));
    }
  },
};
