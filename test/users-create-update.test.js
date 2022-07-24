import httpStatus from 'http-status';
import request from 'supertest';

import { createUserPayload } from './utils/users';
import { mockRelayerSafe, mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

function prepareUser({ username = 'donkey' } = {}, returnPrivateKey = false) {
  const safeAddress = randomChecksumAddress();
  const nonce = new Date().getTime();
  const email = 'dk@kong.com';
  const avatarUrl = 'https://storage.com/image.jpg';

  const userPayload = createUserPayload(
    {
      nonce,
      safeAddress,
      username,
      email,
      avatarUrl,
    },
    returnPrivateKey,
  );

  mockRelayerSafe({
    address: returnPrivateKey
      ? userPayload.payload.address
      : userPayload.address,
    nonce,
    safeAddress,
    isCreated: true,
    isDeployed: false,
  });

  return userPayload;
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

describe('POST /users/:safeAddress - Updating user data', () => {
  let payload;
  let privateKey;
  const newUsername = 'dolfin';
  const newEmail = 'dol@fin.com';
  const newAvatarUrl = 'https://storage.com/image2.jpg';

  beforeEach(() => {
    const response = prepareUser({ username: 'doggy' }, true);
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

  it('should successfully respond when user was already created', async () => {
    await request(app)
      .put('/api/users')
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    const signature = getSignature(
      [payload.address, payload.nonce, payload.data.safeAddress, newUsername],
      privateKey,
    );
    // Update payload values
    payload.data.username = newUsername;
    payload.data.email = newEmail;
    payload.data.avatarUrl = newAvatarUrl;
    payload.signature = signature;

    mockGraphUsers(payload.address, payload.data.safeAddress);
    await request(app)
      .post(`/api/users/${payload.data.safeAddress}`)
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK);
  });

  it('should successfully respond when user was not registered', async () => {
    const signature = getSignature(
      [payload.address, payload.nonce, payload.data.safeAddress, newUsername],
      privateKey,
    );
    // Update payload values
    payload.data.username = newUsername;
    payload.data.email = newEmail;
    payload.data.avatarUrl = newAvatarUrl;
    payload.signature = signature;

    mockGraphUsers(payload.address, payload.data.safeAddress);
    await request(app)
      .post(`/api/users/${payload.data.safeAddress}`)
      .send(payload)
      .set('Accept', 'application/json')
      .expect(httpStatus.OK);
  });
});