import fastJsonStringify from 'fast-json-stringify';
import findTransferSteps from '@circles/transfer';
import fs from 'fs';
import { Op } from 'sequelize';
import { performance } from 'perf_hooks';

import db from '../database';
import fetchAllFromGraph from './graph';
import web3 from './web3';
import { getMetrics, setMetrics } from './metrics';
import { minNumberString } from '../helpers/compare';
import {
  EDGES_FILE_PATH,
  EDGES_TMP_FILE_PATH,
  PATHFINDER_FILE_PATH,
} from '../constants';
import Edge from '../models/edges';

const METRICS_TRANSFERS = 'transfers';

const stringify = fastJsonStringify({
  title: 'Circles Edges Schema',
  type: 'array',
  properties: {
    from: {
      type: 'string',
    },
    to: {
      type: 'string',
    },
    token: {
      type: 'string',
    },
    capacity: {
      type: 'string',
    },
  },
});

const findToken = (tokens, tokenAddress) => {
  return tokens.find((token) => token.address === tokenAddress);
};

const findSafe = (safes, safeAddress) => {
  return safes.find((safe) => safe.address === safeAddress);
};

const findConnection = (connections, userAddress, canSendToAddress) => {
  return connections.find(
    (edge) =>
      edge.canSendToAddress === canSendToAddress &&
      edge.userAddress === userAddress,
  );
};

export const safeQuery = `{
    limit
    canSendToAddress
    userAddress
  }`;

export const safeFields = `
    id
    outgoing ${safeQuery}
    incoming ${safeQuery}
    outgoingAddresses
    balances {
      amount
      token {
        id
        owner {
          id
        }
      }
    }
  `;

export async function getTrustNetworkEdges() {
  // Methods to parse the data we get to break all down into given safe
  // addresses, the tokens they own, the trust connections they have between
  // each other and finally a list of all tokens.
  const connections = [];
  const safes = [];
  const tokens = [];

  const addConnection = (userAddress, canSendToAddress, limit) => {
    connections.push({
      canSendToAddress,
      limit,
      userAddress,
    });
  };

  const addConnections = (connections) => {
    connections.forEach((connection) => {
      const userAddress = web3.utils.toChecksumAddress(connection.userAddress);
      const canSendToAddress = web3.utils.toChecksumAddress(
        connection.canSendToAddress,
      );
      const { limit } = connection;

      if (!findConnection(connections, userAddress, canSendToAddress)) {
        addConnection(userAddress, canSendToAddress, limit);
      }
    });
  };

  const addToken = (address, safeAddress) => {
    tokens.push({
      address,
      safeAddress,
    });
  };

  const addSafe = (safeAddress, balances) => {
    const safe = balances.reduce(
      (acc, { token, amount }) => {
        const tokenAddress = web3.utils.toChecksumAddress(token.id);
        const tokenSafeAddress = web3.utils.toChecksumAddress(token.owner.id);

        acc.tokens.push({
          address: tokenAddress,
          balance: amount,
        });

        if (!findToken(tokens, tokenAddress)) {
          addToken(tokenAddress, tokenSafeAddress);
        }

        return acc;
      },
      {
        address: web3.utils.toChecksumAddress(safeAddress),
        tokens: [],
      },
    );

    safes.push(safe);
  };

  const response = await fetchAllFromGraph('safes', safeFields);

  response.forEach((safe) => {
    if (!findSafe(safes, safe.id)) {
      addSafe(safe.id, safe.balances);

      addConnections(safe.outgoing);
      addConnections(safe.incoming);
    }
  });

  return {
    statistics: {
      safes: safes.length,
      connections: connections.length,
      tokens: tokens.length,
    },
    edges: findEdgesInGraphData({
      connections,
      safes,
      tokens,
    }),
  };
}

