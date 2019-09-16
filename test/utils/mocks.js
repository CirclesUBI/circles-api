import httpStatus from 'http-status';
import nock from 'nock';

import web3 from './web3';

export function mockRelayerSafe({
  address,
  nonce,
  safeAddress,
  isCreated,
  isDeployed,
}) {
  if (isCreated) {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .get(`/api/v2/safe/${safeAddress}/funded/`)
      .reply(httpStatus.OK, {
        blockNumber: null,
        txHash: isDeployed ? web3.utils.randomHex(32) : null,
      });
  } else {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .get(`/api/v2/safe/${safeAddress}/funded/`)
      .reply(httpStatus.NOT_FOUND);
  }

  if (isCreated) {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .post('/api/v2/safe/', {
        nonce,
        owners: [address],
        threshold: 1,
      })
      .reply(httpStatus.UNPROCESSABLE_ENTITY, {
        exception: `SafeAlreadyExistsException: Safe=${safeAddress} cannot be created, already exists`,
      });
  } else {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .post('/api/v2/safe/', {
        nonce,
        owners: [address],
        threshold: 1,
      })
      .reply(httpStatus.CREATED);
  }

  if (isCreated) {
    if (isDeployed) {
      nock(process.env.RELAY_SERVICE_ENDPOINT)
        .get(`/api/v1/safe/${safeAddress}/`)
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
        .get(`/api/v1/safe/${safeAddress}/`)
        .reply(httpStatus.UNPROCESSABLE_ENTITY, {
          exception: `"SafeNotDeployed: Safe with address=${safeAddress} not deployed"`,
        });
    }
  } else {
    nock(process.env.RELAY_SERVICE_ENDPOINT)
      .get(`/api/v1/safe/${safeAddress}`)
      .reply(httpStatus.NOT_FOUND);
  }
}
