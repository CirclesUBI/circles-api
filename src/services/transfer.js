import findTransferSteps from '@circles/transfer';
import { performance } from 'perf_hooks';

import fetchAllFromGraph from './graph';
import web3 from './web3';
import { minNumberString } from '../helpers/compare';

export async function getTrustNetworkEdges() {
  // Methods to parse the data we get to break all down into given safe
  // addresses, the tokens they own, the trust connections they have between
  // each other and finally a list of all tokens.
  const connections = [];
  const safes = [];
  const tokens = [];

  const findToken = (tokenAddress) => {
    return tokens.find((node) => node.address === tokenAddress);
  };

  const findSafe = (safeAddress) => {
    return safes.find((node) => node.address === safeAddress);
  };

  const findConnection = (userAddress, canSendToAddress) => {
    return connections.find(
      (edge) =>
        edge.canSendToAddress === canSendToAddress &&
        edge.userAddress === userAddress,
    );
  };

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

      if (!findConnection(userAddress, canSendToAddress)) {
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

        if (!findToken(tokenAddress)) {
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

  // @TODO: Cache this data in a database and request it every x seconds via
  // background task:
  const safeQuery = `{
    limit
    canSendToAddress
    userAddress
  }`;

  const safeFields = `
    id
    outgoing ${safeQuery}
    incoming ${safeQuery}
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

  const response = await fetchAllFromGraph('safes', safeFields);

  response.forEach((safe) => {
    if (!findSafe(safe.id)) {
      addSafe(safe.id, safe.balances);

      addConnections(safe.outgoing);
      addConnections(safe.incoming);
    }
  });

  // Find tokens for each connection we can actually use for transitive
  // transactions
  const edges = connections.reduce((acc, connection) => {
    const senderSafeAddress = connection.userAddress;
    const receiverSafeAddress = connection.canSendToAddress;

    // Ignore connections where we trust ourselves
    if (senderSafeAddress === receiverSafeAddress) {
      return acc;
    }

    // Get the senders Safe
    const senderSafe = findSafe(senderSafeAddress);

    if (!senderSafe) {
      return acc;
    }

    // Get tokens the sender owns
    const senderTokens = senderSafe.tokens;

    // Which of them are trusted by the receiving node?
    const trustedTokens = senderTokens.reduce(
      (tokenAcc, { address, balance }) => {
        const token = findToken(address);

        const tokenConnection = connections.find(
          ({ limit, userAddress, canSendToAddress }) => {
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
    trustedTokens.forEach((trustedToken) => {
      // Simplify the numbers to not break Maximum flow algorithm
      const capacity = Math.floor(
        parseFloat(web3.utils.fromWei(trustedToken.capacity, 'ether')),
      );

      acc.push({
        from: senderSafeAddress,
        to: receiverSafeAddress,
        capacity,
        token: trustedToken.token,
      });
    });

    return acc;
  }, []);

  return {
    statistics: {
      safes: safes.length,
      connections: connections.length,
      tokens: tokens.length,
    },
    edges,
  };
}

export async function transferSteps({ from, to, value }) {
  const startTime = performance.now();

  const { edges, statistics } = await getTrustNetworkEdges();

  const nodes = edges.reduce((acc, edge) => {
    if (!acc.includes(edge.from)) {
      acc.push(edge.from);
    }

    if (!acc.includes(edge.to)) {
      acc.push(edge.to);
    }

    if (!acc.includes(edge.token)) {
      acc.push(edge.token);
    }

    return acc;
  }, []);

  if (nodes.length === 0) {
    throw new Error('Trust network does not contain any nodes');
  }

  const result = findTransferSteps({
    from,
    to,
    value,
    nodes,
    edges,
  });

  const endTime = performance.now();

  return {
    ...result,
    transferSteps: result.transferSteps.map(({ token, ...step }) => {
      return {
        ...step,
        tokenOwnerAddress: token,
      };
    }),
    statistics: {
      ...statistics,
      milliseconds: Math.round(endTime - startTime),
    },
  };
}
