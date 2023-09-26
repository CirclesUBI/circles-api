import httpStatus from 'http-status';
import Sequelize, { Op } from 'sequelize';

import APIError from '../helpers/errors';
import User from '../models/users';
import core from '../services/core';
import web3 from '../services/web3';
import { requestGraph } from '../services/graph';
import { checkSignature } from '../helpers/signature';
import { respondWithSuccess } from '../helpers/responses';

const UNSET_NONCE = 0;

function prepareUserResult(response) {
  return {
    id: response.id,
    username: response.username,
    safeAddress: response.safeAddress,
    avatarUrl: response.avatarUrl,
  };
}

async function checkSafeStatus(isNonceGiven, safeAddress) {
  const { txHash } = await core.utils.requestRelayer({
    path: ['safes', safeAddress, 'funded'],
    method: 'GET',
    version: 2,
  });

  const isCreated = txHash !== null;

  if ((!isNonceGiven && !isCreated) || (isNonceGiven && isCreated)) {
    throw new APIError(httpStatus.BAD_REQUEST, 'Invalid Safe state');
  }
}

async function checkOwner(address, safeAddress) {
  const response = await core.utils.requestRelayer({
    path: ['safes', safeAddress],
    method: 'GET',
    version: 1,
  });

  if (!response || !response.owners.includes(address)) {
    throw new APIError(httpStatus.BAD_REQUEST, 'Invalid Safe owner');
  }
}

async function checkSaltNonce(saltNonce, address, safeAddress) {
  const predictedSafeAddress = await core.safe.predictAddress(
    {
      address,
      // Fake private key to work around core validation
      privateKey: web3.utils.randomHex(64),
    },
    {
      nonce: saltNonce,
      owners: [address],
      threshold: 1,
    },
  );

  if (predictedSafeAddress !== safeAddress) {
    throw new APIError(httpStatus.BAD_REQUEST, 'Invalid nonce');
  }
}

async function checkIfExists(username, safeAddress) {
  const equalUsernameCondition = Sequelize.where(
    Sequelize.fn('lower', Sequelize.col('username')),
    Sequelize.fn('lower', username),
  );

  const response = await User.findOne({
    where: safeAddress
      ? {
          [Op.or]: [
            equalUsernameCondition,
            {
              safeAddress,
            },
          ],
        }
      : equalUsernameCondition,
  });

  if (response) {
    throw new APIError(httpStatus.CONFLICT, 'Entry already exists');
  }
}

async function checkIfUsernameTakenByOther(username, safeAddress) {
  const equalUsernameCondition = Sequelize.where(
    Sequelize.fn('lower', Sequelize.col('username')),
    Sequelize.fn('lower', username),
  );

  const response = await User.findOne({
    where: {
      [Op.and]: [
        equalUsernameCondition,
        {
          safeAddress: { [Op.ne]: safeAddress },
        },
      ],
    },
  });

  if (response) {
    throw new APIError(
      httpStatus.CONFLICT,
      'Username already taken by other safeAddress',
    );
  }
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
    .then((response) => {
      respondWithSuccess(res, response.map(prepareUserResult));
    })
    .catch((err) => {
      next(err);
    });
}

async function findByUsername(req, res, next) {
  const { query } = req.query;

  User.findAll({
    where: {
      username: {
        [Op.iLike]: `${query}%`,
      },
    },
    order: [['username', 'ASC']],
    limit: 10,
  })
    .then((response) => {
      respondWithSuccess(res, response.map(prepareUserResult));
    })
    .catch((err) => {
      next(err);
    });
}

