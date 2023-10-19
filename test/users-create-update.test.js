import httpStatus from 'http-status';
import { Op } from 'sequelize';
import request from 'supertest';
import core from './utils/core';
import accounts from './utils/accounts';
import { createTestUser } from './utils/createTestUser';
import { mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

describe('Users', () => {
  let payload;
  let account = accounts[0];
  beforeEach(async () => {
    payload = await createTestUser({ core, account });
  });

  afterEach(async () => {
    return await User.destroy({
      where: {
        username: payload.data.username,
      },
    });
  });
  describe('PUT /users - Creating a new user', () => {
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

    it('should fail when trying to create an user with the different owner address', async () => {
      payload.address = randomChecksumAddress();
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.FORBIDDEN);
    });
  });

  describe('PUT /users - Fail when username is too similar', () => {
    let correctPayload;
    const duplicatePayloads = [];
    beforeEach(async () => {
      correctPayload = await createTestUser({
        core,
        account,
        username: 'myUsername',
      });
      duplicatePayloads[0] = await createTestUser({
        core,
        account,
        username: 'myusername',
      });
      duplicatePayloads[1] = await createTestUser({
        core,
        account,
        username: 'MYUSERNAME',
      });
      duplicatePayloads[2] = await createTestUser({
        core,
        account,
        username: 'MyUsername',
      });
      duplicatePayloads[3] = await createTestUser({
        core,
        account,
        username: 'myUserName',
      });
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
    const newUsername = 'dolfin';
    const newEmail = 'dol@fin.com';
    const newAvatarUrl = 'https://storage.com/image2.jpg';
    const similarUserName = 'Donkey';

    describe('when user was already created', () => {
      it('should successfully respond when I update all the fields', async () => {
        await request(app)
          .put('/api/users')
          .send(payload)
          .set('Accept', 'application/json')
          .expect(httpStatus.CREATED);
        const signature = await getSignature(account, [
          payload.address,
          payload.data.safeAddress,
          newUsername,
        ]);
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

        const signature = await getSignature(account, [
          payload.address,
          payload.data.safeAddress,
          newUsername,
        ]);
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

        const signature = await getSignature(account, [
          payload.address,
          payload.data.safeAddress,
          similarUserName,
        ]);
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

        const signature = await getSignature(account, [
          payload.address,
          payload.data.safeAddress,
          payload.data.username,
        ]);
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
    });

    describe('when user was not registered', () => {
      it('should not fail when providing all the data fields', async () => {
        const signature = await getSignature(account, [
          payload.address,
          payload.data.safeAddress,
          newUsername,
        ]);
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
    let otherPayload;
    let account2 = accounts[2];
    const correctOldUsername = 'myUsername';
    const oldUsername = 'kitty';
    const newUsername = 'MYusername';

    beforeEach(async () => {
      correctPayload = await createTestUser({
        core,
        account,
        username: correctOldUsername,
      });

      otherPayload = await createTestUser({
        core,
        account: account2,
        username: oldUsername,
      });
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

      const signature = await getSignature(account2, [
        otherPayload.address,
        otherPayload.data.safeAddress,
        newUsername,
      ]);
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

      const signature = await getSignature(account, [
        correctPayload.address,
        correctPayload.data.safeAddress,
        newUsername,
      ]);
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
});
