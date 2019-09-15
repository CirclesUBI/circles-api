import Web3 from 'web3';
import httpStatus from 'http-status';
import nock from 'nock';
import request from 'supertest';

import app from '~';

let web3;

function randomChecksumAddress() {
  return web3.utils.toChecksumAddress(web3.utils.randomHex(20));
}

async function expectErrorStatus(body, status = httpStatus.BAD_REQUEST) {
  return await request(app)
    .put('/api/users')
    .send(body)
    .set('Accept', 'application/json')
    .expect(status);
}

function getSignature(address, nonce, safeAddress, username, privateKey) {
  const data = `${address}${nonce}${safeAddress}${username}`;

  const { signature } = web3.eth.accounts.sign(data, privateKey);

  return signature;
}

function mockRelayerSafe({
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

beforeAll(() => {
  web3 = new Web3();
});

describe('API /users', () => {
  describe('PUT /users', () => {
    let address;
    let nonce;
    let privateKey;
    let safeAddress;
    let signature;
    let username;

    beforeEach(() => {
      const account = web3.eth.accounts.create();

      address = account.address;
      privateKey = account.privateKey;
      safeAddress = randomChecksumAddress();
      nonce = new Date().getTime();
      username = 'donkey';

      signature = getSignature(
        address,
        nonce,
        safeAddress,
        username,
        privateKey,
      );
    });

    it('should return an error on invalid body', async () => {
      const correctBody = {
        address: randomChecksumAddress(),
        signature: web3.utils.randomHex(65),
        nonce: 123456,
        data: {
          safeAddress: randomChecksumAddress(),
          username: 'zebra',
        },
      };

      // Missing fields
      await expectErrorStatus({
        ...correctBody,
        address: 'invalid',
      });

      // Missing signature
      await expectErrorStatus({
        ...correctBody,
        signature: '',
      });

      // Wrong address
      await expectErrorStatus({
        ...correctBody,
        address: web3.utils.randomHex(21),
      });

      // Wrong address checksum
      await expectErrorStatus({
        ...correctBody,
        address: web3.utils.randomHex(20),
      });

      // Invalid nonce
      await expectErrorStatus({
        ...correctBody,
        nonce: -1,
      });

      // Username too short
      await expectErrorStatus({
        ...correctBody,
        data: {
          ...correctBody.data,
          username: 'ab',
        },
      });
    });

    it('should return an error on invalid signature', async () => {
      // Wrong address
      await expectErrorStatus(
        {
          address: randomChecksumAddress(),
          nonce,
          signature,
          data: {
            safeAddress,
            username,
          },
        },
        httpStatus.FORBIDDEN,
      );

      // Wrong username
      await expectErrorStatus(
        {
          address,
          nonce,
          signature,
          data: {
            safeAddress,
            username: 'zebra',
          },
        },
        httpStatus.FORBIDDEN,
      );

      // Wrong nonce
      await expectErrorStatus(
        {
          address,
          nonce: nonce + 1,
          signature,
          data: {
            safeAddress,
            username,
          },
        },
        httpStatus.FORBIDDEN,
      );
    });

    it('should return an error when we do not get the Safe state right', async () => {
      // We send a nonce, even though the Safe is already deployed ...
      mockRelayerSafe({
        address,
        nonce,
        safeAddress,
        isCreated: true,
        isDeployed: true,
      });

      return await request(app)
        .put('/api/users')
        .send({
          address,
          nonce,
          signature,
          data: {
            safeAddress,
            username,
          },
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return an error when we cant guess the right nonce', async () => {
      const victimAddress = randomChecksumAddress();
      const victimSafeAddress = randomChecksumAddress();

      const signature = getSignature(
        address,
        nonce,
        victimSafeAddress,
        username,
        privateKey,
      );

      // We try to hijack someone elses safe address
      mockRelayerSafe({
        address: victimAddress,
        nonce,
        safeAddress: victimSafeAddress,
        isCreated: true,
        isDeployed: false,
      });

      // .. but receive this instead
      mockRelayerSafe({
        address,
        nonce,
        safeAddress: victimSafeAddress,
        isCreated: false,
        isDeployed: false,
      });

      return await request(app)
        .put('/api/users')
        .send({
          address,
          nonce,
          signature,
          data: {
            safeAddress: victimSafeAddress,
            username,
          },
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return an error when owner is wrong', async () => {
      const victimAddress = randomChecksumAddress();
      const victimSafeAddress = randomChecksumAddress();

      const signature = getSignature(
        address,
        0,
        victimSafeAddress,
        username,
        privateKey,
      );

      mockRelayerSafe({
        address: victimAddress,
        nonce,
        safeAddress: victimSafeAddress,
        isCreated: true,
        isDeployed: true,
      });

      return await request(app)
        .put('/api/users')
        .send({
          address,
          signature,
          data: {
            safeAddress: victimSafeAddress,
            username,
          },
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});
