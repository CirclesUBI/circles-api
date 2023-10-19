import httpStatus from 'http-status';
import request from 'supertest';

import core from './utils/core';
import accounts from './utils/accounts';
import { createTestUser } from './utils/createTestUser';
import { mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

describe('Delete', () => {
  let payload;
  let account;

  describe('DELETE /users/:safeAddress - Delete the user entry (idempotent)', () => {
    beforeEach(async () => {
      account = accounts[0];
      payload = await createTestUser({ core, account });
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

      // Remove entry
      mockGraphUsers(payload.address, payload.data.safeAddress);
      const signature = await getSignature(account, [
        payload.address,
        payload.data.safeAddress,
      ]);
      await request(app)
        .delete(`/api/users/${payload.data.safeAddress}`)
        .send({
          address: payload.address,
          signature: signature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);

      // Try again removing entry
      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .delete(`/api/users/${payload.data.safeAddress}`)
        .send({
          address: payload.address,
          signature: signature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });

    it('should return sucess when signature is valid but entry was not found', async () => {
      // Create a user and not register
      const account = accounts[3];
      const address = account.address;
      const safeAddress = randomChecksumAddress();
      const signature = await getSignature(account, [address, safeAddress]);

      // Remove the user entry
      mockGraphUsers(address, safeAddress);
      await request(app)
        .delete(`/api/users/${safeAddress}`)
        .send({
          address: address,
          signature: signature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });
  });
});
