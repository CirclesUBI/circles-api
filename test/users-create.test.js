import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';
import { mockRelayerSafe } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

import User from '~/models/users';
import app from '~';

describe('PUT /users - Creating a new user', () => {
  let address;
  let nonce;
  let privateKey;
  let safeAddress;
  let signature;
  let username;
  let email;
  let avatarUrl;

  let payload;

  beforeEach(() => {
    const account = web3.eth.accounts.create();
    address = account.address;
    privateKey = account.privateKey;

    safeAddress = randomChecksumAddress();
    nonce = new Date().getTime();
    username = 'donkey';
    email = 'dk@kong.com';
    avatarUrl = 'https://storage.com/image.jpg';

    signature = getSignature(address, nonce, safeAddress, username, privateKey);

    payload = {
      address,
      nonce,
      signature,
      data: {
        safeAddress,
        username,
        email,
        avatarUrl,
      },
    };

    mockRelayerSafe({
      address,
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

  it('should fail if avatarUrl is invalid', async () => {
    await request(app)
      .put('/api/users')
      .send({
        ...payload,
        avatarUrl: 'http://lala',
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
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
