import fs from 'fs';
// import child_process from 'child_process';

import exportCSV from '../helpers/exportCSV';
import { EDGES_FILE_PATH, EDGES_DIRECTORY_PATH } from '../constants';
// import logger from '../helpers/logger';

export function checkFileExists() {
  return fs.existsSync(EDGES_FILE_PATH);
}

// Store edges into .csv file for pathfinder executable
export async function writeToFile() {
  return new Promise((resolve, reject) => {
    // Check if `edges-data` folder exists and create it otherwise
    if (!fs.existsSync(EDGES_DIRECTORY_PATH)) {
      fs.mkdirSync(EDGES_DIRECTORY_PATH);
    }
    // Create edges.csv file for the export from the db
    fs.open(EDGES_FILE_PATH, 'w', (err, file) => {
      if (err) {
        reject(
          new Error(`Could not create file ${EDGES_FILE_PATH} file: ${err}`),
        );
      } else {
        // export CSV from Database
        exportCSV();
        resolve();
      }
    });
  });
}
