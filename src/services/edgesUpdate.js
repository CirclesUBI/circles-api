import HubContract from '@circles/circles-contracts/build/contracts/Hub.json';
import TokenContract from '@circles/circles-contracts/build/contracts/Token.json';

import logger from '../helpers/logger';
import web3 from './web3';

import { minNumberString } from '../helpers/compare';
import { upsertEdge } from './edgesDatabase';
import { ZERO_ADDRESS } from '../constants';

const hubContract = new web3.eth.Contract(
  HubContract.abi,
  process.env.HUB_ADDRESS,
);

const getKey = (from, to, token) => {
  return [from, to, token].join('');
};

export default class EdgeUpdateManager {
  constructor() {
    this.checkedEdges = {};
  }

  checkDuplicate(edge) {
    const key = getKey(edge.from, edge.to, edge.token);
    if (key in this.checkedEdges) {
      return true;
    }
    this.checkedEdges[key] = true;
    return false;
  }

  async updateEdge(edge, tokenAddress) {
    // Don't store edges from relayer
    if (edge.from === process.env.TX_SENDER_ADDRESS) {
      return;
    }

    // Don't store edges to or from zero address
    if (edge.to === ZERO_ADDRESS || edge.from === ZERO_ADDRESS) {
      return;
    }

    // Ignore self-referential edges
    if (edge.from === edge.to) {
      return;
    }

    // Ignore duplicates
    if (this.checkDuplicate(edge)) {
      return;
    }

    // Update edge capacity
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
    }
  }
}
