import Queue from 'bull';
import { performance } from 'perf_hooks';

import EdgeUpdateManager from '../services/edgesUpdate';
import logger from '../helpers/logger';
import processor from './processor';
import submitJob from './submitJob';
import tasks from './';
import { getBlockNumber } from '../services/graph';
import { getTrustNetworkEdges } from '../services/edgesFromGraph';
import { redisUrl, redisLongRunningOptions } from '../services/redis';

const syncFullGraph = new Queue('Sync full trust graph', redisUrl, {
  settings: redisLongRunningOptions,
});

async function rebuildTrustNetwork() {
  const edgeUpdateManager = new EdgeUpdateManager();
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

    logger.info(
      `Finished getting trust network edges (${edges.length} entities). Start updating capacities.`,
    );

    for await (const edge of edges) {
      await edgeUpdateManager.updateEdge(
        {
          ...edge,
          token: edge.tokenOwner,
        },
        edge.tokenAddress,
      );
    }

    const endTime = performance.now();
    const milliseconds = Math.round(endTime - startTime);

    const checkedEdges = Object.keys(edgeUpdateManager.checkedEdges).length;
    logger.info(
      `Updated ${checkedEdges} edges with ${statistics.safes} safes, ${statistics.connections} connections and ${statistics.tokens} tokens (${milliseconds}ms)`,
    );
  } catch (error) {
    logger.error(`Worker failed [${error.message}]`);
    throw error;
  }
}

processor(syncFullGraph).process(async () => {
  await rebuildTrustNetwork();

  // Always write edges .csv file afterwards
  submitJob(tasks.exportEdges, `exportEdges-after-fullSync`);
});

export default syncFullGraph;
