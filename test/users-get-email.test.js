import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';
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

describe('GET /users/:safeAddress/email - Getting the user email', () => {
  let payload;
  let privateKey;

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
