import httpStatus from 'http-status';
import request from 'supertest';

import web3 from './utils/web3';
import { createUserPayload } from './utils/users';
import { mockRelayerSafe, mockGraphUsers } from './utils/mocks';
import { randomChecksumAddress, getSignature } from './utils/common';

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

describe('DELETE /users/:safeAddress - Delete the user entry (idempotent)', () => {
  let payload;
  let privateKey;

  beforeEach(() => {
    const response = prepareUser({ username: 'doggy' }, true);
    payload = response.payload;
    privateKey = response.privateKey;
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
    const signature = getSignature(
      [payload.address, payload.data.safeAddress],
      privateKey,
    );
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
    const account = web3.eth.accounts.create();
    const address = account.address;
    const privateKey = account.privateKey;
    const safeAddress = randomChecksumAddress();
    const signature = getSignature([address, safeAddress], privateKey);

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
