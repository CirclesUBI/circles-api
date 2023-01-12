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

  // Write edges.csv file to update edges
  submitJob(tasks.exportEdges, 'exportEdges-updateSteps');

  return values.every((step) => step.status === 'fulfilled');
}

export default async function updatePath({
  from,
  to,
  value,
  hops = HOPS_DEFAULT,
}) {
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
            hops,
          },
          {
            edgesFile: EDGES_FILE_PATH,
            pathfinderExecutable: PATHFINDER_FILE_PATH,
            flag: FLAG,
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
