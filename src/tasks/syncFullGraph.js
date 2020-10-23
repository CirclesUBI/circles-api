import { performance } from 'perf_hooks';
import { processor } from './processor';
import { syncFullGraph } from '../services/queue';
import logger from '../helpers/logger';
import {
  getTrustNetworkEdges,
  setTransferMetrics,
  storeEdges,
} from '../services/transfer';
import { getBlockNumber } from '../services/graph';

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
    return true;
  } catch (error) {
    logger.error(`Worker failed [${error.message}]`);
    throw error;
  }
}

processor(syncFullGraph, 'Sync full trust graph').process((job) => {
  logger.info(`beginning work on sync full trust graph for ${job.id}`);
  return rebuildTrustNetwork();
});

export default syncFullGraph;
