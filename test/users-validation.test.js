import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';
import { randomChecksumAddress, getSignature } from './utils/common';

import app from '~';

async function expectErrorStatus(body, status = httpStatus.BAD_REQUEST) {
  return await request(app)
    .put('/api/users')
    .send(body)
    .set('Accept', 'application/json')
    .expect(status);
}

describe('PUT /users - validation', () => {
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

    signature = getSignature(address, nonce, safeAddress, username, privateKey);
  });

  describe('when using invalid parameters', () => {
    it('should return errors', async () => {
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
  });

  describe('when using invalid signatures', () => {
    it('should return errors', async () => {
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
  });
});
