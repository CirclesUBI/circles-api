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
    throw new APIError(httpStatus.FORBIDDEN, 'Invalid signature');
  }
}

async function checkSafeStatus(isNonceGiven, safeAddress) {
  let isDeployed;

  try {
    const { txHash } = await core.utils.requestRelayer({
      path: ['safes', safeAddress, 'funded'],
      method: 'GET',
      version: 2,
    });

    isDeployed = txHash !== null;
  } catch (err) {
    throw new Error(err);
  }

  if ((!isNonceGiven && !isDeployed) || (isNonceGiven && isDeployed)) {
    throw new APIError(httpStatus.BAD_REQUEST, 'Invalid Safe state');
  }
}

async function checkOwner(address, safeAddress) {
  let owners = [];

  try {
    const response = await core.utils.requestRelayer({
      path: ['safes', safeAddress],
      method: 'GET',
      version: 1,
    });

    owners = response.owners;
  } catch (err) {
    throw new Error(err);
  }

  if (!owners.includes(address)) {
    throw new APIError(httpStatus.BAD_REQUEST, 'Invalid Safe owner');
  }
}

async function checkSaltNonce(nonce, address) {
  let isSafeExisting = false;

  try {
    await core.utils.requestRelayer({
      path: ['safes'],
      method: 'POST',
      version: 2,
      data: {
        nonce,
        owners: [address],
        threshold: 1,
      },
    });
  } catch (err) {
    // Relayer responded with error 422 ..
    if (err.toString().includes(httpStatus.UNPROCESSABLE_ENTITY)) {
      isSafeExisting = true;
    } else {
      throw new Error(err);
    }
  }

  if (!isSafeExisting) {
    throw new APIError(httpStatus.BAD_REQUEST, 'Invalid nonce');
  }
}

async function checkIfExists(username, safeAddress) {
  let response;

  try {
    response = await User.findOne({
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
    });
  } catch (err) {
    throw new Error(err);
  }

  if (response) {
    throw new APIError(httpStatus.CONFLICT, 'Entry already exists');
  }
}

async function createNewUser(req, res, next) {
  const { address, nonce = UNSET_NONCE, signature, data } = req.body;
  const { safeAddress, username } = data;
  const isNonceGiven = nonce !== UNSET_NONCE;

  // Check signature
  try {
    checkSignature(address, nonce, signature, data);
  } catch (err) {
    return next(err);
  }

  // Check if entry already exists
  try {
    await checkIfExists(username, safeAddress);
  } catch (err) {
    return next(err);
  }

  // Check if claimed safe is correct and owned by address
  try {
    await checkSafeStatus(isNonceGiven, safeAddress);

    if (!isNonceGiven) {
      await checkOwner(address, safeAddress);
    } else {
      await checkSaltNonce(nonce, address, safeAddress);
    }
  } catch (err) {
    return next(err);
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
            [Op.in]: username || [],
          },
        },
        {
          safeAddress: {
            [Op.in]: address || [],
          },
        },
      ],
    },
  })
    .then(response => {
      respondWithSuccess(res, response.map(prepareUserResult));
    })
    .catch(err => {
      next(err);
    });
}

export default {
  createNewUser,
  getByUsername,
  resolveBatch,
};
