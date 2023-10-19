import { createUserPayload } from './users';

export async function createTestUser({
  core,
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
