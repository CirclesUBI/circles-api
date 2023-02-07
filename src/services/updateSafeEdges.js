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
async function getUserEdges(safeAddress, limit, offset) {
  return await Edge.findAll({
    order: [['id', 'ASC']],
    limit: limit,
    offset: offset,
    raw: true,
    where: {
      [Op.or]: [{ from: safeAddress }, { to: safeAddress }],
    },
  });
}

async function updateSafeEdges(safeAddress) {
  // Query data from DB in batches and from the last batch
  let limit = 10000;
  let offset = 0;
  const edges = await getUserEdges(safeAddress, limit, offset);
  if (edges <= limit) {
    await updateEdges(edges);
  } else {
    offset += limit;
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
