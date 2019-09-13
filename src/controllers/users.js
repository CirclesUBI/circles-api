import httpStatus from 'http-status';

import APIError from '../helpers/errors';
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

function createNewUser(req, res) {
  // eslint-disable-next-line no-unused-vars
  const { address, nonce = UNSET_NONCE, signature, data } = req.body;

  try {
    checkSignature(address, nonce, signature, data);
  } catch (err) {
    throw new APIError(httpStatus.FORBIDDEN, err.message);
  }

  respondWithSuccess(res);
}

export default {
  createNewUser,
};
