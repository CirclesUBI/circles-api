import { getSignature } from './common';

export async function createUserPayload(
  { nonce, safeAddress, username, email, avatarUrl, account = {} },
  returnPrivateKey = false,
) {
  const address = account.address;
  const privateKey = account.privateKey;
  const signature = await getSignature(account, [
    address,
    nonce,
    safeAddress,
    username,
  ]);

  if (returnPrivateKey) {
    const payload = {
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
    return { payload, privateKey };
  } else {
    return {
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
  }
}
