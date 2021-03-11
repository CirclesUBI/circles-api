import fastJsonStringify from 'fast-json-stringify';
import fs from 'fs';
import path from 'path';

import web3 from './web3';
import { EDGES_FILE_PATH, EDGES_DIRECTORY_NAME } from '../constants';

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

export function checkFileExists() {
  return fs.existsSync(EDGES_FILE_PATH);
}

// Store edges into .json file for pathfinder executable
export async function writeToFile(
  edges,
  tmpFileKey = web3.utils.randomHex(16).slice(2),
) {
  return new Promise((resolve, reject) => {
    // Check if `edges-data` folder exists and create it otherwise
    const edgesDataPath = path.join('..', EDGES_DIRECTORY_NAME);
    if (!fs.existsSync(edgesDataPath)) {
      fs.mkdirSync(edgesDataPath);
    }

    // Write to temporary file first
    const tmpFilePath = path.join(
      edgesDataPath,
      `edges.json-tmp-${tmpFileKey}`,
    );

    fs.writeFile(tmpFilePath, stringify(edges), (error) => {
      if (error) {
        reject(new Error(`Could not write to ${tmpFilePath} file: ${error}`));
      } else {
        // Finally rename it to destination file
        fs.renameSync(tmpFilePath, EDGES_FILE_PATH);
        resolve();
      }
    });
  });
}
