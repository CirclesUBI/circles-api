import { performance } from 'perf_hooks';

import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';

import './helpers/env';

import db from './database';
import logger from './helpers/logger';
import web3, {
  checkConnection,
  getEventSignature,
  subscribeEvent,
} from './services/web3';
import { getTrustNetworkEdges, storeEdges } from './services/transfer';
import { waitUntilGraphIsReady, waitForBlockNumber } from './services/graph';

// Connect with postgres database
db.authenticate()
  .then(() => {
    logger.info('Database connection has been established successfully');
  })
  .catch(() => {
    logger.error('Unable to connect to database');
    process.exit(1);
  });

// Check blockchain connection
checkConnection()
  .then((num) => {
    logger.info(`Blockchain connection established, block height is ${num}`);
  })
  .catch(() => {
    logger.error('Unable to connect to blockchain');
    process.exit(1);
  });

// Listen for blockchain events which might alter the trust
// limit between users in the trust network
const hubContract = new web3.eth.Contract(HubContract.abi);
const tokenContract = new web3.eth.Contract(TokenContract.abi);

let isUpdatePending = false;
let lastTrustChangeAt = 0;
let lastUpdateAt = 0;
let knownTokens = [];

async function rebuildTrustNetwork(blockNumber) {
  if (isUpdatePending) {
    return;
  }
  isUpdatePending = true;

  // Measure time of the whole process
  const startTime = performance.now();

  try {
    // Wait until graph indexed the last block number
    await waitForBlockNumber(blockNumber);

    const { edges, statistics } = await getTrustNetworkEdges();

    // Store all known tokens to identify transfer events
    knownTokens = edges
      .reduce((acc, edge) => {
        if (!acc.includes(edge.token)) {
          acc.push(edge.token);
        }
        return acc;
      }, [])
      .sort();

    // Put trust network into database to cache it there
    const dbStatistics = await storeEdges(edges);

    const endTime = performance.now();
    const milliseconds = Math.round(endTime - startTime);

    logger.info(
      `Updated edges with ${statistics.safes} safes, ${statistics.connections} connections and ${statistics.tokens} tokens (added ${dbStatistics.added}, updated ${dbStatistics.updated}, removed ${dbStatistics.removed}, ${milliseconds}ms)`,
    );

    // Rebuild again if there is already another update
    // pending
    isUpdatePending = false;
    lastUpdateAt = Date.now();
    if (lastTrustChangeAt > lastUpdateAt) {
      rebuildTrustNetwork();
    }
  } catch (error) {
    isUpdatePending = false;
    logger.error(`Worker failed [${error.message}]`);
  }
}

const transferSignature = getEventSignature(tokenContract, 'Transfer');

function handleTrustChange({ blockNumber, address, topics }) {
  // Check if ERC20 Transfer events came from a known Circles token address
  if (
    (topics.includes(transferSignature) && knownTokens.includes(address)) ||
    !topics.includes(transferSignature)
  ) {
    lastTrustChangeAt = Date.now();
    rebuildTrustNetwork(blockNumber);
  }
}

waitUntilGraphIsReady()
  .then(() => {
    logger.info('Graph node connection has been established successfully');
    // Always rebuild trust network after first start
    return rebuildTrustNetwork(0);
  })
  .then(() => {
    subscribeEvent(
      hubContract,
      process.env.HUB_ADDRESS,
      'Signup',
      handleTrustChange,
    );
    subscribeEvent(
      hubContract,
      process.env.HUB_ADDRESS,
      'Trust',
      handleTrustChange,
    );
    subscribeEvent(
      hubContract,
      process.env.HUB_ADDRESS,
      'HubTransfer',
      handleTrustChange,
    );
    subscribeEvent(tokenContract, null, 'Transfer', handleTrustChange);
  })
  .catch(() => {
    logger.error('Unable to connect to graph node');
    process.exit(1);
  });
