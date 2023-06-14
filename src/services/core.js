import CirclesCore from '@circles/core';

import web3 from './web3';

const core = new CirclesCore(web3, {
  apiServiceEndpoint: process.env.API_SERVICE_ENDPOINT,
  fallbackHandlerAddress: process.env.SAFE_DEFAULT_CALLBACK_HANDLER,
  graphNodeEndpoint: process.env.GRAPH_NODE_ENDPOINT,
  hubAddress: process.env.HUB_ADDRESS,
  pathfinderServiceEndpoint: process.env.PATHFINDER_SERVICE_ENDPOINT,
  proxyFactoryAddress: process.env.PROXY_FACTORY_ADDRESS,
  relayServiceEndpoint: process.env.RELAY_SERVICE_ENDPOINT,
  safeMasterAddress: process.env.SAFE_ADDRESS,
  subgraphName: process.env.SUBGRAPH_NAME,
});

export default core;
