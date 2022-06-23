import fs from 'fs';
import path from 'path';

import child_process from 'child_process';
import web3 from './web3';
import {
  EDGES_BINARY_PATH,
  PATHFINDER_FILE_PATH,
  EDGES_FILE_PATH,
  EDGES_DIRECTORY_PATH,
} from '../constants';
import arrayToCSV from '../helpers/dataConversions';
import logger from '../helpers/logger';

export function checkFileExists() {
  return fs.existsSync(EDGES_FILE_PATH);
}

// Store edges into .csv file for pathfinder executable
export async function writeToFile(
  edges,
  tmpFileKey = web3.utils.randomHex(16).slice(2),
) {
  return new Promise((resolve, reject) => {
    // Check if `edges-data` folder exists and create it otherwise
    if (!fs.existsSync(EDGES_DIRECTORY_PATH)) {
      fs.mkdirSync(EDGES_DIRECTORY_PATH);
    }

    // Write to temporary file first
    const tmpFilePath = path.join(
      EDGES_DIRECTORY_PATH,
      `edges.csv-tmp-${tmpFileKey}`,
    );

    fs.writeFile(tmpFilePath, arrayToCSV(edges), (error) => {
      if (error) {
        reject(new Error(`Could not write to ${tmpFilePath} file: ${error}`));
      } else {
        // Finally rename it to destination file
        fs.renameSync(tmpFilePath, EDGES_FILE_PATH);
        child_process.exec(
          `${PATHFINDER_FILE_PATH} --edgesCSVToBin  ${EDGES_FILE_PATH} ${EDGES_BINARY_PATH}`,
          (error, stdout, stderr) => {
            if (error) {
              logger.error(`Pathfinder execution error: ${error}`);
              return;
            }
            logger.error(stderr);
          },
        );
        resolve();
      }
    });
  });
}
