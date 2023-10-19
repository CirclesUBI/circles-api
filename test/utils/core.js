import CirclesCore from '@circles/core';
import ethProvider from './ethProvider';
const core = new CirclesCore(ethProvider, {
  hubAddress: '0xCfEB869F69431e42cdB54A4F4f105C19C080A601',
  apiServiceEndpoint: 'http://api.circles.land',
  fallbackHandlerAddress: '0x67B5656d60a809915323Bf2C40A8bEF15A152e3e',
  graphNodeEndpoint: 'http://graph.circles.lan',
  pathfinderServiceEndpoint: 'ATHFINDER_SERVICE_ENDPOINT',
  pathfinderType: 'cli',
  proxyFactoryAddress: '0x9b1f7F645351AF3631a656421eD2e40f2802E6c0',
  relayServiceEndpoint: 'http://localhost:3002',
  safeMasterAddress: '0x2612Af3A521c2df9EAF28422Ca335b04AdF3ac66',
  subgraphName: 'circlesubi/circles-subgraph',
  multiSendAddress: '0xe982E462b094850F12AF94d21D470e21bE9D0E9C',
  multiSendCallOnlyAddress: '0x0290FB167208Af455bB137780163b7B7a9a10C16',
});
export default core;
