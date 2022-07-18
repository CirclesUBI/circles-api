import HubContract from 'circles-contracts/build/contracts/Hub.json';
import findTransferSteps from '@circles/transfer';

import web3 from './web3';
import EdgeUpdateManager from './edgesUpdate';
import logger from '../helpers/logger';
import tasks from '../tasks';
import submitJob from '../tasks/submitJob';
import { EDGES_FILE_PATH, PATHFINDER_FILE_PATH } from '../constants';

const DEFAULT_PROCESS_TIMEOUT = 1000 * 60;

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

// All the steps are updated
async function updateSteps(result) {
  const edgeUpdateManager = new EdgeUpdateManager();

  const values = await Promise.allSettled(
    result.transferSteps.map(async (step) => {
      const tokenAddress = await hubContract.methods
        .userToToken(step.token)
        .call();

      // Update the edge
      await edgeUpdateManager.updateEdge(
        {
          token: step.token,
          from: step.from,
          to: step.to,
        },
        tokenAddress,
      );

      return true;
    }),
  );

  // Write edges.json file to update edges
  submitJob(tasks.exportEdges, 'exportEdges-findTransferSteps');

  return values.every((step) => step.status === 'fulfilled');
}

export default async function updatePath({ from, to, value }) {
  const timeout = process.env.TRANSFER_STEPS_TIMEOUT
    ? parseInt(process.env.TRANSFER_STEPS_TIMEOUT, 10)
    : DEFAULT_PROCESS_TIMEOUT;

  try {
    return {
      updated: await updateSteps(
        await findTransferSteps(
          {
            from,
            to,
            value,
          },
          {
            edgesFile: EDGES_FILE_PATH,
            pathfinderExecutable: PATHFINDER_FILE_PATH,
            timeout,
          },
        ),
      ),
    };
  } catch (error) {
    logger.error(`Error updating steps [${error.message}]`);
    throw error;
  }
}