export default {
  dryRunCreateNewUser: async (req, res, next) => {
    const { username } = req.body;

    if (username) {
      // Check if entry already exists
      try {
        await checkIfExists(username);
      } catch (err) {
        return next(err);
      }
    }

    respondWithSuccess(res, null, httpStatus.OK);
  },

  createNewUser: async (req, res, next) => {
    const { address, nonce = UNSET_NONCE, signature, data } = req.body;
    const { safeAddress, username, email, avatarUrl } = data;
    const isNonceGiven = nonce !== UNSET_NONCE;

    try {
      // Check signature
      if (
        !checkSignature(
          [address, nonce, safeAddress, username],
          signature,
          address,
        )
      ) {
        throw new APIError(httpStatus.FORBIDDEN, 'Invalid signature');
      }

      // Check if entry already exists
      await checkIfExists(username, safeAddress);

      // Check if claimed safe is correct and owned by address
      await checkSafeStatus(isNonceGiven, safeAddress);
      if (isNonceGiven) {
        await checkSaltNonce(nonce, address, safeAddress);
      } else {
        await checkOwner(address, safeAddress);
      }
    } catch (err) {
      return next(err);
    }

    // Everything is fine, create entry!
    User.create({
      avatarUrl,
      email,
      safeAddress,
      username,
    })
      .then(() => {
        respondWithSuccess(res, null, httpStatus.CREATED);
      })
      .catch((err) => {
        next(err);
      });
  },

  getByUsername: async (req, res, next) => {
    const { username } = req.params;

    User.findOne({
      where: {
        username,
      },
    })
      .then((response) => {
        if (response) {
          respondWithSuccess(res, prepareUserResult(response));
        } else {
          next(new APIError(httpStatus.NOT_FOUND));
        }
      })
      .catch((err) => {
        next(err);
      });
  },

  updateUser: async (req, res, next) => {
    const { address, signature, data } = req.body;
    const { safeAddress, username } = data;
    if (safeAddress != req.params.safeAddress) {
      throw new APIError(httpStatus.BAD_REQUEST, 'Incorrect Safe address');
    }
    try {
      // Check signature
      if (
        !checkSignature([address, safeAddress, username], signature, address)
      ) {
        throw new APIError(httpStatus.FORBIDDEN, 'Invalid signature');
      }

      // Check if username is taken by another safeAddress
      await checkIfUsernameTakenByOther(username, safeAddress);

      // Check if signer ownes the claimed safe address
      const query = `{
        user(id: "${address.toLowerCase()}") {
          safeAddresses
        }
      }`;
      const graphData = await requestGraph(query);
      if (
        !graphData ||
        !graphData.user ||
        !graphData.user.safeAddresses.includes(safeAddress.toLowerCase())
      ) {
        throw new APIError(httpStatus.BAD_REQUEST, 'Invalid Safe owner');
      }
    } catch (err) {
      return next(err);
    }

    // Everything is fine, upsert entry!
    await User.upsert(data, { where: { safeAddress: safeAddress } })
      .then(() => {
        respondWithSuccess(res, null);
      })
      .catch((err) => {
        next(err);
      });
  },

  getEmail: async (req, res, next) => {
    const { address, signature } = req.body;
    const { safeAddress } = req.params;

    try {
      // Check signature
      if (!checkSignature([address, safeAddress], signature, address)) {
        throw new APIError(httpStatus.FORBIDDEN, 'Invalid signature');
      }

      // Check if signer ownes the claimed safe address
      const query = `{
        user(id: "${address.toLowerCase()}") {
          safeAddresses
        }
      }`;
      const graphData = await requestGraph(query);
      if (
        !graphData ||
        !graphData.user ||
        !graphData.user.safeAddresses.includes(safeAddress.toLowerCase())
      ) {
        throw new APIError(httpStatus.BAD_REQUEST, 'Invalid Safe owner');
      }
    } catch (err) {
      return next(err);
    }
    // Everything is fine, get email!
    await User.findOne({
      attributes: ['email'],
      where: {
        safeAddress: safeAddress,
      },
    })
      .then((data) => {
        if (!data) {
          next(new APIError(httpStatus.NOT_FOUND));
        } else {
          respondWithSuccess(res, data);
        }
      })
      .catch((err) => {
        next(err);
      });
  },

  findUsers: async (req, res, next) => {
    if (req.query.query) {
      return await findByUsername(req, res, next);
    }

    return await resolveBatch(req, res, next);
  },
  deleteUser: async (req, res, next) => {
    const { address, signature } = req.body;
    const { safeAddress } = req.params;

    try {
      // Check signature
      if (!checkSignature([address, safeAddress], signature, address)) {
        throw new APIError(httpStatus.FORBIDDEN, 'Invalid signature');
      }

      // Check if signer ownes the claimed safe address
      const query = `{
        user(id: "${address.toLowerCase()}") {
          safeAddresses
        }
      }`;
      const graphData = await requestGraph(query);
      if (
        !graphData ||
        !graphData.user ||
        !graphData.user.safeAddresses.includes(safeAddress.toLowerCase())
      ) {
        throw new APIError(httpStatus.BAD_REQUEST, 'Invalid Safe owner');
      }
    } catch (err) {
      return next(err);
    }
    // Everything is fine, remove user entry!
    await User.destroy({ where: { safeAddress: safeAddress } })
      .then(() => {
        respondWithSuccess(res, null);
      })
      .catch((err) => {
        next(err);
      });
  },
};