export function findEdgesInGraphData({ connections, safes, tokens }) {
  const edges = [];

  // Find tokens for each connection we can actually use for transitive
  // transactions
  const checkedEdges = {};

  const getKey = (from, to, token) => {
    return [from, to, token].join('');
  };

  const addEdge = ({ from, to, token, capacity }) => {
    // Ignore sending to ourselves
    if (from === to) {
      return;
    }

    // Ignore duplicates
    const key = getKey(from, to, token);
    if (checkedEdges[key]) {
      return;
    }
    checkedEdges[key] = true;

    edges.push({
      from,
      to,
      token,
      capacity,
    });
  };

  connections.forEach((connection) => {
    const senderSafeAddress = connection.userAddress;
    const receiverSafeAddress = connection.canSendToAddress;

    // Get the senders Safe
    const senderSafe = findSafe(safes, senderSafeAddress);

    if (!senderSafe) {
      return;
    }

    // Get tokens the sender owns
    const senderTokens = senderSafe.tokens;

    // Which of them are trusted by the receiving node?
    const trustedTokens = senderTokens.reduce(
      (tokenAcc, { address, balance }) => {
        const token = findToken(tokens, address);

        const tokenConnection = connections.find(
          ({ limit, userAddress, canSendToAddress }) => {
            if (!limit) {
              return false;
            }

            // Calculate what maximum token value we can send. We use this
            // special string comparison method as using BN instances affects
            // performance significantly
            const capacity = minNumberString(limit, balance);

            return (
              userAddress === token.safeAddress &&
              canSendToAddress === receiverSafeAddress &&
              capacity !== '0'
            );
          },
        );

        if (tokenConnection) {
          const capacity = minNumberString(tokenConnection.limit, balance);

          tokenAcc.push({
            capacity,
            token: token.safeAddress,
          });
        }

        return tokenAcc;
      },
      [],
    );

    // Merge all known data to get a list in the end containing what Token can
    // be sent to whom with what maximum value.
    trustedTokens.reduce((acc, trustedToken) => {
      // Ignore sending to ourselves
      if (senderSafeAddress === receiverSafeAddress) {
        return;
      }

      // Ignore duplicates
      const key = getKey(
        senderSafeAddress,
        receiverSafeAddress,
        trustedToken.token,
      );

      if (checkedEdges[key]) {
        return;
      }

      checkedEdges[key] = true;

      acc.push({
        from: senderSafeAddress,
        to: receiverSafeAddress,
        capacity: trustedToken.capacity,
        token: trustedToken.token,
      });

      return acc;
    });
  });

  // Add connections between token owners and the original safe of the token as
  // they might not be represented by trust connections (for example when an
  // organization owns tokens it can still send them even though noone trusts
  // the organization)
  safes.forEach(({ address, tokens: ownedTokens }) => {
    ownedTokens.forEach(({ address: tokenAddress, balance }) => {
      const token = findToken(tokens, tokenAddress);

      connections.forEach((connection) => {
        if (connection.userAddress === token.safeAddress) {
          addEdge({
            from: address,
            to: connection.canSendToAddress,
            capacity: balance,
            token: token.safeAddress,
          });
        }
      });
    });
  });

  return edges;
}

