import Web3 from 'web3';
import httpStatus from 'http-status';
import request from 'supertest';

import app from '~';

let web3;

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

beforeAll(() => {
  web3 = new Web3();
});

describe('API /users', () => {
  describe('PUT /users', () => {
    it('should return an error on invalid body', async () => {
      const correctBody = {
        address: web3.utils.randomHex(20),
        signature: 'abc',
        nonce: 123456,
        data: {
          safeAddress: web3.utils.randomHex(20),
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
      const { address, privateKey } = web3.eth.accounts.create();
      const safeAddress = web3.utils.randomHex(20);
      const nonce = new Date().getTime();
      const username = 'donkey';

      const signature = getSignature(
        address,
        nonce,
        safeAddress,
        username,
        privateKey,
      );

      // Wrong address
      await expectErrorStatus(
        {
          address: web3.utils.randomHex(20),
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
