import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';
import { createUserPayload } from './utils/users';
import { mockRelayerSafe, mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

function prepareUser({ username = 'azalea' } = {}, returnPrivateKey = false) {
  const safeAddress = randomChecksumAddress();
  const nonce = new Date().getTime();
  const email = 'azalea@flower.com';
  const avatarUrl = 'https://storage.com/image-flower.jpg';

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

describe('USER - Getting and updating the user profile migration consent', () => {
  let payload;
  let privateKey;

  beforeEach(() => {
    const response = prepareUser({ username: 'iris' }, true);
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

  describe('POST /users/:safeAddress/get-profile-migration-consent - Getting the user profile migration consent', () => {
    it('should get false value by default', async () => {
      // Create a user
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      // Get the profile migration consent
      mockGraphUsers(payload.address, payload.data.safeAddress);
      const signature = getSignature(
        [payload.address, payload.data.safeAddress],
        privateKey,
      );
      await request(app)
        .post(
          `/api/users/${payload.data.safeAddress}/get-profile-migration-consent`,
        )
        .send({
          address: payload.address,
          signature: signature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK)
        .expect(({ body }) => {
          if (body.data.profileMigrationConsent !== false) {
            throw new Error('Wrong value returned');
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

      // Get the profile migration consent
      mockGraphUsers(address, safeAddress);
      await request(app)
        .post(`/api/users/${safeAddress}/get-profile-migration-consent`)
        .send({
          address: address,
          signature: signature,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.NOT_FOUND);
    });
  });
  describe('POST /users/:safeAddress/update-profile-migration-consent - Updating the user profile migration consent', () => {
    const newProfileMigrationConsent = true;

    it('when user was already created should successfully respond and return the correct value when I update the field', async () => {
      await request(app)
        .put('/api/users')
        .send(payload)
        .set('Accept', 'application/json')
        .expect(httpStatus.CREATED);

      const signature = getSignature(
        [payload.address, payload.data.safeAddress, newProfileMigrationConsent],
        privateKey,
      );
      // Update payload values
      payload.signature = signature;
      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .post(
          `/api/users/${payload.data.safeAddress}/update-profile-migration-consent`,
        )
        .send({
          address: payload.address,
          signature: payload.signature,
          data: {
            safeAddress: payload.data.safeAddress,
            profileMigrationConsent: newProfileMigrationConsent,
          },
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK);
      const signature2 = getSignature(
        [payload.address, payload.data.safeAddress],
        privateKey,
      );
      mockGraphUsers(payload.address, payload.data.safeAddress);
      await request(app)
        .post(
          `/api/users/${payload.data.safeAddress}/get-profile-migration-consent`,
        )
        .send({
          address: payload.address,
          signature: signature2,
        })
        .set('Accept', 'application/json')
        .expect(httpStatus.OK)
        .expect(({ body }) => {
          if (
            body.data.profileMigrationConsent !== newProfileMigrationConsent
          ) {
            throw new Error('Wrong value returned');
          }
        });
    });
    describe('when user was not registered', () => {
      it('should fail', async () => {
        const signature = getSignature(
          [
            payload.address,
            payload.data.safeAddress,
            newProfileMigrationConsent,
          ],
          privateKey,
        );
        // Update payload values
        payload.signature = signature;

        mockGraphUsers(payload.address, payload.data.safeAddress);
        await request(app)
          .post(
            `/api/users/${payload.data.safeAddress}/update-profile-migration-consent`,
          )
          .send({
            address: payload.address,
            signature: payload.signature,
            data: {
              safeAddress: payload.data.safeAddress,
              profileMigrationConsent: newProfileMigrationConsent,
            },
          })
          .set('Accept', 'application/json')
          .expect(httpStatus.OK);
        const signature2 = getSignature(
          [payload.address, payload.data.safeAddress],
          privateKey,
        );
        mockGraphUsers(payload.address, payload.data.safeAddress);
        await request(app)
          .post(
            `/api/users/${payload.data.safeAddress}/get-profile-migration-consent`,
          )
          .send({
            address: payload.address,
            signature: signature2,
          })
          .set('Accept', 'application/json')
          .expect(httpStatus.NOT_FOUND)
      });
    });
  });
});
