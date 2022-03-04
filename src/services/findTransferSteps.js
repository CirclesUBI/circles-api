import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';
import findTransferSteps from '@circles/transfer';
import { performance } from 'perf_hooks';

import web3 from './web3';
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

// Checks that all the transfer steps are valid. Invalid steps are updated
async function transformValidTransferSteps(transferSteps){
  const edgeUpdateManager = new EdgeUpdateManager();

  let validSteps = true;

console.log({transferSteps});

  await Promise.all(
    transferSteps.map(async (step) => {
      console.log("Checking the edge: (", step.token, ", ", step.from, ", ", step.to, ")");
      const tokenAddress = await hubContract.methods.userToToken(step.token).call();
      const isValid = await isStepValid(tokenAddress, step.token, step.from, step.to, step.value);
      if (!isValid) {
        validSteps = false;
        // Update the edge
        console.log("Updating the edge: (", step.token, ", ", step.from, ", ", step.to, ")");
        await edgeUpdateManager.updateEdge(
          {
            token: step.token,
            from: step.from,
            to: step.to,
          },
          tokenAddress,
        );
      }
    }),
  );

  // let validSteps = [];
  
  // for (let step of transferSteps) {
  //   const tokenAddress = await hubContract.methods.userToToken(step.tokenOwnerAddress).call();
  //   const isValid = await isStepValid(tokenAddress, step.tokenOwnerAddress, step.from, step.to, step.value);
  //   if (isValid) {
  //     validSteps.push(step)
  //   } else {
  //     // Update the edge
  //     await edgeUpdateManager.updateEdge(
  //       {
  //         token: step.tokenOwnerAddress,
  //         from: step.from,
  //         to: step.to,
  //       },
  //       tokenAddress,
  //     );
  //   }
  // }
  console.log("return valid steps: ", validSteps)
  return validSteps;
}

export default async function transferSteps({ from, to, value }) {
  if (from === to) {
    throw new Error('Can not send to yourself');
  }

  const startTime = performance.now();

  const timeout = process.env.TRANSFER_STEPS_TIMEOUT
    ? parseInt(process.env.TRANSFER_STEPS_TIMEOUT, 10)
    : DEFAULT_PROCESS_TIMEOUT;

  const result = await findTransferSteps(
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
  // Filter out the transfer steps that are not valid
  const validTransferSteps = await transformValidTransferSteps(result.transferSteps);
  if (!validTransferSteps) {
    throw new Error('Valid path not found, try again');
  }

  const endTime = performance.now();

  return {
    from,
    to,
    maxFlowValue: result.maxFlowValue,
    processDuration: Math.round(endTime - startTime),
    transferValue: value,
    transferSteps: validTransferSteps.map(({ token, ...step }) => {
      return {
        ...step,
        tokenOwnerAddress: token,
      };
    }),
  };
}
