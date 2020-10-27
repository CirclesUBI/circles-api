import Queue from 'bull';

import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';

import Edge from '../models/edges';
import logger from '../helpers/logger';
import processor from './processor';
import web3 from '../services/web3';
import { fetchFromGraph } from '../services/graph';
import { minNumberString } from '../helpers/compare';
import { redisUrl, redisOptions } from '../services/redis';
import { safeFields } from '../services/transfer';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const syncAddress = new Queue('Sync trust graph for address', redisUrl, {
  settings: redisOptions,
});

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

function topicMatchesAddress(topic, address) {
  return topic.slice(2) === address.slice(2).toLowerCase();
}

async function requestSafe(safe) {
  return fetchFromGraph(
    'safes',
    safeFields,
    `where: { id: "${safe.toLowerCase()}" }`,
  );
}

async function upsert(edge) {
  if (edge.capacity === 0) {
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

async function updateEdge(edge, tokenAddress) {
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

async function processTransfer(data) {
  const tokenAddress = web3.utils.toChecksumAddress(data.tokenAddress);

  logger.info(`Processing transfer for ${tokenAddress}`);

  const tokenOwner = await hubContract.methods.tokenToUser(tokenAddress).call();
  if (tokenOwner === ZERO_ADDRESS) {
    logger.info(`${tokenAddress} is not a Circles token`);
    return;
  }

  const sender = `0x${data.topics[1].slice(26)}`;
  const recipient = `0x${data.topics[2].slice(26)}`;

  // Skip UBI payout transfer from Hub
  if (sender !== ZERO_ADDRESS) {
    await updateEdge(
      {
        token: tokenOwner,
        from: web3.utils.toChecksumAddress(sender),
        to: tokenOwner,
      },
      tokenAddress,
    );
  }

  await updateEdge(
    {
      token: tokenOwner,
      from: web3.utils.toChecksumAddress(recipient),
      to: tokenOwner,
    },
    tokenAddress,
  );

  // Is user sending their own token?
  if (
    topicMatchesAddress(sender, tokenOwner) ||
    topicMatchesAddress(recipient, tokenOwner)
  ) {
    const [graphData] = await requestSafe(tokenOwner);

    if (!graphData) {
      logger.error(
        `Safe ${tokenOwner} for job ${data.id} is not registered in graph`,
      );
      return;
    }

    logger.info(
      `Found outgoing addreses ${graphData.outgoingAddresses} while processing job for Safe ${tokenOwner}`,
    );

    return Promise.all(
      graphData.outgoingAddresses.map((connectedAddress) => {
        return updateEdge(
          {
            token: tokenOwner,
            from: tokenOwner,
            to: web3.utils.toChecksumAddress(connectedAddress),
          },
          tokenAddress,
        );
      }),
    );
  } else {
    // No trust graph updates needed
    logger.info(`Token owner ${tokenOwner} was not sender or receiver`);
  }
}

async function processTrust(data) {
  const recipient = `0x${data.topics[1].slice(26)}`;
  const sender = `0x${data.topics[2].slice(26)}`; // recipient of trust is the sender of tokens

  logger.info(`Processing trust for ${recipient}`);

  const tokenAddress = await hubContract.methods.userToToken(sender).call();
  if (tokenAddress === ZERO_ADDRESS) {
    logger.info(`${sender} is not a Circles user`);
    return;
  }

  return updateEdge(
    {
      token: web3.utils.toChecksumAddress(sender),
      from: web3.utils.toChecksumAddress(sender),
      to: web3.utils.toChecksumAddress(recipient),
    },
    tokenAddress,
  );
}

processor(syncAddress).process(async (job) => {
  // `id` is an address, job is either triggered by a trust event or a transfer
  // event. If triggered by a transfer, id is a token address, and we must
  // check if it's part of Circles. If triggered by a trust event, id is the
  // hub address
  if (job.data.type === 'Transfer') {
    return await processTransfer(job.data);
  } else {
    return await processTrust(job.data);
  }
});

export default syncAddress;
