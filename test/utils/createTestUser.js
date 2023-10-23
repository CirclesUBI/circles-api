import { createUserPayload } from './users';
import core from './core';

export async function createTestUser({
  account,
  username = 'donkey',
  email = 'dk@kong.com',
  avatarUrl = 'https://storage.com/image.jpg',
  returnPrivateKey = false,
}) {
  const nonce = new Date().getTime();
  const safeAddress = await core.safe.predictAddress(account, { nonce });
  const userPayload = createUserPayload(
    {
      nonce,
      safeAddress,
      username,
      email,
      avatarUrl,
      account,
    },
    returnPrivateKey,
  );
  return userPayload;
}
