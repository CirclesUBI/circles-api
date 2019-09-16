import httpStatus from 'http-status';
import { Op } from 'sequelize';

import APIError from '../helpers/errors';
import User from '../models/users';
import core from '../services/core';
import web3 from '../services/web3';
import { respondWithSuccess } from '../helpers/responses';

const UNSET_NONCE = 0;

function prepareUserResult(response) {
  return {
    id: response.id,
    username: response.username,
    safeAddress: response.safeAddress,
  };
}

function checkSignature(address, nonce, signature, data) {
  const { safeAddress, username } = data;

  const dataString = `${address}${nonce}${safeAddress}${username}`;

  let recoveredAddress;

  try {
    recoveredAddress = web3.eth.accounts.recover(dataString, signature);
  } catch {
    // Do nothing ..
  }

  if (recoveredAddress !== address) {
    throw new Error('Invalid signature');
  }
}

async function checkSafeStatus(isNonceGiven, safeAddress) {
  try {
    const { txHash } = await core.utils.requestRelayer({
      path: ['safe', safeAddress, 'funded'],
      method: 'GET',
      version: 2,
    });

    const isDeployed = txHash !== null;

    if ((!isNonceGiven && !isDeployed) || (isNonceGiven && isDeployed)) {
      throw new Error('Wrong claimed Safe state');
    }
  } catch (err) {
    throw new Error(err);
  }
}

async function checkOwner(address, safeAddress) {
  try {
    const { owners } = await core.utils.requestRelayer({
      path: ['safe', safeAddress],
      method: 'GET',
      version: 1,
    });

    if (!owners.includes(address)) {
      throw new Error('Not owner of Safe');
    }
  } catch (err) {
    throw new Error(err);
  }
}

async function checkSaltNonce(nonce, address) {
  let isSafeExisting = false;

  try {
    await core.utils.requestRelayer({
      path: ['safe'],
      method: 'POST',
      version: 2,
      data: {
        nonce,
        owners: [address],
        threshold: 1,
      },
    });
  } catch (err) {
    isSafeExisting = true;
  }

  if (!isSafeExisting) {
    throw new Error('Invalid nonce');
  }
}

async function createNewUser(req, res, next) {
  const { address, nonce = UNSET_NONCE, signature, data } = req.body;

  // Check signature
  try {
    checkSignature(address, nonce, signature, data);
  } catch (err) {
    return next(new APIError(httpStatus.FORBIDDEN, err.message));
  }

  const { safeAddress, username } = data;

  // Check if entry already exists
  User.findOne({
    where: {
      [Op.or]: [
        {
          username,
        },
        {
          safeAddress,
        },
      ],
    },
  })
    .then(response => {
      if (response) {
        return next(new APIError(httpStatus.CONFLICT, 'Entry already exists'));
      }
    })
    .catch(err => {
      return next(err);
    });

  // Check if claimed safe is correct and owned by address
  const isNonceGiven = nonce !== UNSET_NONCE;

  try {
    await checkSafeStatus(isNonceGiven, safeAddress);

    if (!isNonceGiven) {
      await checkOwner(address, safeAddress);
    } else {
      await checkSaltNonce(nonce, address, safeAddress);
    }
  } catch (err) {
    return next(new APIError(httpStatus.BAD_REQUEST, err.message));
  }

  // Everything is fine, create entry!
  User.create({
    username,
    safeAddress,
  })
    .then(() => {
      respondWithSuccess(res, null, httpStatus.CREATED);
    })
    .catch(err => {
      next(err);
    });
}

async function getByUsername(req, res, next) {
  const { username } = req.params;

  User.findOne({
    where: {
      username,
    },
  })
    .then(response => {
      if (response) {
        respondWithSuccess(res, prepareUserResult(response));
      } else {
        next(new APIError(httpStatus.NOT_FOUND));
      }
    })
    .catch(err => {
      next(err);
    });
}

async function resolveBatch(req, res, next) {
  const { username, address } = req.query;

  User.findAll({
    where: {
      [Op.or]: [
        {
          username: {
            [Op.in]: username,
          },
        },
        {
          safeAddress: {
            [Op.in]: address,
          },
        },
      ],
    },
  })
    .then(response => {
      respondWithSuccess(res, response.map(prepareUserResult));
    })
    .catch(err => {
      return next(err);
    });
}

export default {
  createNewUser,
  getByUsername,
  resolveBatch,
};
