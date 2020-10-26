import Queue from 'bull';
import fastJsonStringify from 'fast-json-stringify';
import fs from 'fs';
import { performance } from 'perf_hooks';

import logger from '../helpers/logger';
import processor from './processor';
import {
  EDGES_FILE_PATH,
  EDGES_TMP_FILE_PATH,
  getStoredEges,
} from './services/transfer';
import { redisUrl, redisOptions } from '../services/redis';

const stringify = fastJsonStringify({
  title: 'Circles Edges Schema',
  type: 'array',
  properties: {
    from: {
      type: 'string',
    },
    to: {
      type: 'string',
    },
    token: {
      type: 'string',
    },
    capacity: {
      type: 'string',
    },
  },
});

const exportEdges = new Queue('Export edges to json file', redisUrl, {
  settings: redisOptions,
});

// Store edges into .json file for pathfinder executable
async function writeToFile(edges) {
  return new Promise((resolve, reject) => {
    fs.writeFile(EDGES_TMP_FILE_PATH, stringify(edges), (error) => {
      if (error) {
        reject(
          new Error(`Could not write to ${EDGES_TMP_FILE_PATH} file: ${error}`),
        );
      } else {
        fs.renameSync(EDGES_TMP_FILE_PATH, EDGES_FILE_PATH);
        resolve();
      }
    });
  });
}

processor(exportEdges).process(async () => {
  // Measure time of the whole process
  const startTime = performance.now();

  // Get edges from database and write them to the .json file
  const edges = await getStoredEges();
  await writeToFile(edges);

  // Show metrics
  const endTime = performance.now();
  const milliseconds = Math.round(endTime - startTime);

  logger.info(`Written ${edges.length} edges to file in ${milliseconds}ms`);
});

export default exportEdges;
