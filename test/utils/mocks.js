import httpStatus from 'http-status';
import nock from 'nock';

import graphSafesMockData from '../data/graph-safes.json';

export function mockGraphSafes() {
  const mockedQuery =
    'id outgoing { canSendToAddress userAddress } incoming { canSendToAddress userAddress } balances { token { id owner { id } } }';

  // Mock paginated safes query
  nock(process.env.GRAPH_NODE_ENDPOINT)
    .post(`/subgraphs/name/${process.env.SUBGRAPH_NAME}`, {
      query: `{ safes( first: 500, skip: 0) { ${mockedQuery} } }`,
    })
    .reply(httpStatus.OK, graphSafesMockData);

  nock(process.env.GRAPH_NODE_ENDPOINT)
    .post(`/subgraphs/name/${process.env.SUBGRAPH_NAME}`, {
      query: `{ safes( first: 500, skip: 500) { ${mockedQuery} } }`,
    })
    .reply(httpStatus.OK, {
      data: {
        safes: [],
      },
    });
}

export function mockGraphUsers(address, safeAddress) {
  nock(process.env.GRAPH_NODE_ENDPOINT)
    .post(`/subgraphs/name/${process.env.SUBGRAPH_NAME}`, {
      query: `{ user(id: "${address.toLowerCase()}") { safeAddresses } }`,
    })
    .reply(httpStatus.OK, {
      data: {
        user: {
          safeAddresses: [safeAddress.toLowerCase()],
        },
      },
    });
}
