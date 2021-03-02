import Web3 from 'web3';

const provider =
  // For test purposes another ganache provider is used
  process.env.NODE_ENV === 'test'
    ? require('./../../test/utils/web3').provider
    : new Web3.providers.WebsocketProvider(process.env.ETHEREUM_NODE_WS);
const web3 = new Web3(provider);

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
  web3.eth.subscribe(
    'logs',
    {
      address,
      topics: [getEventSignature(contract, eventName)],
    },
    (error, result) => {
      if (error) {
        throw new Error(error);
      }
      callbackFn(result);
    },
  );
}

export default web3;
