import Queue from 'bull';
import { performance } from 'perf_hooks';

import logger from '../helpers/logger';
import processor from './processor';
import { getStoredEdges } from '../services/edgesDatabase';
import { redisUrl, redisOptions } from '../services/redis';
import { writeToFile } from '../services/edgesFile';

const exportEdges = new Queue('Export edges to json file', redisUrl, {
  settings: redisOptions,
});

processor(exportEdges).process(async () => {
  // Measure time of the whole process
  const startTime = performance.now();

  // Get edges from database and write them to the .json file
  const edges = await getStoredEdges({ hasOnlyFileFields: true });
  await writeToFile(edges);

  // Show metrics
  const endTime = performance.now();
  const milliseconds = Math.round(endTime - startTime);

  logger.info(`Written ${edges.length} edges to file in ${milliseconds}ms`);

  return Promise.resolve();
});

export default exportEdges;
