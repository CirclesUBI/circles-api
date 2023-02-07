import HubContract from '@circles/circles-contracts/build/contracts/Hub.json';

import web3 from './web3';
import EdgeUpdateManager from './edgesUpdate';
import logger from '../helpers/logger';
import tasks from '../tasks';
import submitJob from '../tasks/submitJob';

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
