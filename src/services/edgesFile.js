import fastJsonStringify from 'fast-json-stringify';
import fs from 'fs';
import path from 'path';

import web3 from './web3';
import { EDGES_FILE_PATH, PATHFINDER_BASE_PATH } from '../constants';

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
    // Write to temporary file first
    const tmpFilePath = path.join(
      PATHFINDER_BASE_PATH,
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
