import httpStatus from 'http-status';

import APIError from '../helpers/errors';
import core from '../services/core';
import web3 from '../services/web3';
import { respondWithSuccess } from '../helpers/responses';

const UNSET_NONCE = 0;

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

  // Check if claimed safe is correct and owned by address
  const isNonceGiven = nonce !== UNSET_NONCE;
  const { safeAddress } = data;

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

  respondWithSuccess(res);
}

export default {
  createNewUser,
};
