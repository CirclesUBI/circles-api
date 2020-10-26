import Queue from 'bull';
import { performance } from 'perf_hooks';

import logger from '../helpers/logger';
import processor from './processor';
import { getBlockNumber } from '../services/graph';
import { getTrustNetworkEdges, storeEdges } from '../services/transfer';
import { redisUrl, redisLongRunningOptions } from '../services/redis';

const syncFullGraph = new Queue('Sync full trust graph', redisUrl, {
  settings: redisLongRunningOptions,
});

async function rebuildTrustNetwork() {
  const blockNumber = await getBlockNumber();

  if (blockNumber === 0) {
    logger.warn('Found block number 0 from graph, aborting');
    return;
  }

  logger.info(`Syncing trust graph with current block ${blockNumber}`);

  // Measure time of the whole process
  const startTime = performance.now();

  try {
    const { edges, statistics } = await getTrustNetworkEdges();

    logger.info(`Finished getting trust network edges`);

    // Put trust network into database to cache it there
    const dbStatistics = await storeEdges(edges);

    logger.info(`Finished storing edges edges`);

    const endTime = performance.now();
    const milliseconds = Math.round(endTime - startTime);

    logger.info(
      `Updated edges with ${statistics.safes} safes, ${statistics.connections} connections and ${statistics.tokens} tokens (added ${dbStatistics.added}, updated ${dbStatistics.updated}, removed ${dbStatistics.removed}, ${milliseconds}ms)`,
    );
    return true;
  } catch (error) {
    logger.error(`Worker failed [${error.message}]`);
    throw error;
  }
}

processor(syncFullGraph).process(async () => {
  return await rebuildTrustNetwork();
});

export default syncFullGraph;
