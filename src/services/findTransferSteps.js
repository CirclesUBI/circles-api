import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';
import findTransferSteps from '@circles/transfer';
import { performance } from 'perf_hooks';

import web3 from './web3';
import tasks from '../tasks';
import submitJob from '../tasks/submitJob';
import waitAndRetryOnFail from '../helpers/loop';
import EdgeUpdateManager from './edgesUpdate';

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
  return isValid = web3.utils.toBN(plannedLimit).lte(web3.utils.toBN(capacity));
}

// Returns true if the transfer steps are valid
// Returns false and updates the steps if they are invalid
async function checkTransferSteps(transferSteps){
  const edgeUpdateManager = new EdgeUpdateManager();
  let allStepsValid = true;
  for (let step of transferSteps) {
    const tokenAddress = await hubContract.methods.userToToken(step.tokenOwnerAddress).call();
    const isValid = await isStepValid(tokenAddress, step.tokenOwnerAddress, step.from, step.to, step.value);
    if (!isValid) {
      allStepsValid = false;
      // Update the edge
      await edgeUpdateManager.updateEdge(
        {
          token: step.tokenOwnerAddress,
          from: step.from,
          to: step.to,
        },
        tokenAddress,
      );
    }
  }
}

export default async function transferSteps({ from, to, value }) {
  if (from === to) {
    throw new Error('Can not send to yourself');
  }

  const startTime = performance.now();

  const timeout = process.env.TRANSFER_STEPS_TIMEOUT
    ? parseInt(process.env.TRANSFER_STEPS_TIMEOUT, 10)
    : DEFAULT_PROCESS_TIMEOUT;

  await waitAndRetryOnFail(
    async () => {
      return await await findTransferSteps(
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
    async (result) => {
      // Checks that transfer steps are valid
      const validTransferSteps = await checkTransferSteps(result.transferSteps)
      if( !validTransferSteps ){
        // export edges.json
        submitJob(tasks.exportEdges, 'exportEdges-before-transfer');
        // findTransferSteps again
        console.log("*************** Return false");
        return false;
      }
      console.log("*************** Return true");
      return true;
    },
    {
      maxAttemptsOnFail: 2,
      waitAfterFail: 4000,
    }
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
