import HubContract from '@circles/circles-contracts/build/contracts/Hub.json';
import findTransferSteps from '@circles/transfer';

import web3 from './web3';
import EdgeUpdateManager from './edgesUpdate';
import logger from '../helpers/logger';
import tasks from '../tasks';
import submitJob from '../tasks/submitJob';

import {
  EDGES_FILE_PATH,
  HOPS_DEFAULT,
  PATHFINDER_FILE_PATH,
} from '../constants';

const DEFAULT_PROCESS_TIMEOUT = 1000 * 200;
const FLAG = '--csv';

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);
const { Edge } = require('../models/edges');

const { Op } = require('sequelize');
const day = 1000 * 60 * 60 * 24;

// Update given edges
async function updateEdges(edges) {
  const edgeUpdateManager = new EdgeUpdateManager();
  for await (const edge of edges) {
    const tokenAddress = await hubContract.methods
      .userToToken(edge.token)
      .call();
    await edgeUpdateManager.updateEdge(
      {
        ...edge,
      },
      tokenAddress,
    );
  }
  // Write edges.csv file to update edges
  submitJob(tasks.exportEdges, 'exportEdges-updateEdges');
}

// Get edges given an address and its limit
async function getUserEdges(safeAddress, limit) {
  return await Edge.findAll({
    order: [['updatedAt', 'ASC']],
    limit: limit,
    raw: true,
    where: {
      [Op.or]: [{ from: safeAddress }, { to: safeAddress }],
    },
  });
}

async function updateSafeEdges(safeAddress, limit = 10000) {
  // Retrieve all the edges from the db in batches
  // This function iterates over all the edges sorted by updatedAt
  // The stop condition of the loop is when the last updated edge
  // is updated in the present date
  let isOld = true;
  let count = 0;
  while (isOld) {
    const edges = await getUserEdges(limit, safeAddress);
    await updateEdges(edges);
    count++;
    const date1 = edges[0].updatedAt;
    const date2 = new Date(Date.now());
    const date1utc = Date.UTC(
      date1.getFullYear(),
      date1.getMonth(),
      date1.getDate(),
    );
    const date2utc = Date.UTC(
      date2.getFullYear(),
      date2.getMonth(),
      date2.getDate(),
    );
    const difference = (date2utc - date1utc) / day;
    isOld = difference > 0;
  }
}

// async function updateSteps(result) {
//   const edgeUpdateManager = new EdgeUpdateManager();

//   const values = await Promise.allSettled(
//     result.transferSteps.map(async (step) => {
//       const tokenAddress = await hubContract.methods
//         .userToToken(step.token)
//         .call();

//       // Update the edge
//       await edgeUpdateManager.updateEdge(
//         {
//           token: step.token,
//           from: step.from,
//           to: step.to,
//         },
//         tokenAddress,
//       );

//       return true;
//     }),
//   );

//   // Write edges.csv file to update edges
//   submitJob(tasks.exportEdges, 'exportEdges-updateSteps');

//   return values.every((step) => step.status === 'fulfilled');
// }

export default async function updateAllEdges({ safeAddress, limit }) {
  try {
    return {
      updated: await updateSafeEdges(safeAddress, limit),
    };
  } catch (error) {
    logger.error(
      `Error updating edges [${error.message}] for safe ${safeAddress}`,
    );
    throw error;
  }
}

// export default async function updatePath({
//   from,
//   to,
//   value,
//   hops = HOPS_DEFAULT,
// }) {
//   const timeout = process.env.TRANSFER_STEPS_TIMEOUT
//     ? parseInt(process.env.TRANSFER_STEPS_TIMEOUT, 10)
//     : DEFAULT_PROCESS_TIMEOUT;

//   try {
//     return {
//       updated: await updateSteps(
//         await findTransferSteps(
//           {
//             from,
//             to,
//             value,
//             hops: hops.toString(),
//           },
//           {
//             edgesFile: EDGES_FILE_PATH,
//             pathfinderExecutable: PATHFINDER_FILE_PATH,
//             flag: FLAG,
//             timeout,
//           },
//         ),
//       ),
//     };
//   } catch (error) {
//     logger.error(`Error updating steps [${error.message}]`);
//     throw error;
//   }
// }
