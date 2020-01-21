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

  let payload;

  beforeEach(() => {
    const account = web3.eth.accounts.create();
    address = account.address;
    privateKey = account.privateKey;

    safeAddress = randomChecksumAddress();
    nonce = new Date().getTime();
    username = 'donkey';
    email = 'dk@kong.com';

    signature = getSignature(address, nonce, safeAddress, username, privateKey);

    payload = {
      address,
      nonce,
      signature,
      data: {
        safeAddress,
        username,
        email,
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
