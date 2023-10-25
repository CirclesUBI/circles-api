import httpStatus from 'http-status';
import request from 'supertest';
import web3 from 'web3';
import accounts from './utils/accounts';
import { createTestUser } from './utils/createTestUser';
import { mockGraphUsers } from './utils/mocks';

import { randomChecksumAddress, getSignature } from './utils/common';

import app from '~';
import User from '~/models/users';

async function expectErrorStatus(body, status = httpStatus.BAD_REQUEST) {
  return await request(app)
    .put('/api/users')
    .send(body)
    .set('Accept', 'application/json')
    .expect(status);
}

async function expectErrorStatusInPost(body, status = httpStatus.BAD_REQUEST) {
  return await request(app)
    .post(`/api/users/${body.data.safeAddress}`)
    .send(body)
    .set('Accept', 'application/json')
    .expect(status);
}

async function expectErrorStatusInDelete(
  body,
  param,
  status = httpStatus.BAD_REQUEST,
) {
  return await request(app)
    .delete(`/api/users/${param.safeAddress}`)
    .send(body)
    .set('Accept', 'application/json')
    .expect(status);
}

async function expectErrorStatusGetEmail(
  body,
  param,
  status = httpStatus.BAD_REQUEST,
) {
  return await request(app)
    .post(`/api/users/${param.safeAddress}/email`)
    .send(body)
    .set('Accept', 'application/json')
    .expect(status);
}
describe('Users validation', () => {
  let payload;
  let address;
  let safeAddress;
  let nonce;
  let username;
  let email;
  let signature;
  let account = accounts[0];

  beforeEach(async () => {
    payload = await createTestUser({ account });
    address = account.address;
    safeAddress = payload.data.safeAddress;
    nonce = payload.nonce;
    username = payload.data.username;
    email = payload.data.email;

    signature = await getSignature(account, [
      address,
      nonce,
      safeAddress,
      username,
    ]);
  });
  afterEach(async () => {
    return await User.destroy({
      where: {
        username: payload.data.username,
      },
    });
  });

  describe('PUT /users - validation', () => {
    describe('when using invalid parameters', () => {
      it('should return errors', async () => {
        const correctBody = payload;

        // Missing fields
        await expectErrorStatus({
          ...correctBody,
          address: 'invalid',
        });

        // Missing signature
        await expectErrorStatus({
          ...correctBody,
          signature: '',
        });

        // Wrong address
        await expectErrorStatus({
          ...correctBody,
          address: web3.utils.randomHex(21),
        });

        // Wrong address checksum
        await expectErrorStatus({
          ...correctBody,
          address: web3.utils.randomHex(20),
        });

        // Invalid nonce
        await expectErrorStatus({
          ...correctBody,
          nonce: -1,
        });

        // Username too short
        await expectErrorStatus({
          ...correctBody,
          data: {
            ...correctBody.data,
            username: 'ab',
          },
        });

        // Invalid avatarUrl
        await expectErrorStatus({
          ...correctBody,
          avatarUrl: 'www.wrong.pizza',
        });
      });
    });

    describe('when using invalid signatures', () => {
      it('should return errors', async () => {
        // Wrong address
        await expectErrorStatus(
          {
            address: randomChecksumAddress(),
            nonce,
            signature,
            data: {
              safeAddress,
              username,
              email,
            },
          },
          httpStatus.FORBIDDEN,
        );

        // Wrong username
        await expectErrorStatus(
          {
            address,
            nonce,
            signature,
            data: {
              safeAddress,
              username: 'zebra',
              email,
            },
          },
          httpStatus.FORBIDDEN,
        );

        // Wrong nonce
        await expectErrorStatus(
          {
            address,
            nonce: nonce + 1,
            signature,
            data: {
              safeAddress,
              username,
              email,
            },
          },
          httpStatus.FORBIDDEN,
        );
      });
    });
  });

  describe('POST /users/:safeAddress - validation', () => {
    describe('when using invalid parameters', () => {
      it('should return errors', async () => {
        const correctBody = payload;

        mockGraphUsers(address, safeAddress);
        // Missing fields
        await expectErrorStatusInPost({
          ...correctBody,
          address: 'invalid',
        });

        // Missing signature
        await expectErrorStatusInPost({
          ...correctBody,
          signature: '',
        });

        // Wrong address
        await expectErrorStatusInPost({
          ...correctBody,
          address: web3.utils.randomHex(21),
        });

        // Wrong address checksum
        await expectErrorStatusInPost({
          ...correctBody,
          address: web3.utils.randomHex(20),
        });

        // Username too short
        await expectErrorStatusInPost({
          ...correctBody,
          data: {
            ...correctBody.data,
            username: 'ab',
          },
        });

        // Invalid avatarUrl
        await expectErrorStatusInPost({
          ...correctBody,
          data: {
            ...correctBody.data,
            avatarUrl: 'www.wrong.pizza',
          },
        });

        // Invalid email
        await expectErrorStatusInPost({
          ...correctBody,
          data: {
            ...correctBody.data,
            email: 'hola@',
          },
        });

        // Empty email
        await expectErrorStatusInPost({
          ...correctBody,
          data: {
            ...correctBody.data,
            email: '',
          },
        });
      });
    });

    describe('when using invalid signatures', () => {
      it('should return errors', async () => {
        // Wrong address
        await expectErrorStatusInPost(
          {
            address: randomChecksumAddress(),
            signature,
            data: {
              safeAddress,
              username,
              email,
            },
          },
          httpStatus.FORBIDDEN,
        );

        // Wrong username
        await expectErrorStatusInPost(
          {
            address,
            signature,
            data: {
              safeAddress,
              username: 'zebra',
              email,
            },
          },
          httpStatus.FORBIDDEN,
        );
      });
    });

    it('when missing email should fail', async () => {
      mockGraphUsers(address, safeAddress);
      await expectErrorStatusInPost({
        address,
        signature,
        data: {
          safeAddress,
          username,
        },
      });
    });
  });

  describe('GET /users - validation', () => {
    it('should fail when no or empty array was given', async () => {
      await request(app).get('/api/users').expect(httpStatus.BAD_REQUEST);

      await request(app)
        .get('/api/users?username')
        .expect(httpStatus.BAD_REQUEST);

      await request(app)
        .get('/api/users?address[]')
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should fail when invalid values are given', async () => {
      await request(app)
        .get('/api/users?address[]=bubu')
        .expect(httpStatus.BAD_REQUEST);

      await request(app)
        .get('/api/users?username[]=__22as0-&username[]=panda')
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('POST /users - dry run create user validation', () => {
    it('should fail when username already exists', async () => {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      await request(app)
        .post('/api/users')
        .send({
          username: 'donkey',
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.CONFLICT);
    });

    it('should fail when values are invalid', async () => {
      await request(app)
        .post('/api/users')
        .send({
          username: 'lala lala lala',
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);

      await request(app)
        .post('/api/users')
        .send({
          email: 'test@',
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should fail when values are invalid', async () => {
      await request(app)
        .post('/api/users')
        .send({
          username: 'lala lala lala',
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);

      await request(app)
        .post('/api/users')
        .send({
          email: 'test@',
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return OK when values are alright', async () => {
      await request(app)
        .post('/api/users')
        .send({
          username: 'lalazebra',
          email: 'lalazebra@zoo.io',
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
    });
  });

  describe('DELETE /users/:safeAddress - validation', () => {
    describe('when using invalid parameters', () => {
      it('should return errors', async () => {
        const correctBody = {
          address: address,
          signature: signature,
        };
        // Missing fields
        await expectErrorStatusInDelete(
          {
            ...correctBody,
            address: 'invalid',
          },
          { safeAddress: safeAddress },
        );

        // Missing signature
        await expectErrorStatusInDelete(
          {
            ...correctBody,
            signature: '',
          },
          { safeAddress: safeAddress },
        );

        // Wrong address
        await expectErrorStatusInDelete(
          {
            ...correctBody,
            address: web3.utils.randomHex(21),
          },
          { safeAddress: safeAddress },
        );

        // Wrong address checksum
        await expectErrorStatusInDelete(
          {
            ...correctBody,
            address: web3.utils.randomHex(20),
          },
          { safeAddress: safeAddress },
        );
      });
    });

    describe('when using invalid signatures', () => {
      it('should return errors', async () => {
        // Wrong address
        await expectErrorStatusInDelete(
          {
            address: randomChecksumAddress(),
            signature,
          },
          { safeAddress: safeAddress },
          httpStatus.FORBIDDEN,
        );
      });
    });
  });

  describe('POST /users/:safeAddress/email - validation', () => {
    describe('when using invalid parameters', () => {
      it('should return errors', async () => {
        const correctBody = payload;
        // Missing fields
        await expectErrorStatusGetEmail(
          {
            ...correctBody,
            address: 'invalid',
          },
          { safeAddress: safeAddress },
        );

        // Missing signature
        await expectErrorStatusGetEmail(
          {
            ...correctBody,
            signature: '',
          },
          { safeAddress: safeAddress },
        );

        // Wrong address
        await expectErrorStatusGetEmail(
          {
            ...correctBody,
            address: web3.utils.randomHex(21),
          },
          { safeAddress: safeAddress },
        );

        // Wrong address checksum
        await expectErrorStatusGetEmail(
          {
            ...correctBody,
            address: web3.utils.randomHex(20),
          },
          { safeAddress: safeAddress },
        );
      });
    });

    describe('when using invalid signatures', () => {
      it('should return errors', async () => {
        // Wrong address
        await expectErrorStatusGetEmail(
          {
            address: randomChecksumAddress(),
            signature,
          },
          { safeAddress: safeAddress },
          httpStatus.FORBIDDEN,
        );
      });
    });
  });
});
