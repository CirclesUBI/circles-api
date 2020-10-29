import HubContract from 'circles-contracts/build/contracts/Hub.json';

import logger from '../helpers/logger';
import web3 from './web3';
import { ZERO_ADDRESS } from '../constants';
import { fetchFromGraph } from './graph';
import { updateEdge } from './edgesUpdate';

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

async function requestSafe(safe) {
  const safeQuery = `{
    canSendToAddress
    userAddress
  }`;

  const safeFields = `
    outgoing ${safeQuery}
    incoming ${safeQuery}
  `;

  return await fetchFromGraph(
    'safes',
    safeFields,
    `where: { id: "${safe.toLowerCase()}" }`,
  );
}

async function updateAllWhoTrustToken({ tokenOwner, tokenAddress, address }) {
  // Get more information from the graph about the current trust connections of
  // `tokenOwner`
  const [tokenOwnerData] = await requestSafe(tokenOwner);
  if (!tokenOwnerData) {
    logger.error(`Safe ${tokenOwner} for job is not registered in graph`);
    return;
  }

  logger.info(
    `Found ${tokenOwnerData.outgoing.length} outgoing addresses while processing job for Safe ${tokenOwner}`,
  );

  // c) Go through everyone who trusts this token, and update the limit from
  // the `sender` to them.
  await Promise.all(
    tokenOwnerData.outgoing.map(async (trustObject) => {
      const canSendToAddress = web3.utils.toChecksumAddress(
        trustObject.canSendToAddress,
      );

      await updateEdge(
        {
          token: tokenOwner,
          from: canSendToAddress,
          to: address,
        },
        tokenAddress,
      );

      await updateEdge(
        {
          token: tokenOwner,
          from: address,
          to: canSendToAddress,
        },
        tokenAddress,
      );
    }),
  );
}

export async function processTransferEvent(data) {
  const [sender, recipient] = addressesFromTopics(data.topics);

  // Ignore gas fee payments to relayer
  if (recipient === process.env.TX_SENDER_ADDRESS) {
    return false;
  }

  const tokenAddress = web3.utils.toChecksumAddress(data.tokenAddress);
  logger.info(`Processing transfer for ${tokenAddress}`);

  const tokenOwner = await hubContract.methods.tokenToUser(tokenAddress).call();
  if (tokenOwner === ZERO_ADDRESS) {
    logger.info(`${tokenAddress} is not a Circles token`);
    return false;
  }

  // Handle UBI payouts
  if (sender === ZERO_ADDRESS) {
    await updateAllWhoTrustToken({
      address: recipient,
      tokenAddress,
      tokenOwner,
    });
    return true;
  }

  // a) Update the edge between the `sender` safe and the `tokenOwner` safe.
  // The limit will decrease here as the `sender` will loose tokens the
  // `tokenOwner` accepts as its their own token. This update will be ignored
  // if the `tokenOwner` is also the `sender`.
  await updateEdge(
    {
      token: tokenOwner,
      from: sender,
      to: tokenOwner,
    },
    tokenAddress,
  );

  // b) Update the edge between the `recipient` safe and the `tokenOwner` safe.
  // The limit will increase here as the `receiver` will get more tokens the
  // `tokenOwner` accepts as its their own token. This update will be ignored
  // if the `tokenOwner` is also the `recipient`.
  await updateEdge(
    {
      token: tokenOwner,
      from: recipient,
      to: tokenOwner,
    },
    tokenAddress,
  );

  // c) Go through everyone who trusts this token, and update the limit from
  // the `sender` to them.
  await updateAllWhoTrustToken({
    address: sender,
    tokenAddress,
    tokenOwner,
  });

  return true;
}

export async function processTrustEvent(data) {
  const [truster, tokenOwner] = addressesFromTopics(data.topics);

  logger.info(`Processing trust for ${truster}`);

  const tokenAddress = await hubContract.methods.userToToken(tokenOwner).call();
  if (tokenAddress === ZERO_ADDRESS) {
    logger.info(`${tokenOwner} is not a Circles user`);
    return false;
  }

  // a) Update the edge between `tokenOwner` and the `truster`, as the latter
  // accepts their token now.
  await updateEdge(
    {
      token: tokenOwner,
      from: tokenOwner,
      to: truster,
    },
    tokenAddress,
  );

  // b) Go through everyone else who trusts this token, and update the limit
  // from the `truster` to them as well, as they can send this token to the
  // `truster`.
  await updateAllWhoTrustToken({
    address: truster,
    tokenAddress,
    tokenOwner,
  });

  return true;
}
