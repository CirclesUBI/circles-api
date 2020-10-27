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
const TX_SENDER_ADDRESS = process.env.TX_SENDER_ADDRESS;

const syncAddress = new Queue('Sync trust graph for address', redisUrl, {
  settings: redisOptions,
});

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

function addressesFromTopics(topics) {
  const recipient = web3.utils.toChecksumAddress(`0x${topics[1].slice(26)}`);
  const sender = web3.utils.toChecksumAddress(`0x${topics[2].slice(26)}`);

  return { recipient, sender };
}

async function requestSafe(safe) {
  return fetchFromGraph(
    'safes',
    safeFields,
    `where: { id: "${safe.toLowerCase()}" }`,
  );
}

async function upsert(edge) {
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

async function updateEdge(edge, tokenAddress) {
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

async function processTransfer(data) {
  const tokenAddress = web3.utils.toChecksumAddress(data.tokenAddress);

  logger.info(`Processing transfer for ${tokenAddress}`);

  const tokenOwner = await hubContract.methods.tokenToUser(tokenAddress).call();
  if (tokenOwner === ZERO_ADDRESS) {
    logger.info(`${tokenAddress} is not a Circles token`);
    return;
  }

  const { sender, recipient } = addressesFromTopics(data.topics);

  // Skip UBI payout transfer from Hub
  if (sender !== ZERO_ADDRESS) {
    await updateEdge(
      {
        token: tokenOwner,
        from: sender,
        to: tokenOwner,
      },
      tokenAddress,
    );
  }

  // Skip gas fee payments to the relayer
  if (recipient !== TX_SENDER_ADDRESS) {
    await updateEdge(
      {
        token: tokenOwner,
        from: recipient,
        to: tokenOwner,
      },
      tokenAddress,
    );
  }

  const [graphData] = await requestSafe(tokenOwner);

  if (!graphData) {
    logger.error(
      `Safe ${tokenOwner} for job ${data.id} is not registered in graph`,
    );
    return;
  }

  // Go through everyone trusts this token, and make an edge
  await Promise.all(
    graphData.outgoing.map(async (trustObject) => {
      return await updateEdge(
        {
          token: tokenOwner,
          from: sender,
          to: web3.utils.toChecksumAddress(trustObject.canSendToAddress),
        },
        tokenAddress,
      );
    }),
  );

  // Is user sending their own token?
  if (sender === tokenOwner || recipient === tokenOwner) {
    logger.info(
      `Found ${graphData.incoming.length} incoming addreses while processing job for Safe ${tokenOwner}`,
    );

    return Promise.all(
      graphData.incoming.map(async (trustObject) => {
        const tokenAddress = await hubContract.methods
          .userToToken(trustObject.userAddress)
          .call();
        if (tokenAddress === ZERO_ADDRESS) {
          logger.info(`${sender} is not a Circles user`);
          return;
        }

        return await updateEdge(
          {
            token: web3.utils.toChecksumAddress(trustObject.userAddress),
            from: web3.utils.toChecksumAddress(trustObject.userAddress),
            to: tokenOwner,
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
  // Recipient of trust is the sender of tokens
  const { sender, recipient } = addressesFromTopics(data.topics);

  logger.info(`Processing trust for ${recipient}`);

  const tokenAddress = await hubContract.methods.userToToken(sender).call();
  if (tokenAddress === ZERO_ADDRESS) {
    logger.info(`${sender} is not a Circles user`);
    return;
  }

  return updateEdge(
    {
      token: sender,
      from: sender,
      to: recipient,
    },
    tokenAddress,
  );
}

processor(syncAddress).process(async (job) => {
  // This job is either triggered by a trust event or a transfer event.
  if (job.data.type === 'Transfer') {
    return await processTransfer(job.data);
  } else {
    return await processTrust(job.data);
  }
});

export default syncAddress;
