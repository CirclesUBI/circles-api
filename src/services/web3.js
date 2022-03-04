import Web3 from 'web3';

import logger from '../helpers/logger';

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(process.env.ETHEREUM_NODE_WS),
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
      logger.error(`...Web3 subscription error: ${error}`);
      // Subscribe again with same parameters when disconnected
      subscription.subscribe(handleCallback);
    } else {
      callbackFn(result);
    }
  };

  const subscription = web3.eth.subscribe(
    'logs',
    {
      address,
      topics: [getEventSignature(contract, eventName)],
    },
    handleCallback,
  );
}

export default web3;
