import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';

import { mockRelayerSafe } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import app from '~';

describe('PUT /users - Safe verification', () => {
  let address;
  let nonce;
  let privateKey;
  let safeAddress;
  let signature;
  let username;
  let email;

  beforeEach(() => {
    const account = web3.eth.accounts.create();

    address = account.address;
    privateKey = account.privateKey;
    safeAddress = randomChecksumAddress();
    nonce = new Date().getTime();
    username = 'donkey';
    email = 'dk@kong.com';

    signature = getSignature(address, nonce, safeAddress, username, privateKey);
  });

  describe('when trying to hijack someones Safe', () => {
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
            email,
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
            email,
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
            email,
          },
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});
