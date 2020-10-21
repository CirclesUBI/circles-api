import { processor } from './processor';
import { syncAddress } from '../services/queue';
import logger from '../helpers/logger';
import web3 from '../services/web3';
import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';
import { fetchFromGraph } from '../services/graph';
import { safeFields } from '../services/transfer';
import Edge from '../models/edges';
import { minNumberString } from '../helpers/compare';

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

const topicMatchesAddress = (topic, address) => {
  return topic.slice(2) == address.slice(2).toLowerCase();
};

const requestSafe = (safe) => {
  return fetchFromGraph(
    'safes',
    safeFields,
    `where: { id: "${safe.toLowerCase()}"}`,
    0,
    1,
  );
};

const upsert = (edge) => {
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
};

const updateEdge = async (edge, tokenAddress) => {
  let limit;
  try {
    limit = await hubContract.methods
      .checkSendLimit(edge.token, edge.from, edge.to)
      .call();
    const tokenContract = new web3.eth.Contract(TokenContract.abi, tokenAddress);
    let balance = await tokenContract.methods.balanceOf(edge.from).call();
    edge.capacity = Math.floor(
      parseFloat(web3.utils.fromWei(minNumberString(limit, balance), 'ether')),
    );
    await upsert(edge);
  } catch (err) {
    logger.error(
      `Found error with checking sending limit for token of ${edge.token} from ${edge.from} to ${edge.to}`,
    );
    logger.error(err);
    await Edge.destroy({
      where: {
        token: edge.token,
        from: edge.from,
        to: edge.to,
      },
    });
  }
};

const transferProcesser = async (data) => {
  logger.info(`processing as transfer for ${data.id}`);
  const tokenOwner = await hubContract.methods.tokenToUser(data.id).call();
  if (tokenOwner === '0x0000000000000000000000000000000000000000') {
    logger.info(`${data.id} is not a circles token`);
    return;
  }
  const sender = `0x${data.topics[1].slice(26)}`;
  const recipient = `0x${data.topics[2].slice(26)}`;
  let edge = {
    token: tokenOwner,
    from: web3.utils.toChecksumAddress(sender),
    to: tokenOwner,
  };
  await updateEdge(edge, data.id);
  edge = {
    token: tokenOwner,
    from: web3.utils.toChecksumAddress(recipient),
    to: tokenOwner,
  };

  if (
    topicMatchesAddress(sender, tokenOwner) ||
    topicMatchesAddress(recipient, tokenOwner)
  ) {
    // case sending their own token
    let graphData = await requestSafe(tokenOwner);
    graphData = graphData[0];
    if (!graphData) {
      logger.error(
        `safe ${tokenOwner} for job ${data.id} is not registered in graph`,
      );
      return;
    }
    logger.info(
      `Found outgoing addreses ${graphData.outgoingAddresses} while processing job for ${data.id}`,
    );
    return Promise.all(
      graphData.outgoingAddresses.map(async (connectedAddress) => {
        let edge = {
          token: tokenOwner,
          from: tokenOwner,
          to: web3.utils.toChecksumAddress(connectedAddress),
        };
        await updateEdge(edge, data.id);
      }),
    );
  } else {
    // case no trust graph updates needed
    logger.info(`Token owner ${tokenOwner} was not sender or receiver`);
    return;
  }
};

const trustProcessor = async (data) => {
  const recipient = `0x${data.topics[1].slice(26)}`;
  const sender = `0x${data.topics[2].slice(26)}`;
  logger.info(`processing as trust for ${recipient}`);
  const tokenAddress = await hubContract.methods.userToToken(recipient).call();
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    logger.info(`${recipient} is not a circles user`);
    return;
  }
  let edge = {
    token: web3.utils.toChecksumAddress(recipient),
    from: web3.utils.toChecksumAddress(sender),
    to: web3.utils.toChecksumAddress(recipient),
  };
  return updateEdge(edge, tokenAddress);
};

processor(syncAddress, 'Sync trust graph for address').process((job) => {
  logger.info(`beginning work on trust graph for ${job.data.id}`);
  // id is an address, job is either triggered by a trust event or a transfer event
  // if triggered by a transfer, id is a token address, and we must check if it's part of Circles
  // if trust, id is the hub address
  if (job.data.type === 'Transfer') {
    return transferProcesser(job.data);
  } else {
    return trustProcessor(job.data);
  }
});

export default syncAddress;
