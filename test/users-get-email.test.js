import httpStatus from 'http-status';
import request from 'supertest';
import core from './utils/core';
import accounts from './utils/accounts';
import { createTestUser } from './utils/createTestUser';
import { mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

describe('GET /users/:safeAddress/email - Getting the user email', () => {
  let payload;
  let account = accounts[0];

  beforeEach(async () => {
    payload = await createTestUser({
      core,
      account,
      username: 'doggy',
    });
  });

  afterEach(async () => {
    return await User.destroy({
      where: {
        username: payload.data.username,
      },
    });
  });

  it('should successfully respond when we try again', async () => {
    // Create a user
    await request(app)
      .put('/api/users')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    // Get the email
    mockGraphUsers(payload.address, payload.data.safeAddress);
    const signature = await getSignature(account, [
      payload.address,
      payload.data.safeAddress,
    ]);
    await request(app)
      .post(`/api/users/${payload.data.safeAddress}/email`)
      .send({
        address: payload.address,
        signature: signature,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.email !== payload.data.email) {
          throw new Error('Wrong email returned');
        }
      });

    // Get the email again
    mockGraphUsers(payload.address, payload.data.safeAddress);
    await request(app)
      .post(`/api/users/${payload.data.safeAddress}/email`)
      .send({
        address: payload.address,
        signature: signature,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.OK)
      .expect(({ body }) => {
        if (body.data.email !== payload.data.email) {
          throw new Error('Wrong email returned');
        }
      });
  });

  it('should return an error when signature is valid but entry was not found', async () => {
    // Create a user and not register
    const account = accounts[1];
    const address = account.address;
    const safeAddress = randomChecksumAddress();
    const signature = await getSignature(account, [address, safeAddress]);

    // Get the email
    mockGraphUsers(address, safeAddress);
    await request(app)
      .post(`/api/users/${safeAddress}/email`)
      .send({
        address: address,
        signature: signature,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.NOT_FOUND);
  });
});
