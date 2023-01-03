import HubContract from '@circles/circles-contracts/build/contracts/Hub.json';
import TokenContract from '@circles/circles-contracts/build/contracts/Token.json';
import fastJsonStringify from 'fast-json-stringify';
import findTransferSteps from '@circles/transfer';
import fs from 'fs';
import { performance } from 'perf_hooks';

import Edge from '../models/edges';
import logger from '../helpers/logger';
import fetchAllFromGraph from './graph';
import web3 from './web3';
import { getMetrics, setMetrics } from './metrics';
import { minNumberString } from '../helpers/compare';
import {
  EDGES_FILE_PATH,
  EDGES_TMP_FILE_PATH,
  PATHFINDER_FILE_PATH,
} from '../constants';

const METRICS_TRANSFERS = 'transfers';

const DEFAULT_PROCESS_TIMEOUT = 1000 * 10;

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);
const HOPS = 15;
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
  return connections.find((edge) => {
    return (
      edge.canSendToAddress === canSendToAddress &&
      edge.userAddress === userAddress
    );
  });
};

export const safeQuery = `{
  canSendToAddress
  userAddress
}`;

export const safeFields = `
  id
  outgoing ${safeQuery}
  incoming ${safeQuery}
  balances {
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

  const addConnection = (userAddress, canSendToAddress) => {
    connections.push({
      canSendToAddress,
      userAddress,
      isExtended: false,
    });
  };

  const addConnections = (newConnections) => {
    newConnections.forEach((connection) => {
      const userAddress = web3.utils.toChecksumAddress(connection.userAddress);
      const canSendToAddress = web3.utils.toChecksumAddress(
        connection.canSendToAddress,
      );

      if (!findConnection(connections, userAddress, canSendToAddress)) {
        addConnection(userAddress, canSendToAddress);
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
      (acc, { token }) => {
        const tokenAddress = web3.utils.toChecksumAddress(token.id);
        const tokenSafeAddress = web3.utils.toChecksumAddress(token.owner.id);

        acc.tokens.push({
          address: tokenAddress,
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

  const addEdge = ({ from, to, tokenAddress, tokenOwner }) => {
    // Ignore sending to ourselves
    if (from === to) {
      return;
    }

    // Ignore duplicates
    const key = getKey(from, to, tokenOwner);
    if (checkedEdges[key]) {
      return;
    }
    checkedEdges[key] = true;

    edges.push({
      from,
      to,
      tokenAddress,
      tokenOwner,
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
          tokenAcc.push({
            tokenAddress: token.address,
            tokenOwner: token.safeAddress,
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
        tokenAddress: trustedToken.tokenAddress,
        tokenOwner: trustedToken.tokenOwner,
      });

      return acc;
    }, []);
  });

  // Add connections between token owners and the original safe of the token as
  // they might not be represented by trust connections (for example when an
  // organization owns tokens it can still send them even though noone trusts
  // the organization)
  safes.forEach(({ address, tokens: ownedTokens }) => {
    ownedTokens.forEach(({ address: tokenAddress }) => {
      const token = findToken(tokens, tokenAddress);

      connections.forEach((connection) => {
        if (connection.userAddress === token.safeAddress) {
          addEdge({
            from: address,
            to: connection.canSendToAddress,
            tokenAddress,
            tokenOwner: token.safeAddress,
          });
        }
      });
    });
  });

  return edges;
}

export async function upsert(edge) {
  if (edge.capacity.toString() === '0') {
    return Edge.destroy({
      where: {
        token: edge.token,
        from: edge.from,
        to: edge.to,
      },
    });
  } else {
    return Edge.upsert(edge, {
      where: {
        token: edge.token,
        from: edge.from,
        to: edge.to,
      },
    });
  }
}

export async function updateEdge(edge, tokenAddress) {
  // Ignore self-trust
  if (edge.from === edge.to) {
    return;
  }

  try {
    // Get send limit
    const limit = await hubContract.methods
      .checkSendLimit(edge.token, edge.from, edge.to)
      .call();

    // Get Token balance
    const tokenContract = new web3.eth.Contract(
      TokenContract.abi,
      tokenAddress,
    );
    const balance = await tokenContract.methods.balanceOf(edge.from).call();

    // Update edge capacity
    edge.capacity = minNumberString(limit, balance);

    await upsert(edge);
  } catch (error) {
    logger.error(
      `Found error with checking sending limit for token of ${edge.token} from ${edge.from} to ${edge.to} [${error}]`,
    );

    await Edge.destroy({
      where: {
        token: edge.token,
        from: edge.from,
        to: edge.to,
      },
    });
  }
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

export async function transferSteps({ from, to, value, hops }) {
  if (from === to) {
    throw new Error('Can not send to yourself');
  }

  const startTime = performance.now();

  const result = await findTransferSteps(
    {
      from,
      to,
      value,
      hops,
    },
    {
      edgesFile: EDGES_FILE_PATH,
      pathfinderExecutable: PATHFINDER_FILE_PATH,
      timeout: process.env.TRANSFER_STEPS_TIMEOUT || DEFAULT_PROCESS_TIMEOUT,
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
