import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';

import './helpers/env';

import db from './database';
import logger from './helpers/logger';
import tasks from './tasks';
import submitJob from './tasks/submitJob';
import web3, {
  checkConnection,
  getEventSignature,
  subscribeEvent,
} from './services/web3';
import { waitUntilGraphIsReady } from './services/graph';

const CRON_NIGHTLY = '0 0 0 * * *';
// CRON_WEEKLY: "At 12:00 on Friday".
const CRON_WEEKLY = '0 0 13 * * 5';

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

// Listen for blockchain events which might alter the trust limit between users
// in the trust network
const hubContract = new web3.eth.Contract(HubContract.abi);
const tokenContract = new web3.eth.Contract(TokenContract.abi);

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

    // Run full sync every week
    submitJob(tasks.syncFullGraph, 'syncFullGraph-weekly', null, {
      repeat: {
        cron: CRON_WEEKLY,
      },
    });

    // Always write edges.json file on start to make sure it exists
    submitJob(tasks.exportEdges, 'exportEdges-initial');
  })
  .catch(() => {
    logger.error('Unable to connect to graph node');
    process.exit(1);
  });
