import HubContract from 'circles-contracts/build/contracts/Hub.json';
import TokenContract from 'circles-contracts/build/contracts/Token.json';
import web3 from './web3';

import logger from '../helpers/logger';
import { minNumberString } from '../helpers/compare';
import { upsertEdge, destroyEdge } from './edgesDatabase';

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

export async function updateEdge(edge, tokenAddress) {
  // Ignore self-trust
  if (edge.from === edge.to) {
    return;
  }

  try {
    // Get send limit
    const limit = await hubContract.methods
      .checkSendLimit(edge.token, edge.from, edge.to)
      .call();

    // Get Token balance
    const tokenContract = new web3.eth.Contract(
      TokenContract.abi,
      tokenAddress,
    );
    const balance = await tokenContract.methods.balanceOf(edge.from).call();

    // Update edge capacity
    edge.capacity = minNumberString(limit, balance);

    await upsertEdge(edge);
  } catch (error) {
    logger.error(
      `Found error with checking sending limit for token of ${edge.token} from ${edge.from} to ${edge.to} [${error}]`,
    );

    await destroyEdge(edge);
  }
}
