import Web3 from 'web3';
import Web3WsProvider from 'web3-providers-ws';

import web3 from './web3';
import logger from '../helpers/logger';

var options = {
  timeout: 30000, // ms

  clientConfig: {
    // Useful to keep a connection alive
    keepalive: true,
    keepaliveInterval: 60000, // ms
  },

  // Enable auto reconnection
  reconnect: {
    auto: true,
    delay: 5000, // ms
    maxAttempts: 5,
    onTimeout: false,
  },
};

const web3Ws = new Web3(
  new Web3WsProvider(process.env.ETHEREUM_NODE_WS, options),
);

export async function checkConnection() {
  return (await web3.eth.getBlock('latest')).number;
}

export function getEventSignature(contract, eventName) {
  const { signature } = contract._jsonInterface.find((item) => {
    return item.name === eventName && item.type === 'event';
  });
  return signature;
}

export function subscribeEvent(contract, address, eventName, callbackFn) {
  const handleCallback = (error, result) => {
    if (error) {
      logger.error(`Web3 subscription error: ${error}`);
      // Subscribe again with same parameters when disconnected
      subscription.subscribe(handleCallback);
    } else {
      callbackFn(result);
    }
  };

  const subscription = web3Ws.eth.subscribe(
    'logs',
    {
      address,
      topics: [getEventSignature(contract, eventName)],
    },
    handleCallback,
  );
}
