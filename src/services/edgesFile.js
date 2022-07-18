import path from 'path';
import web3 from './web3';
import fs from 'fs';
const copyTo = require('pg-copy-streams').to;

import db from '../database';
import { EDGES_FILE_PATH, EDGES_DIRECTORY_PATH } from '../constants';
import logger from '../helpers/logger';

async function exportCSV(tmpFilePath) {
  return new Promise((resolve, reject) => {
    db.connectionManager.getConnection().then((client) => {
      let data = '';
      const stream = client.query(
        copyTo(
          `COPY  edges ("from",  "to", "token", "capacity") TO '${tmpFilePath}' WITH (FORMAT CSV)`,
        ),
      );
      stream.setEncoding('utf8');
      stream.on('error', (err) => {
        db.connectionManager.releaseConnection(client);
        reject(err);
      });
      stream.on('end', () => {
        db.connectionManager.releaseConnection(client);
        resolve(data);
      });
      stream.on('data', (chunk) => (data += chunk));
    });
  });
}

export function checkFileExists() {
  return fs.existsSync(EDGES_FILE_PATH);
}

// Store edges into .csv file for pathfinder executable
export async function writeToFile() {
  const tmpFileKey = web3.utils.randomHex(16).slice(2);
  // Check if `edges-data` folder exists and create it otherwise
  if (!fs.existsSync(EDGES_DIRECTORY_PATH)) {
    fs.mkdirSync(EDGES_DIRECTORY_PATH);
  }
  // Write to temporary file first
  const tmpFilePath = path.join(
    EDGES_DIRECTORY_PATH,
    `edges.json-tmp-${tmpFileKey}`,
  );
  fs.open(tmpFilePath, 'w', (err, file) => {
    if (err) {
      throw new Error(`Could not write to ${tmpFilePath} file: ${err}`);
    }
  });
  await exportCSV(tmpFilePath);
  fs.renameSync(tmpFilePath, EDGES_FILE_PATH);
}
