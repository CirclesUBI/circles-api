import Web3 from 'web3';

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

export function subscribeEvent(contract, address, eventNames, callbackFn) {
  const topics = eventNames.map((eventName) => {
    return getEventSignature(contract, eventName);
  });

  web3.eth.subscribe(
    'logs',
    {
      address,
      topics,
    },
    (error, result) => {
      if (!error) {
        callbackFn(result);
      }
    },
  );
}

export default web3;
