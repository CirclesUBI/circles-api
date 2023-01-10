import httpStatus from 'http-status';

import APIError from '../helpers/errors';
import Transfer from '../models/transfers';
import transferSteps from '../services/findTransferSteps';
import updatePath from '../services/updateTransferSteps';
import { checkFileExists } from '../services/edgesFile';
import { checkSignature } from '../helpers/signature';
import { requestGraph } from '../services/graph';
import { respondWithSuccess } from '../helpers/responses';

function prepareTransferResult(response) {
  return {
    id: response.id,
    from: response.from,
    to: response.to,
    transactionHash: response.transactionHash,
    paymentNote: response.paymentNote,
  };
}

async function checkIfExists(transactionHash) {
  const response = await Transfer.findOne({
    where: {
      transactionHash,
    },
  });

  if (response) {
    throw new APIError(httpStatus.CONFLICT, 'Entry already exists');
  }
}

export default {
  createNewTransfer: async (req, res, next) => {
    const { address, signature, data } = req.body;
    const { from, to, transactionHash, paymentNote } = data;

    try {
      // Check signature
      if (!checkSignature([from, to, transactionHash], signature, address)) {
        throw new APIError(httpStatus.FORBIDDEN, 'Invalid signature');
      }

      // Check if entry already exists
      await checkIfExists(transactionHash);
    } catch (err) {
      return next(err);
    }

    // Everything is fine, create entry!
    Transfer.create({
      from,
      to,
      paymentNote,
      transactionHash,
    })
      .then(() => {
        respondWithSuccess(res, null, httpStatus.CREATED);
      })
      .catch((err) => {
        next(err);
      });
  },

  getByTransactionHash: async (req, res, next) => {
    const { transactionHash } = req.params;
    const { address, signature } = req.body;
    let safeAddresses = [];

    // Check signature
    try {
      if (!checkSignature([transactionHash], signature, address)) {
        throw new APIError(httpStatus.FORBIDDEN, 'Invalid signature');
      }

      // Check if signer ownes the claimed safe address
      const query = `{
        user(id: "${address.toLowerCase()}") {
          safeAddresses
        }
      }`;

      const data = await requestGraph(query);

      if (!data || !data.user) {
        throw new APIError(httpStatus.FORBIDDEN, 'Not allowed');
      }

      safeAddresses = data.user.safeAddresses;
    } catch (err) {
      return next(err);
    }

    Transfer.findOne({
      where: {
        transactionHash,
      },
    })
      .then((response) => {
        if (!response) {
          next(new APIError(httpStatus.NOT_FOUND));
        } else if (
          // Check if user is either sender or receiver
          !safeAddresses.includes(response.from.toLowerCase()) &&
          !safeAddresses.includes(response.to.toLowerCase())
        ) {
          next(new APIError(httpStatus.FORBIDDEN, 'Not allowed'));
        } else {
          respondWithSuccess(res, prepareTransferResult(response));
        }
      })
      .catch((err) => {
        next(err);
      });
  },

  findTransferSteps: async (req, res, next) => {
    if (!checkFileExists()) {
      next(
        new APIError(
          httpStatus.SERVICE_UNAVAILABLE,
          'Trust network file does not exist',
        ),
      );
    }

    try {
      const result = await transferSteps({
        ...req.body,
      });
      respondWithSuccess(res, result);

    } catch (error) {
      next(new APIError(httpStatus.UNPROCESSABLE_ENTITY, error.message));
    }
  },

  updateTransferSteps: async (req, res, next) => {
    if (!checkFileExists()) {
      next(
        new APIError(
          httpStatus.SERVICE_UNAVAILABLE,
          'Trust network file does not exist',
        ),
      );
    }

    try {
      const result = await updatePath({
        ...req.body,
      });

      respondWithSuccess(res, result);
    } catch (error) {
      next(new APIError(httpStatus.UNPROCESSABLE_ENTITY, error.message));
    }
  },

  getMetrics: async (req, res) => {
    // @DEPRECATED
    respondWithSuccess(res);
  },
};
