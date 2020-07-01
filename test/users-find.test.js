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
      const email = `panda${index + 1}@zoo.org`;

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
            email,
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
    users.map(async (user) => {
      return await User.destroy({
        where: {
          username: user.username,
        },
      });
    }),
  );
});

describe('GET /users/:username - Resolve by username', () => {
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

describe('GET /users/?username[]=... - Resolve by usernames and addresses', () => {
  it('should return a list of all results', async () => {
    const params = users
      .reduce((acc, user) => {
        if (Math.random() > 0.5) {
          acc.push(`username[]=${user.username}`);
        } else {
          acc.push(`address[]=${user.safeAddress}`);
        }

        return acc;
      }, [])
      .join('&');

    await request(app)
      .get(`/api/users/?${params}`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        let foundTotal = 0;

        users.forEach((user) => {
          const isFound = body.data.find((item) => {
            return (
              item.username === user.username &&
              item.safeAddress === user.safeAddress
            );
          });

          if (isFound) {
            foundTotal += 1;
          } else {
            throw new Error('User was not resolved');
          }
        });

        if (foundTotal > body.data.length) {
          throw new Error('Too many results where returned');
        }
      });
  });

  it('should filter duplicates automatically', async () => {
    const { username, safeAddress } = users[1];

    await request(app)
      .get(`/api/users/?address[]=${safeAddress}&username[]=${username}`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== 1) {
          throw new Error('Duplicates found');
        }
      });
  });

  it('should fail silently and not include the failed results', async () => {
    const { username, safeAddress } = users[4];

    const params = [
      `address[]=${safeAddress}`,
      `username[]=${username}`,
      `username[]=notexisting`,
      `address[]=${randomChecksumAddress()}`,
    ].join('&');

    await request(app)
      .get(`/api/users/?${params}`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== 1) {
          throw new Error('Invalid entries found');
        }

        if (body.data[0].username !== username) {
          throw new Error('Invalid result found');
        }
      });
  });
});

describe('GET /users/?query=... - Search via username', () => {
  it('should return all matching users', async () => {
    await request(app)
      .get('/api/users/?query=panda')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== NUM_TEST_USERS) {
          throw new Error('Did not return all expected entries');
        }
      });

    await request(app)
      .get(`/api/users/?query=${users[1].username}`)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (
          body.data.length !== 1 ||
          body.data[0].username !== users[1].username ||
          body.data[0].safeAddress !== users[1].safeAddress
        ) {
          throw new Error('Did not return expected entry');
        }
      });
  });

  it('should fail silently when no items were found', async () => {
    await request(app)
      .get('/api/users/?query=lala')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.length !== 0) {
          throw new Error('Invalid entries found');
        }
      });
  });

  it('should fail silently when query contains non alphanumeric characters', async () => {
    await request(app)
      .get('/api/users/?query=lala%20lulu')
      .set('Accept', 'application/json')
      .expect(httpStatus.OK);
  });

  it('should fail when query is empty', async () => {
    await request(app)
      .get('/api/users/?query=')
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
});
