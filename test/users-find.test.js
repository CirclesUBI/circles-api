import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';
import { mockRelayerSafe } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

const NUM_TEST_USERS = 5;

const users = [];

async function expectUser(app, username, safeAddress) {
  return await request(app)
    .get(`/api/users/${username}`)
    .set('Accept', 'application/json')
    .expect(httpStatus.OK)
    .expect(({ body }) => {
      if (!('id' in body.data)) {
        throw new Error('id missing');
      }

      if (body.data.username !== username) {
        throw new Error('Wrong username');
      }

      if (body.data.safeAddress !== safeAddress) {
        throw new Error('Wrong Safe address');
      }
    });
}

beforeAll(async () => {
  const items = new Array(NUM_TEST_USERS).fill(0);

  await Promise.all(
    items.map(async (item, index) => {
      const account = web3.eth.accounts.create();
      const address = account.address;
      const privateKey = account.privateKey;

      const safeAddress = randomChecksumAddress();
      const nonce = index + 1;
      const username = `panda${index + 1}`;

      const signature = getSignature(
        address,
        nonce,
        safeAddress,
        username,
        privateKey,
      );

      mockRelayerSafe({
        address,
        nonce,
        safeAddress,
        isCreated: true,
        isDeployed: false,
      });

      await request(app)
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
        .expect(httpStatus.CREATED);

      users.push({
        username,
        safeAddress,
      });
    }),
  );
});

afterAll(async () => {
  await Promise.all(
    users.map(async user => {
      return await User.destroy({
        where: {
          username: user.username,
        },
      });
    }),
  );
});

describe('GET /users/:username - Find by username', () => {
  it('should find one user', async () => {
    await Promise.all(
      users.map(async ({ username, safeAddress }) => {
        return await expectUser(app, username, safeAddress);
      }),
    );
  });

  it('should return an error when not found', async () => {
    await request(app)
      .get('/api/users/giraffe')
      .set('Accept', 'application/json')
      .expect(httpStatus.NOT_FOUND);
  });
});
