import path from 'path';
import web3 from './web3';
import fs from 'fs';
const copyTo = require('pg-copy-streams').to;

import db from '../database';
import { EDGES_FILE_PATH, EDGES_DIRECTORY_PATH } from '../constants';

function exportCSV(tmpFilePath) {
  console.log(' 1. IN exportCSV file to' + tmpFilePath);
  db.connectionManager.getConnection().then((client) => {
    // let data = '';
    const stream = fs.createWriteStream(tmpFilePath);

    const output = client.query(
      copyTo(
        `COPY  edges ("from",  "to", "token", "capacity") TO STDOUT WITH (FORMAT CSV)`,
      ),
    );

    // stream.on('data', (chunk) => (data += chunk));
    output.pipe(stream);
    // console.log('2. after processed export csv');
    stream.on('error', (err) => {
      console.log('error in db connection', err);
      db.connectionManager.releaseConnection(client);
    });
    stream.on('finish', () => {
      console.log(' 3. realasing connection');
      db.connectionManager.releaseConnection(client);
      // resolve(output.pipe(stream));
    });
  });
}

export function checkFileExists() {
  return fs.existsSync(EDGES_FILE_PATH);
}

// Store edges into .csv file for pathfinder executable
export async function writeToFile(
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
      `edges-tmp-${tmpFileKey}.csv`,
    );
    console.log('tmpfile --- ' + tmpFilePath);

    fs.closeSync(fs.openSync(tmpFilePath, 'w'));
    console.log('export start');
    exportCSV(tmpFilePath);
    console.log(
      'exportcdone - rename start' + tmpFilePath + '\n' + EDGES_FILE_PATH,
    );
    fs.renameSync(tmpFilePath, EDGES_FILE_PATH);
    console.log('rename done -- filename' + tmpFilePath);
    resolve();
  });
}
// QUESTION TO LLUNA : DO THESE TWO METHODS exportCSV and rename have to be async?? I guess right? I am not sure how to make them async properly
