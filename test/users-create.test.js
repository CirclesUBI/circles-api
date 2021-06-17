import httpStatus from 'http-status';
import request from 'supertest';

import { createUserPayload } from './utils/users';
import { mockRelayerSafe } from './utils/mocks';
import { randomChecksumAddress } from './utils/common';

import User from '~/models/users';
import app from '~';

function prepareUser({ username = 'donkey' } = {}) {
  const safeAddress = randomChecksumAddress();
  const nonce = new Date().getTime();
  const email = 'dk@kong.com';
  const avatarUrl = 'https://storage.com/image.jpg';

  const payload = createUserPayload({
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

  return payload;
}

describe('PUT /users - Creating a new user', () => {
  let payload;

  beforeEach(() => {
    payload = prepareUser();
  });

  afterEach(async () => {
    return await User.destroy({
      where: {
        username: payload.data.username,
      },
    });
  });

  it('should successfully respond and fail when we try again', async () => {
    await request(app)
      .put('/api/users')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    await request(app)
      .put('/api/users')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CONFLICT);
  });
});

describe('PUT /users - Fail when username is too similar', () => {
  let correctPayload;
  const duplicatePayloads = [];

  beforeEach(() => {
    correctPayload = prepareUser({ username: 'myUsername' });
    duplicatePayloads[0] = prepareUser({ username: 'myusername' });
    duplicatePayloads[1] = prepareUser({ username: 'MYUSERNAME' });
    duplicatePayloads[2] = prepareUser({ username: 'MyUsername' });
    duplicatePayloads[3] = prepareUser({ username: 'myUserName' });
  });

  afterEach(async () => {
    return await User.destroy({
      where: {
        username: correctPayload.data.username,
      },
    });
  });

  it('should reject same username with different letter case', async () => {
    await request(app)
      .put('/api/users')
      .send(correctPayload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    // Same username already exists
    for (const payload of duplicatePayloads) {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CONFLICT);
    }
  });
});
