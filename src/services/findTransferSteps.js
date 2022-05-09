import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';
import findTransferSteps from '@circles/transfer';
import { performance } from 'perf_hooks';

import web3 from './web3';
import EdgeUpdateManager from './edgesUpdate';
import tasks from '../tasks';
import submitJob from '../tasks/submitJob';
import { minNumberString } from '../helpers/compare';
import loop from '../helpers/loop';
import { EDGES_FILE_PATH, PATHFINDER_FILE_PATH } from '../constants';

const DEFAULT_PROCESS_TIMEOUT = 1000 * 60;

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

async function isStepValid(tokenAddress, tokenOwner, sender, receiver, plannedLimit) {
  // Get send limit
  const limit = await hubContract.methods.checkSendLimit(tokenOwner, sender, receiver).call();
  // Get Token balance
  const tokenContract = new web3.eth.Contract(
    TokenContract.abi,
    tokenAddress,
  );
  const balance = await tokenContract.methods.balanceOf(sender).call();
  // The capacity is the minimum between the sendLimit and the balance
  const capacity = minNumberString(limit, balance);
  return web3.utils.toBN(plannedLimit).lte(web3.utils.toBN(capacity));
}

// Checks that all the transfer steps are valid. Invalid steps are updated
async function checkValidTransferSteps(result){
  const edgeUpdateManager = new EdgeUpdateManager();

  const values = await Promise.allSettled(
    result.transferSteps.map(async (step) => {
      const tokenAddress = await hubContract.methods.userToToken(step.token).call();
      const stepValid = await isStepValid(tokenAddress, step.token, step.from, step.to, step.value)
      if (!stepValid){
        // Update the edge
        await edgeUpdateManager.updateEdge(
          {
            token: step.token,
            from: step.from,
            to: step.to,
          },
          tokenAddress,
        );
      }
      return stepValid;
    })
  );

  const areStepsValid = values.every( step => step.status === 'fulfilled' && step.value == true);

  if (!areStepsValid){
    // Write edges.json file to update edges
    submitJob(tasks.exportEdges, 'exportEdges-findTransferSteps');
  }
  return areStepsValid;
}

export default async function transferSteps({ from, to, value }) {
  if (from === to) {
    throw new Error('Can not send to yourself');
  }
  const startTime = performance.now();

  const timeout = process.env.TRANSFER_STEPS_TIMEOUT
    ? parseInt(process.env.TRANSFER_STEPS_TIMEOUT, 10)
    : DEFAULT_PROCESS_TIMEOUT;

  const result = await loop(
    async () => {
      return await findTransferSteps(
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
      );
    },
    async (data) => {
      return await checkValidTransferSteps(data);
    },
  );

  const endTime = performance.now();

  return {
    from,
    to,
    maxFlowValue: result.maxFlowValue,
    processDuration: Math.round(endTime - startTime),
    transferValue: value,
    transferSteps: result.transferSteps.map(({ token, ...step }) => {
      return {
        ...step,
        tokenOwnerAddress: token,
      };
    }),
  };
}
