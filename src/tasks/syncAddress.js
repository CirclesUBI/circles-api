import Queue from 'bull';

import processor from './processor';
import submitJob from './submitJob';
import tasks from './';
import {
  processTrustEvent,
  processTransferEvent,
} from '../services/edgesFromEvents';
import { redisUrl, redisOptions } from '../services/redis';
<<<<<<< HEAD
=======
import { safeFields } from '../services/transfer';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TX_SENDER_ADDRESS = process.env.TX_SENDER_ADDRESS;
>>>>>>> Extended trust graph and ubi working

const syncAddress = new Queue('Sync trust graph for address', redisUrl, {
  settings: redisOptions,
});

processor(syncAddress).process(async (job) => {
  let isSuccessful = false;

  // This job is either triggered by a trust event or a transfer event.
  if (job.data.type === 'Transfer') {
    isSuccessful = await processTransferEvent(job.data);
  } else {
    isSuccessful = await processTrustEvent(job.data);
  }

  // Always write edges .json file afterwards
  if (isSuccessful) {
    submitJob(
      tasks.exportEdges,
      `exportEdges-after-chain-event-${job.data.transactionHash}`,
    );
  }
});

export default syncAddress;
