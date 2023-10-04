import httpStatus from 'http-status';
import request from 'supertest';
import createCore from './utils/core';
import setupWeb3 from './utils/setupWeb3';
import getAccounts from './utils/getAccounts';
import deploySafeManually from './utils/deploySafeManually';
import generateSaltNonce from './utils/generateSaltNonce';
import { getSignature } from './utils/common';

import app from '~';
describe('Safe verification', () => {
  const { web3 } = setupWeb3();
  const core = createCore(web3);
  const accounts = getAccounts(web3);
  let account;
  let address;
  let nonce;
  let privateKey;
  let safeAddress;
  let signature;
  let username;
  let email;

  beforeAll(async () => {
    account = accounts[0];
    address = account.address;
    privateKey = account.privateKey;
    nonce = generateSaltNonce();
    safeAddress = await deploySafeManually({ account, nonce }, core);
    username = 'donkey' + Math.round(Math.random() * 1000);
    email = 'dk@kong.com';

    signature = getSignature(
      [address, nonce, safeAddress, username],
      privateKey,
    );
  });

  describe('PUT /users', () => {
    describe('when trying to hijack someones Safe', () => {
      it('should return an error when we try to create an entry with the same nonce', async () => {
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
          .expect(httpStatus.FORBIDDEN);
      });

      it('should return an error when we cant guess the right nonce', async () => {
        const attackerNonce = 123;

        const signature = getSignature(
          [address, attackerNonce, safeAddress, username],
          privateKey,
        );

        return await request(app)
          .put('/api/users')
          .send({
            address,
            nonce: attackerNonce,
            signature,
            data: {
              safeAddress: safeAddress,
              username,
              email,
            },
          })
          .set('Accept', 'application/json')
          .expect(httpStatus.BAD_REQUEST);
      });

      it('should return an error when owner is wrong', async () => {
        const wrongAccount = accounts[2];
        const wrongOwnerAddress = wrongAccount.address;

        return await request(app)
          .put('/api/users')
          .send({
            wrongOwnerAddress,
            signature,
            data: {
              safeAddress: safeAddress,
              username,
              email,
            },
          })
          .set('Accept', 'application/json')
          .expect(httpStatus.BAD_REQUEST);
      });
    });
  });

  describe('POST /users/:safeAddress', () => {
    describe('when trying to hijack someones Safe', () => {
      it('should return an error when owner is wrong', async () => {
        const wrongAccount = accounts[2];
        const wrongOwnerAddress = wrongAccount.address;
        return await request(app)
          .post(`/api/users/${safeAddress}`)
          .send({
            wrongOwnerAddress,
            signature,
            data: {
              safeAddress: safeAddress,
              username,
              email,
            },
          })
          .set('Accept', 'application/json')
          .expect(httpStatus.BAD_REQUEST);
      });
    });
  });

  describe('POST /users/:safeAddress/email ', () => {
    describe('when trying to hijack someones Safe', () => {
      it('should return an error when owner is wrong', async () => {
        const wrongAccount = accounts[2];
        const wrongOwnerAddress = wrongAccount.address;

        return await request(app)
          .post(`/api/users/${safeAddress}/email`)
          .send({
            wrongOwnerAddress,
            signature,
          })
          .set('Accept', 'application/json')
          .expect(httpStatus.BAD_REQUEST);
      });
    });
  });
});
