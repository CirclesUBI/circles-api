import CirclesCore from '@circles/core';

import web3 from './web3';

const core = new CirclesCore(web3, {
  safeMasterAddress: process.env.SAFE_ADDRESS,
  hubAddress: process.env.HUB_ADDRESS,
  proxyFactoryAddress: process.env.PROXY_FACTORY_ADDRESS,
  graphNodeEndpoint: process.env.GRAPH_NODE_ENDPOINT,
  usernameServiceEndpoint: process.env.USERNAME_SERVICE_ENDPOINT,
  relayServiceEndpoint: process.env.RELAY_SERVICE_ENDPOINT,
  subgraphName: process.env.SUBGRAPH_NAME,
});

export default core;
