import httpStatus from 'http-status';
import request from 'supertest';

import { createUserPayload } from './utils/users';
import { mockRelayerSafe } from './utils/mocks';
import { randomChecksumAddress } from './utils/common';

import User from '~/models/users';
import app from '~';

describe('PUT /users - Creating a new user', () => {
  let nonce;
  let safeAddress;
  let username;
  let email;
  let avatarUrl;

  let payload;

  beforeEach(() => {
    safeAddress = randomChecksumAddress();
    nonce = new Date().getTime();
    username = 'donkey';
    email = 'dk@kong.com';
    avatarUrl = 'https://storage.com/image.jpg';

    payload = createUserPayload({
      nonce,
      safeAddress,
      username,
      email,
      avatarUrl,
    });

    mockRelayerSafe({
      address: payload.address,
      nonce,
      safeAddress,
      isCreated: true,
      isDeployed: false,
    });
  });

  afterAll(async () => {
    return await User.destroy({
      where: {
        username,
      },
    });
  });

  it('should successfully respond', async () => {
    await request(app)
      .put('/api/users')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);
  });

  it('should fail if we use the same username again', async () => {
    await request(app)
      .put('/api/users')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CONFLICT);
  });
});
