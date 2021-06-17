import fetchAllFromGraph from './graph';
import web3 from './web3';

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

const safeQuery = `{
  canSendToAddress
  userAddress
}`;

const safeFields = `
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
    const trustedTokens = senderTokens.reduce((tokenAcc, { address }) => {
      const token = findToken(tokens, address);

      const tokenConnection = connections.find(
        ({ userAddress, canSendToAddress }) => {
          return (
            userAddress === token.safeAddress &&
            canSendToAddress === receiverSafeAddress
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
    }, []);

    // Merge all known data to get a list in the end containing what Token can
    // be sent to whom with what maximum value.
    trustedTokens.forEach((trustedToken) => {
      addEdge({
        from: senderSafeAddress,
        to: receiverSafeAddress,
        tokenAddress: trustedToken.tokenAddress,
        tokenOwner: trustedToken.tokenOwner,
      });
    });
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
