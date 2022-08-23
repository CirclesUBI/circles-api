import Queue from 'bull';
import { performance } from 'perf_hooks';

import logger from '../helpers/logger';
import processor from './processor';
import { redisUrl, redisOptions } from '../services/redis';
import { writeToFile } from '../services/edgesFile';

const exportEdges = new Queue('Export edges to csv', redisUrl, {
  settings: redisOptions,
});

processor(exportEdges).process(async () => {
  // Measure time of the whole process
  const startTime = performance.now();

  try {
    // Write edges.csv
    const lines = await writeToFile();

    // End time
    const endTime = performance.now();
    const milliseconds = Math.round(endTime - startTime);

    // Show metrics
    logger.info(`Written ${lines} lines edges.csv in ${milliseconds}ms`);

    return Promise.resolve();
  } catch (error) {
    logger.error(`Export edges failed [${error.message}]`);
    throw error;
  }
});

export default exportEdges;
