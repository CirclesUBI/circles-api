import Token from 'circles-contracts/build/contracts/Token.json';
import fs from 'fs';

import web3, { subscribeEvent, getEventSignature } from './web3';

import tasks from '~/tasks';
import submitJob from '~/tasks/submitJob';

import { EDGES_FILE_PATH } from '~/constants';

export function startWorker(hubContract) {
  if (process.env.INITIAL_SYNC) {
    // Run full sync on start. Note that this is a task which is manually
    // executed by setting the env var, as we don't want to run this
    // expensive process every time the worker restarts.
    submitJob(tasks.syncFullGraph, 'syncFullGraph-initial');
    return;
  }
  const tokenContract = new web3.eth.Contract(Token.abi);
  const transferSignature = getEventSignature(tokenContract, 'Transfer');
  const trustSignature = getEventSignature(hubContract, 'Trust');

  function handleTrustChange({ address, topics, transactionHash }) {
    if (topics.includes(transferSignature)) {
      submitJob(
        tasks.syncAddress,
        `syncAddress-transfer-${address}-${Date.now()}`,
        {
          tokenAddress: address,
          type: 'Transfer',
          topics,
          transactionHash,
        },
      );
    } else if (topics.includes(trustSignature)) {
      submitJob(
        tasks.syncAddress,
        `syncAddress-trust-${topics[1]}-${Date.now()}`,
        {
          type: 'Trust',
          topics,
          transactionHash,
        },
      );
    }
  }

  // Subscribe to events to handle trust graph updates for single addresses
  subscribeEvent(
    hubContract,
    process.env.HUB_ADDRESS,
    'Trust',
    handleTrustChange,
  );
  subscribeEvent(tokenContract, null, 'Transfer', handleTrustChange);
}
