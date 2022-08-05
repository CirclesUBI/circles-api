import httpStatus from 'http-status';
import { Op } from 'sequelize';
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
  const similarUserName = 'Doggy';

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

  describe('when user was already created', () => {
    it('should successfully respond when I update all the fields', async () => {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      const signature = getSignature(
        [payload.address, payload.data.safeAddress, newUsername],
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
        .send({
          address: payload.address,
          signature: payload.signature,
          data: payload.data,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });

    it('should successfully respond when I update only the username', async () => {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      const signature = getSignature(
        [payload.address, payload.data.safeAddress, newUsername],
        privateKey,
      );
      // Update payload values
      payload.data.username = newUsername;
      payload.signature = signature;

      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .post(`/api/users/${payload.data.safeAddress}`)
        .send({
          address: payload.address,
          signature: payload.signature,
          data: payload.data,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });

    it('should successfully respond when I update to a similar username', async () => {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      const signature = getSignature(
        [payload.address, payload.data.safeAddress, similarUserName],
        privateKey,
      );
      // Update payload values
      payload.data.username = similarUserName;
      payload.signature = signature;

      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .post(`/api/users/${payload.data.safeAddress}`)
        .send({
          address: payload.address,
          signature: payload.signature,
          data: payload.data,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });

    it('should successfully respond when I update only the avatarUrl', async () => {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      const signature = getSignature(
        [payload.address, payload.data.safeAddress, payload.data.username],
        privateKey,
      );
      // Update payload values
      payload.data.avatarUrl = newAvatarUrl;
      payload.signature = signature;

      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .post(`/api/users/${payload.data.safeAddress}`)
        .send({
          address: payload.address,
          signature: payload.signature,
          data: payload.data,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });

    it('should successfully respond when mail is empty', async () => {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      const signature = getSignature(
        [payload.address, payload.data.safeAddress, newUsername],
        privateKey,
      );
      // Update payload values
      payload.data.username = newUsername;
      payload.data.avatarUrl = newAvatarUrl;
      payload.data.email = '';
      payload.signature = signature;

      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .post(`/api/users/${payload.data.safeAddress}`)
        .send({
          address: payload.address,
          signature: payload.signature,
          data: payload.data,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });
  });

  describe('when user was not registered', () => {
    it('should fail when mail is empty', async () => {
      const signature = getSignature(
        [payload.address, payload.data.safeAddress, newUsername],
        privateKey,
      );
      // Update payload values
      payload.data.username = newUsername;
      payload.data.avatarUrl = newAvatarUrl;
      payload.data.email = '';
      payload.signature = signature;

      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .post(`/api/users/${payload.data.safeAddress}`)
        .send({
          address: payload.address,
          signature: payload.signature,
          data: payload.data,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should not fail when providing all the data fields', async () => {
      const signature = getSignature(
        [payload.address, payload.data.safeAddress, newUsername],
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
        .send({
          address: payload.address,
          signature: payload.signature,
          data: payload.data,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });
  });
});

describe('POST /users/:safeAddress - Fail when username is too similar', () => {
  let correctPayload;
  let correctPrivateKey;
  let otherPayload;
  let otherPrivateKey;
  const correctOldUsername = 'myUsername';
  const oldUsername = 'kitty';
  const newUsername = 'MYusername';

  beforeEach(() => {
    const response = prepareUser({ username: correctOldUsername }, true);
    correctPayload = response.payload;
    correctPrivateKey = response.privateKey;

    const response2 = prepareUser({ username: oldUsername }, true);
    otherPayload = response2.payload;
    otherPrivateKey = response2.privateKey;
  });

  afterEach(async () => {
    return await User.destroy({
      where: {
        username: {
          [Op.or]: [
            correctPayload.data.username,
            correctOldUsername,
            oldUsername,
          ],
        },
      },
    });
  });

  it('should reject when is too similar to other username', async () => {
    await request(app)
      .put('/api/users')
      .send(correctPayload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    await request(app)
      .put('/api/users')
      .send(otherPayload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    // Same username already exists
    mockGraphUsers(otherPayload.address, otherPayload.data.safeAddress);

    const signature = getSignature(
      [otherPayload.address, otherPayload.data.safeAddress, newUsername],
      otherPrivateKey,
    );
    // Update payload values
    otherPayload.data.username = newUsername;
    otherPayload.signature = signature;
    await request(app)
      .post(`/api/users/${otherPayload.data.safeAddress}`)
      .send({
        address: otherPayload.address,
        signature: otherPayload.signature,
        data: otherPayload.data,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.CONFLICT);
  });

  it('should suceed when is similar to same username', async () => {
    await request(app)
      .put('/api/users')
      .send(correctPayload)
      .set('Accept', 'application/json')
      .expect(httpStatus.CREATED);

    // Same username already exists
    mockGraphUsers(correctPayload.address, correctPayload.data.safeAddress);

    const signature = getSignature(
      [correctPayload.address, correctPayload.data.safeAddress, newUsername],
      correctPrivateKey,
    );
    // Update payload values
    correctPayload.data.username = newUsername;
    correctPayload.signature = signature;
    await request(app)
      .post(`/api/users/${correctPayload.data.safeAddress}`)
      .send({
        address: correctPayload.address,
        signature: correctPayload.signature,
        data: correctPayload.data,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.OK);
  });
});
