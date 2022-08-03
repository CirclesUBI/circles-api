import path from 'path';
import web3 from './web3';
import fs from 'fs';
const copyTo = require('pg-copy-streams').to;

import db from '../database';
import { EDGES_FILE_PATH, EDGES_DIRECTORY_PATH } from '../constants';

// Export from PostgresDB to CSV file
async function exportCSV(file) {
  return new Promise((resolve, reject) => {
    db.connectionManager.getConnection().then((client) => {
      let data = '';
      const stream = fs.createWriteStream(file);
      const output = client.query(
        copyTo(
          `COPY  edges ("from",  "to", "token", "capacity") TO STDOUT WITH (FORMAT CSV)`,
        ),
      );
      stream.setDefaultEncoding('utf8');
      stream.on('error', (err) => {
        db.connectionManager.releaseConnection(client);
        reject('Error in DB connection. Error:', err);
      });

      stream.on('finish', () => {
        db.connectionManager.releaseConnection(client);
        resolve(data);
      });
      output.on('data', (chunk) => (data += chunk)).pipe(stream);
    });
  });
}

export function checkFileExists() {
  return fs.existsSync(EDGES_FILE_PATH);
}

// Store edges into .csv file for pathfinder
export async function writeToFile(
  tmpFileKey = web3.utils.randomHex(16).slice(2),
) {
  try {
    // Check if `edges-data` folder exists and create it otherwise
    if (!fs.existsSync(EDGES_DIRECTORY_PATH)) {
      fs.mkdirSync(EDGES_DIRECTORY_PATH);
    }

    // Create temporary file path first
    const tmpFilePath = path.join(
      EDGES_DIRECTORY_PATH,
      `edges-tmp-${tmpFileKey}.csv`,
    );
    // Create empty file
    fs.closeSync(fs.openSync(tmpFilePath, 'w'));
    await exportCSV(tmpFilePath);
    fs.renameSync(tmpFilePath, EDGES_FILE_PATH);
  } catch (error) {
    throw new Error('Could not create csv file. Error:t' + error);
  }
}
