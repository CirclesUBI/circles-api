import httpStatus from 'http-status';
import nock from 'nock';

import web3 from './web3';
import graphSafesMockData from '../data/graph-safes.json';

export function mockGraphSafes() {
  const mockedQuery =
    'id outgoing { limit canSendToAddress userAddress } incoming { limit canSendToAddress userAddress } balances { amount token { id owner { id } } }';

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

export function mockRelayerSafe({
  address,
  nonce,
  safeAddress,
  isCreated,
  isDeployed,
}) {
  if (isCreated) {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .get(`/api/v2/safes/${safeAddress}/funded/`)
      .reply(httpStatus.OK, {
        blockNumber: null,
        txHash: isDeployed ? web3.utils.randomHex(32) : null,
      });
  } else {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .get(`/api/v2/safes/${safeAddress}/funded/`)
      .reply(httpStatus.NOT_FOUND);
  }

  if (isCreated) {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .post('/api/v3/safes/', {
        saltNonce: nonce,
        owners: [address],
        threshold: 1,
      })
      .reply(httpStatus.UNPROCESSABLE_ENTITY, {
        exception: `SafeAlreadyExistsException: Safe=${safeAddress} cannot be created, already exists`,
      });
  } else {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .post('/api/v3/safes/', {
        saltNonce: nonce,
        owners: [address],
        threshold: 1,
      })
      .reply(httpStatus.CREATED);
  }

  if (isCreated) {
    if (isDeployed) {
      nock(process.env.RELAY_SERVICE_ENDPOINT)
        .get(`/api/v1/safes/${safeAddress}/`)
        .reply(httpStatus.OK, {
          address: safeAddress,
          masterCopy: process.env.SAFE_ADDRESS,
          nonce: 0,
          threshold: 1,
          owners: [address],
          version: '1.0.0',
        });
    } else {
      nock(process.env.RELAY_SERVICE_ENDPOINT)
        .get(`/api/v1/safes/${safeAddress}/`)
        .reply(httpStatus.UNPROCESSABLE_ENTITY, {
          exception: `"SafeNotDeployed: Safe with address=${safeAddress} not deployed"`,
        });
    }
  } else {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .get(`/api/v1/safes/${safeAddress}`)
      .reply(httpStatus.NOT_FOUND);
  }
}