export async function storeEdges(edges) {
  const previousEdges = await getStoredEdges();

  const getKey = (edge) => {
    return [edge.from, edge.to, edge.token].join('');
  };

  // Group previous edges by unique key to make lookups a little faster
  const groupedPreviousEdges = previousEdges.reduce((acc, previousEdge) => {
    const key = getKey(previousEdge);
    acc[key] = previousEdge;
    return acc;
  }, {});

  const findPreviousEdge = (edge) => {
    const key = getKey(edge);
    return key in groupedPreviousEdges ? groupedPreviousEdges[key] : null;
  };

  // Calculate the delta between the new edges and previousEdges
  const toBeAdded = [];
  const toBeUpdated = [];
  const toBeRemoved = [];
  const latestKeys = {};

  edges.forEach((edge) => {
    // Mark all latest edges so we can find out which ones to remove later
    const key = getKey(edge);
    latestKeys[key] = edge;

    const previousEdge = findPreviousEdge(edge);
    if (!previousEdge) {
      // This entry does not exist yet
      toBeAdded.push(edge);
    } else if (edge.capacity !== previousEdge.capacity) {
      // This entry exists but has a new value
      toBeUpdated.push({
        ...previousEdge,
        capacity: edge.capacity,
      });
    }
  });

  // Find all entries which are not needed anymore
  Object.keys(groupedPreviousEdges).forEach((previousKey) => {
    if (!(previousKey in latestKeys)) {
      toBeRemoved.push(groupedPreviousEdges[previousKey]);
    }
  });

  // Do the actual database transactions
  await db.transaction(async (transaction) => {
    const promises = [];

    if (toBeAdded.length > 0) {
      promises.push(Edge.bulkCreate(toBeAdded, { transaction }));
    }

    if (toBeUpdated.length > 0) {
      promises.push(
        Promise.all(
          toBeUpdated.map((edge) => {
            return Edge.update(
              { capacity: edge.capacity },
              {
                where: {
                  id: edge.id,
                },
                transaction,
              },
            );
          }),
        ),
      );
    }

    if (toBeRemoved.length > 0) {
      promises.push(
        Edge.destroy({
          where: {
            id: {
              [Op.in]: toBeRemoved.map((edge) => {
                return edge.id;
              }),
            },
          },
        }),
      );
    }

    return Promise.all(promises);
  });

  return {
    added: toBeAdded.length,
    removed: toBeRemoved.length,
    updated: toBeUpdated.length,
    total: edges.length,
  };
}

export async function setTransferMetrics(metrics) {
  return await setMetrics(METRICS_TRANSFERS, metrics);
}

export async function getTransferMetrics() {
  return await getMetrics(METRICS_TRANSFERS);
}

export async function getStoredEdges(isWithAttributes = false) {
  return await Edge.findAll({
    attributes: isWithAttributes ? ['from', 'to', 'token', 'capacity'] : null,
    order: [['from', 'ASC']],
    raw: true,
  });
}

export function checkFileExists() {
  return fs.existsSync(EDGES_FILE_PATH);
}

// Store edges into .json file for pathfinder executable
export async function writeToFile(edges) {
  return new Promise((resolve, reject) => {
    fs.writeFile(EDGES_TMP_FILE_PATH, stringify(edges), (error) => {
      if (error) {
        reject(
          new Error(`Could not write to ${EDGES_TMP_FILE_PATH} file: ${error}`),
        );
      } else {
        fs.renameSync(EDGES_TMP_FILE_PATH, EDGES_FILE_PATH);
        resolve();
      }
    });
  });
}

export async function transferSteps({ from, to, value }) {
  if (from === to) {
    throw new Error('Can not send to yourself');
  }

  const startTime = performance.now();

  const result = await findTransferSteps(
    {
      from,
      to,
      value: web3.utils.toWei(value.toString(), 'ether'),
    },
    {
      edgesFile: EDGES_FILE_PATH,
      pathfinderExecutable: PATHFINDER_FILE_PATH,
      timeout: process.env.TRANSFER_STEPS_TIMEOUT || 0,
    },
  );

  const endTime = performance.now();

  return {
    from,
    to,
    maxFlowValue: result.maxFlowValue,
    processDuration: Math.round(endTime - startTime),
    transferValue: value,
    transferSteps: result.transferSteps.map(({ token, ...step }) => {
      return {
        ...step,
        tokenOwnerAddress: token,
      };
    }),
  };
}

const stringify = fastJsonStringify({
  title: 'Circles Edges Schema',
  type: 'array',
  properties: {
    from: {
      type: 'string',
    },
    to: {
      type: 'string',
    },
    token: {
      type: 'string',
    },
    capacity: {
      type: 'string',
    },
  },
});

export async function writeToFile(edges) {
  // Store edges into .json file for pathfinder executable
  fs.writeFile(EDGES_TMP_FILE_PATH, stringify(edges), (error) => {
    if (error) {
      throw new Error(
        `Could not write to ${EDGES_TMP_FILE_PATH} file: ${error}`,
      );
    }

    fs.renameSync(EDGES_TMP_FILE_PATH, EDGES_FILE_PATH);
  });
}
