import { performance } from 'perf_hooks';
import workers from './tasks';
import submitJob from './tasks/submitJob';

import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';

import './helpers/env';

import db from './database';
import logger from './helpers/logger';
import tasks from './tasks';
import web3, {
  checkConnection,
  getEventSignature,
  subscribeEvent,
} from './services/web3';
import workers from './tasks';
import {
  getTrustNetworkEdges,
  setTransferMetrics,
  storeEdges,
  writeToFile,
} from './services/transfer';
import { waitUntilGraphIsReady } from './services/graph';

const CRON_NIGHTLY = '0 0 0 * * *';

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

logger.info(`Started workers for: ${Object.keys(workers)}`);

// Listen for blockchain events which might alter the trust limit between users
// in the trust network
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
    const { edges, statistics } = await getTrustNetworkEdges();

    await writeToFile(edges);

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

    await setTransferMetrics([
      {
        name: 'countEdges',
        value: dbStatistics.total,
      },
      {
        name: 'countSafes',
        value: statistics.safes,
      },
      {
        name: 'countTokens',
        value: statistics.tokens,
      },
      {
        name: 'edgesLastAdded',
        value: dbStatistics.added,
      },
      {
        name: 'edgesLastUpdated',
        value: dbStatistics.updated,
      },
      {
        name: 'edgesLastRemoved',
        value: dbStatistics.removed,
      },
      {
        name: 'lastUpdateDuration',
        value: milliseconds,
      },
      {
        name: 'lastBlockNumber',
        value: blockNumber,
      },
      {
        name: 'lastUpdateAt',
        value: Date.now(),
      },
    ]);

    logger.info(
      `Updated edges with ${statistics.safes} safes, ${statistics.connections} connections and ${statistics.tokens} tokens (added ${dbStatistics.added}, updated ${dbStatistics.updated}, removed ${dbStatistics.removed}, ${milliseconds}ms)`,
    );

    // Rebuild again if there is already another update pending
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

logger.info(`Started workers for: ${Object.keys(workers)}`);

const transferSignature = getEventSignature(tokenContract, 'Transfer');
const trustSignature = getEventSignature(hubContract, 'Trust');

function handleTrustChange({ address, topics, transactionHash }) {
  if (topics.includes(transferSignature)) {
    submitJob(
      tasks.syncAddress,
      `syncAddress-transfer-${address}-${Date.now()}`,
      {
        tokenAddress: address,
        type: 'Transfer',
        topics,
        transactionHash,
      },
    );
  } else if (topics.includes(trustSignature)) {
    submitJob(
      tasks.syncAddress,
      `syncAddress-trust-${topics[1]}-${Date.now()}`,
      {
        type: 'Trust',
        topics,
        transactionHash,
      },
    );
  }
}

waitUntilGraphIsReady()
  .then(() => {
    logger.info('Graph node connection has been established successfully');
  })
  .then(() => {
    if (process.env.INITIAL_SYNC) {
      // Run full sync on start. Note that this is a task which is manually
      // executed by setting the env var, as we don't want to run this
      // expensive process every time the worker restarts.
      submitJob(tasks.syncFullGraph, 'syncFullGraph-initial');
      return;
    }

    // Subscribe to events to handle trust graph updates for single addresses
    subscribeEvent(
      hubContract,
      process.env.HUB_ADDRESS,
      'Trust',
      handleTrustChange,
    );
    subscribeEvent(tokenContract, null, 'Transfer', handleTrustChange);

    // Clean up worker queues every night
    submitJob(tasks.cleanup, 'cleanUp-nightly', null, {
      repeat: {
        cron: CRON_NIGHTLY,
      },
    });

    // Upload latest edges .json to S3 every night
    submitJob(tasks.uploadEdgesS3, 'uploadEdgesS3-nightly', null, {
      repeat: {
        cron: CRON_NIGHTLY,
      },
    });

    // Always write edges .json file on start to make sure it exists
    submitJob(tasks.exportEdges, 'exportEdges-initial');
  })
  .catch(() => {
    logger.error('Unable to connect to graph node');
    process.exit(1);
  });
