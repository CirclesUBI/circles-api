import HubContract from 'circles-contracts/build/contracts/Hub.json';

import EdgeUpdateManager from './edgesUpdate';
import logger from '../helpers/logger';
import web3 from './web3';
import { ZERO_ADDRESS } from '../constants';
import core from './core';
import { queryEdges } from './edgesDatabase';

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

function addressesFromTopics(topics) {
  return [
    web3.utils.toChecksumAddress(`0x${topics[1].slice(26)}`),
    web3.utils.toChecksumAddress(`0x${topics[2].slice(26)}`),
  ];
}

async function requestSafe(safeAddress) {
  const query = `{
      safe(id: "${safeAddress.toLowerCase()}") {
        outgoing {
          canSendToAddress
          userAddress
        }
        incoming {
          canSendToAddress
          userAddress
        }
      }
    }`;

  const data = await core.utils.requestGraph({
    query,
  });

  if (!data || !('safe' in data)) {
    throw new Error(`Could not fetch graph data for Safe ${safeAddress}`);
  }

  return data.safe;
}

async function updateAllWhoTrustToken(
  { tokenOwner, tokenAddress, address, tokenOwnerData },
  edgeUpdateManager,
) {
  logger.info(
    `Found ${tokenOwnerData.outgoing.length} outgoing addresses while processing job for Safe ${tokenOwner}`,
  );

  await Promise.all(
    tokenOwnerData.outgoing.map(async (trustObject) => {
      const canSendToAddress = web3.utils.toChecksumAddress(
        trustObject.canSendToAddress,
      );

      // address -> canSendToAddress
      await edgeUpdateManager.updateEdge(
        {
          token: tokenOwner,
          from: canSendToAddress,
          to: address,
        },
        tokenAddress,
      );
      // canSendToAddress -> address
      // await edgeUpdateManager.updateEdge(
      //   {
      //     token: tokenOwner,
      //     from: canSendToAddress,
      //     to: address,
      //   },
      //   tokenAddress,
      // );
    }),
  );
}

export async function processTransferEvent(data) {
  const edgeUpdateManager = new EdgeUpdateManager();
  const [sender, recipient] = addressesFromTopics(data.topics);

  const tokenAddress = web3.utils.toChecksumAddress(data.tokenAddress);
  logger.info(`Processing transfer for ${tokenAddress}`);

  const tokenOwner = await hubContract.methods.tokenToUser(tokenAddress).call();
  if (tokenOwner === ZERO_ADDRESS) {
    logger.info(`${tokenAddress} is not a Circles token`);
    return false;
  }

  // We don't store edges going to the relayer, but we still can't skip processing the rest of
  // the possible paths, because if the user paid with their own token, other trust limits have updated
  if (recipient !== process.env.TX_SENDER_ADDRESS) {
    // b) Update the edge between the `recipient` safe and the `tokenOwner` safe.
    // The limit will increase here as the `receiver` will get more tokens the
    // `tokenOwner` accepts as its their own token. This update will be ignored
    // if the `tokenOwner` is also the `recipient`.
    await edgeUpdateManager.updateEdge(
      {
        token: tokenOwner,
        from: recipient,
        to: tokenOwner,
      },
      tokenAddress,
    );
  }

  // We don't store edges going from the zero address
  if (sender !== ZERO_ADDRESS) {
    // a) Update the edge between the `sender` safe and the `tokenOwner` safe.
    // The limit will decrease here as the `sender` will loose tokens the
    // `tokenOwner` accepts as its their own token. This update will be ignored
    // if the `tokenOwner` is also the `sender`.
    await edgeUpdateManager.updateEdge(
      {
        token: tokenOwner,
        from: sender,
        to: tokenOwner,
      },
      tokenAddress,
    );
  }

  // Get more information from the graph about the current trust connections of
  // `tokenOwner`
  let tokenOwnerData;
  try {
    tokenOwnerData = await requestSafe(tokenOwner);
  } catch (err) {
    logger.error(`Safe ${tokenOwner} for job is not registered in graph`);
    logger.error(err);
    return;
  }

  // c) Go through everyone who trusts this token, and update the limit from
  // the `recipient` to them.
  await updateAllWhoTrustToken(
    {
      address: recipient,
      tokenAddress,
      tokenOwner,
      tokenOwnerData,
    },
    edgeUpdateManager,
  );

  // d) Go through everyone who trusts this token, and update the limit from
  // the `sender` to them.
  await updateAllWhoTrustToken(
    {
      address: sender,
      tokenAddress,
      tokenOwner,
      tokenOwnerData,
    },
    edgeUpdateManager,
  );

  // e) If someone is sending or receiving their own token, the balance of their own
  // token has changed, and therefor the trust limits for all the tokens they accept
  // must be updated
  if (sender === tokenOwner || recipient === tokenOwner) {
    await Promise.all(
      tokenOwnerData.incoming.map(async (trustObject) => {
        const userTokenAddress = await hubContract.methods
          .userToToken(trustObject.userAddress)
          .call();
        if (tokenAddress === ZERO_ADDRESS) {
          logger.info(`${sender} is not a Circles user`);
          return;
        }

        const user = web3.utils.toChecksumAddress(trustObject.userAddress);
        return edgeUpdateManager.updateEdge(
          {
            token: user,
            from: user,
            to: tokenOwner,
          },
          userTokenAddress,
        );
      }),
    );

    // NOTE: run all tests without this clause
    await Promise.all(
      tokenOwnerData.outgoing.map(async (trustObject) => {
        console.log(trustObject)
        const canSendToAddress = web3.utils.toChecksumAddress(
          trustObject.canSendToAddress,
        );
        console.log(`checking how much ${tokenOwner} token user ${canSendToAddress} can send to ${tokenOwner}`);
        return edgeUpdateManager.updateEdge(
          {
            token: tokenOwner,
            from: canSendToAddress,
            to: tokenOwner,
          },
          tokenAddress,
        );
      }),
    );
  }

  return true;
}

export async function processTrustEvent(data) {
  const edgeUpdateManager = new EdgeUpdateManager();

  const [truster, tokenOwner] = addressesFromTopics(data.topics);

  logger.info(`Processing trust for ${truster}`);

  const tokenAddress = await hubContract.methods.userToToken(tokenOwner).call();
  if (tokenAddress === ZERO_ADDRESS) {
    logger.info(`${tokenOwner} is not a Circles user`);
    return false;
  }

  // a) Update the edge between `tokenOwner` and the `truster`, as the latter
  // accepts their token now.
  await edgeUpdateManager.updateEdge(
    {
      token: tokenOwner,
      from: tokenOwner,
      to: truster,
    },
    tokenAddress,
  );

  // b) Go through everyone else who holds this token, and update the path
  // from the `truster` to them as well, as they can send this token to the
  // `truster`.

  return true;
}
