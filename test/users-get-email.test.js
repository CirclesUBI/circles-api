import httpStatus from 'http-status';
import request from 'supertest';
import createCore from './utils/core';
import setupWeb3 from './utils/setupWeb3';
import getAccounts from './utils/getAccounts';
import { createTestUser } from './utils/createTestUser';
import { mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

describe('GET /users/:safeAddress/email - Getting the user email', () => {
  let payload;
  let privateKey;
  const { web3 } = setupWeb3();
  const core = createCore(web3);
  const accounts = getAccounts(web3);

  beforeEach(async () => {
    const response = await createTestUser(
      core,
      accounts[0],
      { username: 'doggy' },
      'dk@kong.com',
      'https://storage.com/image.jpg',
      true,
    );
    payload = response.payload;
    privateKey = response.privateKey;
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
    const signature = getSignature(
      [payload.address, payload.data.safeAddress],
      privateKey,
    );
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
    const account = web3.eth.accounts.create();
    const address = account.address;
    const privateKey = account.privateKey;
    const safeAddress = randomChecksumAddress();
    const signature = getSignature([address, safeAddress], privateKey);

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
